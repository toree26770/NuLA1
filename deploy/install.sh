#!/usr/bin/env bash
#
#  Installation automatique « tout-en-un » de l'application Claude Offre
#  sur un serveur VPS Ubuntu (22.04 ou 24.04) tout neuf.
#
#  UNE SEULE COMMANDE à lancer sur le serveur (voir deploy/README.md).
#  Le script pose 3 questions puis installe et démarre TOUT automatiquement :
#  Node, Python, MongoDB, Nginx, le backend, le frontend, le HTTPS (certificat).
#
set -euo pipefail

# ----------------------------------------------------------------------------
# Couleurs pour que ce soit lisible
# ----------------------------------------------------------------------------
B="\033[1m"; G="\033[32m"; Y="\033[33m"; C="\033[36m"; R="\033[31m"; N="\033[0m"
say()  { echo -e "${C}${B}➜ $*${N}"; }
ok()   { echo -e "${G}✔ $*${N}"; }
warn() { echo -e "${Y}⚠ $*${N}"; }
die()  { echo -e "${R}✘ $*${N}"; exit 1; }

[ "$(id -u)" = "0" ] || die "Lancez ce script en root (utilisateur administrateur)."

clear
echo -e "${B}========================================================${N}"
echo -e "${B}   Installation de l'application Claude Offre (VPS)      ${N}"
echo -e "${B}========================================================${N}"
echo
echo "Je vais vous poser 3 questions, puis tout s'installe tout seul."
echo

APP_DIR="/var/www/app"

# ============================================================================
# MODE MISE À JOUR : si l'application est déjà installée, on GARDE toute la
# configuration existante (domaines, identifiants, clés de session) et on met
# simplement à jour le code. Plus besoin de retaper quoi que ce soit.
# ============================================================================
if [ -f "$APP_DIR/backend/.env" ] && [ -d "$APP_DIR/.git" ]; then
  echo -e "${B}➜ Installation existante détectée sur ce serveur.${N}"
  read -rp "$(echo -e "Mise à jour rapide en gardant votre configuration actuelle ? (O/n) ")" UPD
  if [[ ! "${UPD,,}" =~ ^(n|non|no)$ ]]; then
    set_env() {
      python3 - "$3" "$1" "$2" <<'PY'
import sys
f, k, v = sys.argv[1], sys.argv[2], sys.argv[3]
lines = open(f).read().splitlines()
out, done = [], False
for l in lines:
    if l.startswith(k + "="):
        out.append(k + "=" + v); done = True
    else:
        out.append(l)
if not done:
    out.append(k + "=" + v)
open(f, "w").write("\n".join(out) + "\n")
PY
    }

    echo
    echo -e "${B}Réinitialiser un mot de passe admin ? (facultatif)${N}"
    echo "Laissez VIDE et appuyez simplement sur Entrée pour ne rien changer."
    read -rp "   Nouveau mot de passe admin principal     : " NEW_MAIN_PWD
    read -rp "   Nouveau mot de passe admin Défense        : " NEW_DEF_PWD
    read -rp "   Nouveau mot de passe admin Super Livret   : " NEW_LIV_PWD
    if [ -n "${NEW_MAIN_PWD:-}" ]; then set_env ADMIN_PASSWORD "$NEW_MAIN_PWD" "$APP_DIR/backend/.env"; echo "   ✔ mot de passe admin principal mis à jour"; fi
    if [ -n "${NEW_DEF_PWD:-}" ];  then set_env DEFENSE_ADMIN_PASSWORD "$NEW_DEF_PWD" "$APP_DIR/backend/.env"; echo "   ✔ mot de passe admin Défense mis à jour"; fi
    if [ -n "${NEW_LIV_PWD:-}" ];  then set_env LIVRET_ADMIN_PASSWORD "$NEW_LIV_PWD" "$APP_DIR/backend/.env"; echo "   ✔ mot de passe admin Super Livret mis à jour"; fi

    say "Récupération du nouveau code (git pull)…"
    git -C "$APP_DIR" pull --ff-only || die "git pull a échoué. Avez-vous bien fait « Save to GitHub » ?"

    say "Mise à jour du backend…"
    cd "$APP_DIR/backend"
    [ -d venv ] || python3 -m venv venv
    ./venv/bin/pip install --upgrade pip -q
    grep -viE '^(emergentintegrations|litellm)([=<> @]|$)' requirements.txt \
      | grep -v 'customer-assets.emergentagent.com' > /tmp/requirements.vps.txt
    ./venv/bin/pip install -q -r /tmp/requirements.vps.txt

    say "Reconstruction du site (frontend) — quelques minutes…"
    cd "$APP_DIR/frontend"
    yarn install --silent
    yarn build

    say "Redémarrage des services…"
    systemctl restart claude-backend
    systemctl restart nginx

    echo
    ok "Mise à jour terminée ! Votre configuration a été conservée."
    if [ -n "${NEW_MAIN_PWD:-}${NEW_DEF_PWD:-}${NEW_LIV_PWD:-}" ]; then
      echo -e "${Y}Les mots de passe réinitialisés sont actifs dès maintenant.${N}"
    fi
    echo
    exit 0
  fi
  echo -e "${Y}Ré-installation complète : vous allez être reguidé pour la configuration.${N}"
  echo
fi

# ----------------------------------------------------------------------------
# 1) Questions
# ----------------------------------------------------------------------------
read -rp "$(echo -e "${B}1/3${N}) Adresse de votre dépôt GitHub (ex: https://github.com/moi/claude-leads.git) : ")" REPO_URL
[ -n "$REPO_URL" ] || die "L'adresse GitHub est obligatoire."

read -rp "$(echo -e "${B}2/3${N}) Votre sous-domaine (ex: app.mondomaine.com) : ")" DOMAIN
[ -n "$DOMAIN" ] || die "Le sous-domaine est obligatoire."

read -rp "$(echo -e "${B}3/3${N}) E-mail de connexion admin [admin@${DOMAIN}] : ")" ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@${DOMAIN}}

read -rp "$(echo -e "     Mot de passe admin (laisser vide = généré automatiquement) : ")" ADMIN_PASSWORD
if [ -z "${ADMIN_PASSWORD:-}" ]; then
  ADMIN_PASSWORD="$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-14)Aa1!"
  GEN_PWD=1
fi

echo
echo -e "${B}Deuxième site « Livret Défense » (optionnel)${N}"
echo "Laissez vide si vous ne voulez PAS activer le second site."
read -rp "$(echo -e "     Sous-domaine Défense (ex: militaire.axinvest.app) : ")" DEFENSE_DOMAIN
if [ -n "${DEFENSE_DOMAIN:-}" ]; then
  read -rp "$(echo -e "     E-mail admin Défense [admin@${DEFENSE_DOMAIN}] : ")" DEFENSE_ADMIN_EMAIL
  DEFENSE_ADMIN_EMAIL=${DEFENSE_ADMIN_EMAIL:-admin@${DEFENSE_DOMAIN}}
  read -rp "$(echo -e "     Mot de passe admin Défense (laisser vide = généré automatiquement) : ")" DEFENSE_ADMIN_PASSWORD
  if [ -z "${DEFENSE_ADMIN_PASSWORD:-}" ]; then
    DEFENSE_ADMIN_PASSWORD="$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-14)Aa1!"
    GEN_DEF_PWD=1
  fi
fi

echo
echo -e "${B}Troisième site « Super Livret — Compte rémunéré » (optionnel)${N}"
echo "Laissez vide si vous ne voulez PAS activer le troisième site."
read -rp "$(echo -e "     Sous-domaine Super Livret (ex: livret.axinvest.app) : ")" LIVRET_DOMAIN
if [ -n "${LIVRET_DOMAIN:-}" ]; then
  read -rp "$(echo -e "     E-mail admin Super Livret [admin@${LIVRET_DOMAIN}] : ")" LIVRET_ADMIN_EMAIL
  LIVRET_ADMIN_EMAIL=${LIVRET_ADMIN_EMAIL:-admin@${LIVRET_DOMAIN}}
  read -rp "$(echo -e "     Mot de passe admin Super Livret (laisser vide = généré automatiquement) : ")" LIVRET_ADMIN_PASSWORD
  if [ -z "${LIVRET_ADMIN_PASSWORD:-}" ]; then
    LIVRET_ADMIN_PASSWORD="$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-14)Aa1!"
    GEN_LIV_PWD=1
  fi
fi

APP_DIR="/var/www/app"
JWT_SECRET="$(openssl rand -hex 32)"

echo
say "Récapitulatif"
echo "   Dépôt     : $REPO_URL"
echo "   Domaine   : https://$DOMAIN"
echo "   Admin     : $ADMIN_EMAIL"
if [ -n "${DEFENSE_DOMAIN:-}" ]; then
  echo "   Défense   : https://$DEFENSE_DOMAIN"
  echo "   Admin Déf.: $DEFENSE_ADMIN_EMAIL"
fi
if [ -n "${LIVRET_DOMAIN:-}" ]; then
  echo "   Livret    : https://$LIVRET_DOMAIN"
  echo "   Admin Liv.: $LIVRET_ADMIN_EMAIL"
fi
echo
read -rp "$(echo -e "${B}Tout est bon ? On lance l'installation ? (o/n) ${N}")" GO
case "${GO,,}" in o|oui|y|yes) ;; *) die "Installation annulée." ;; esac

# ----------------------------------------------------------------------------
# 2) Paquets système
# ----------------------------------------------------------------------------
say "Mise à jour du serveur (peut prendre 1-2 min)…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y -qq
apt-get upgrade -y -qq
apt-get install -y -qq git curl wget gnupg ca-certificates openssl ufw lsb-release

say "Installation de Node.js 20 + Yarn…"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs
fi
command -v yarn >/dev/null 2>&1 || npm install -g yarn >/dev/null 2>&1
ok "Node $(node -v) / Yarn $(yarn -v)"

say "Installation de Python…"
apt-get install -y -qq python3 python3-venv python3-pip
ok "Python $(python3 --version)"

say "Installation de MongoDB…"
if ! command -v mongod >/dev/null 2>&1; then
  . /etc/os-release
  CODENAME="${VERSION_CODENAME:-jammy}"
  # MongoDB 8.0 supporte jammy (22.04) et noble (24.04)
  case "$CODENAME" in noble|jammy) ;; *) CODENAME="jammy" ;; esac
  curl -fsSL https://pgp.mongodb.com/server-8.0.asc | gpg -o /usr/share/keyrings/mongodb-8.0.gpg --dearmor
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${CODENAME}/mongodb-org/8.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-8.0.list
  apt-get update -y -qq
  apt-get install -y -qq mongodb-org
fi
systemctl enable --now mongod
ok "MongoDB en service"

say "Installation de Nginx…"
apt-get install -y -qq nginx
ok "Nginx installé"

# ----------------------------------------------------------------------------
# 3) Récupération du code
# ----------------------------------------------------------------------------
say "Téléchargement de votre application…"
mkdir -p /var/www
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  rm -rf "$APP_DIR"
  git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi
ok "Code récupéré dans $APP_DIR"

# ----------------------------------------------------------------------------
# 4) Backend
# ----------------------------------------------------------------------------
say "Configuration du backend (Python / FastAPI)…"
cd "$APP_DIR/backend"
python3 -m venv venv
./venv/bin/pip install --upgrade pip -q
# Certaines librairies internes à Emergent ne s'installent pas sur un VPS externe
# et ne sont pas utilisées par l'application : on les retire de la liste.
grep -viE '^(emergentintegrations|litellm)([=<> @]|$)' requirements.txt \
  | grep -v 'customer-assets.emergentagent.com' > /tmp/requirements.vps.txt
./venv/bin/pip install -q -r /tmp/requirements.vps.txt

CORS_ORIGINS="https://${DOMAIN}"
[ -n "${DEFENSE_DOMAIN:-}" ] && CORS_ORIGINS="${CORS_ORIGINS},https://${DEFENSE_DOMAIN}"
[ -n "${LIVRET_DOMAIN:-}" ] && CORS_ORIGINS="${CORS_ORIGINS},https://${LIVRET_DOMAIN}"

cat > "$APP_DIR/backend/.env" <<EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=claude_leads
CORS_ORIGINS=${CORS_ORIGINS}
JWT_SECRET=${JWT_SECRET}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
FRONTEND_URL=https://${DOMAIN}
EOF

if [ -n "${DEFENSE_DOMAIN:-}" ]; then
  cat >> "$APP_DIR/backend/.env" <<EOF
DEFENSE_ADMIN_EMAIL=${DEFENSE_ADMIN_EMAIL}
DEFENSE_ADMIN_PASSWORD=${DEFENSE_ADMIN_PASSWORD}
EOF
fi

if [ -n "${LIVRET_DOMAIN:-}" ]; then
  cat >> "$APP_DIR/backend/.env" <<EOF
LIVRET_ADMIN_EMAIL=${LIVRET_ADMIN_EMAIL}
LIVRET_ADMIN_PASSWORD=${LIVRET_ADMIN_PASSWORD}
EOF
fi

cat > /etc/systemd/system/claude-backend.service <<EOF
[Unit]
Description=Claude Offre Backend (FastAPI)
After=network.target mongod.service

[Service]
WorkingDirectory=${APP_DIR}/backend
ExecStart=${APP_DIR}/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable claude-backend >/dev/null 2>&1 || true
systemctl restart claude-backend
ok "Backend démarré (port interne 8001)"

# ----------------------------------------------------------------------------
# 5) Frontend
# ----------------------------------------------------------------------------
say "Construction du site (frontend React) — cela prend quelques minutes…"
cd "$APP_DIR/frontend"
cat > "$APP_DIR/frontend/.env" <<EOF
REACT_APP_BACKEND_URL=https://${DOMAIN}
EOF
if [ -n "${DEFENSE_DOMAIN:-}" ]; then
  echo "REACT_APP_DEFENSE_HOST=${DEFENSE_DOMAIN}" >> "$APP_DIR/frontend/.env"
fi
if [ -n "${LIVRET_DOMAIN:-}" ]; then
  echo "REACT_APP_LIVRET_HOST=${LIVRET_DOMAIN}" >> "$APP_DIR/frontend/.env"
fi
yarn install --silent
yarn build
ok "Site construit"

# ----------------------------------------------------------------------------
# 6) Certificat HTTPS auto-signé (pour Cloudflare « Full »)
# ----------------------------------------------------------------------------
say "Génération d'un certificat HTTPS pour le serveur…"
mkdir -p /etc/ssl/claude
openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
  -keyout /etc/ssl/claude/key.pem \
  -out /etc/ssl/claude/cert.pem \
  -subj "/CN=${DOMAIN}" >/dev/null 2>&1
ok "Certificat généré"

# ----------------------------------------------------------------------------
# 7) Nginx (écoute 80 ET 443 : fonctionne avec Cloudflare Flexible OU Full)
# ----------------------------------------------------------------------------
say "Configuration de Nginx…"
SERVER_NAMES="${DOMAIN}"
[ -n "${DEFENSE_DOMAIN:-}" ] && SERVER_NAMES="${SERVER_NAMES} ${DEFENSE_DOMAIN}"
[ -n "${LIVRET_DOMAIN:-}" ] && SERVER_NAMES="${SERVER_NAMES} ${LIVRET_DOMAIN}"
cat > /etc/nginx/sites-available/claude <<EOF
server {
    listen 80;
    listen 443 ssl;
    server_name ${SERVER_NAMES};

    ssl_certificate     /etc/ssl/claude/cert.pem;
    ssl_certificate_key /etc/ssl/claude/key.pem;

    root ${APP_DIR}/frontend/build;
    index index.html;

    client_max_body_size 25m;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/claude /etc/nginx/sites-enabled/claude
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
ok "Nginx configuré"

# ----------------------------------------------------------------------------
# 8) Pare-feu
# ----------------------------------------------------------------------------
say "Activation du pare-feu…"
ufw allow OpenSSH   >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
ufw --force enable  >/dev/null 2>&1 || true
ok "Pare-feu actif"

# ----------------------------------------------------------------------------
# 9) Fin
# ----------------------------------------------------------------------------
SERVER_IP="$(curl -s https://api.ipify.org || echo 'VOTRE_IP')"
echo
echo -e "${G}${B}========================================================${N}"
echo -e "${G}${B}   ✅  INSTALLATION TERMINÉE !                           ${N}"
echo -e "${G}${B}========================================================${N}"
echo
echo -e "${B}Il reste UNE chose à faire côté Cloudflare (DNS) :${N}"
echo
echo -e "  1. Sur Cloudflare → votre domaine → onglet ${B}DNS${N} → ${B}Add record${N} :"
echo -e "       Type    : ${B}A${N}"
echo -e "       Name    : ${B}${DOMAIN%%.*}${N}   (la partie avant votre domaine)"
echo -e "       Content : ${B}${SERVER_IP}${N}   (l'IP de ce serveur)"
echo -e "       Proxy   : ${B}Proxied (nuage orange 🟠)${N}"
echo
echo -e "  2. Cloudflare → onglet ${B}SSL/TLS${N} → mode ${B}Full${N}."
echo
if [ -n "${DEFENSE_DOMAIN:-}" ]; then
  echo -e "${B}Pour le second site « Livret Défense » : AJOUTEZ un 2ᵉ enregistrement DNS${N}"
  echo -e "  Sur Cloudflare → ${B}Add record${N} :"
  echo -e "       Type    : ${B}A${N}"
  echo -e "       Name    : ${B}${DEFENSE_DOMAIN%%.*}${N}   (le début de ${DEFENSE_DOMAIN})"
  echo -e "       Content : ${B}${SERVER_IP}${N}   (la MÊME IP de ce serveur)"
  echo -e "       Proxy   : ${B}Proxied (nuage orange 🟠)${N}"
  echo
fi
if [ -n "${LIVRET_DOMAIN:-}" ]; then
  echo -e "${B}Pour le troisième site « Super Livret » : AJOUTEZ un enregistrement DNS${N}"
  echo -e "  Sur Cloudflare → ${B}Add record${N} :"
  echo -e "       Type    : ${B}A${N}"
  echo -e "       Name    : ${B}${LIVRET_DOMAIN%%.*}${N}   (le début de ${LIVRET_DOMAIN})"
  echo -e "       Content : ${B}${SERVER_IP}${N}   (la MÊME IP de ce serveur)"
  echo -e "       Proxy   : ${B}Proxied (nuage orange 🟠)${N}"
  echo
fi
echo -e "${B}Ensuite, ouvrez :${N} ${C}https://${DOMAIN}${N}"
echo -e "${B}Administration :${N}  ${C}https://${DOMAIN}/admin${N}"
echo
echo -e "${B}Vos identifiants admin :${N}"
echo -e "   E-mail        : ${B}${ADMIN_EMAIL}${N}"
if [ "${GEN_PWD:-0}" = "1" ]; then
  echo -e "   Mot de passe  : ${B}${ADMIN_PASSWORD}${N}   ${Y}(notez-le !)${N}"
else
  echo -e "   Mot de passe  : ${B}(celui que vous avez choisi)${N}"
fi
echo
if [ -n "${DEFENSE_DOMAIN:-}" ]; then
  echo -e "${B}Site Défense :${N}   ${C}https://${DEFENSE_DOMAIN}${N}"
  echo -e "${B}Admin Défense :${N}  ${C}https://${DEFENSE_DOMAIN}/admin${N}"
  echo -e "   E-mail        : ${B}${DEFENSE_ADMIN_EMAIL}${N}"
  if [ "${GEN_DEF_PWD:-0}" = "1" ]; then
    echo -e "   Mot de passe  : ${B}${DEFENSE_ADMIN_PASSWORD}${N}   ${Y}(notez-le !)${N}"
  else
    echo -e "   Mot de passe  : ${B}(celui que vous avez choisi)${N}"
  fi
  echo
fi
if [ -n "${LIVRET_DOMAIN:-}" ]; then
  echo -e "${B}Site Super Livret :${N}   ${C}https://${LIVRET_DOMAIN}${N}"
  echo -e "${B}Admin Super Livret :${N}  ${C}https://${LIVRET_DOMAIN}/admin${N}"
  echo -e "   E-mail        : ${B}${LIVRET_ADMIN_EMAIL}${N}"
  if [ "${GEN_LIV_PWD:-0}" = "1" ]; then
    echo -e "   Mot de passe  : ${B}${LIVRET_ADMIN_PASSWORD}${N}   ${Y}(notez-le !)${N}"
  else
    echo -e "   Mot de passe  : ${B}(celui que vous avez choisi)${N}"
  fi
  echo
fi
echo -e "${Y}Pour tout mettre à jour plus tard, relancez simplement cette même commande.${N}"
echo
