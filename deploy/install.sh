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

APP_DIR="/var/www/app"
JWT_SECRET="$(openssl rand -hex 32)"

echo
say "Récapitulatif"
echo "   Dépôt     : $REPO_URL"
echo "   Domaine   : https://$DOMAIN"
echo "   Admin     : $ADMIN_EMAIL"
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
./venv/bin/pip install -q -r requirements.txt

cat > "$APP_DIR/backend/.env" <<EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=claude_leads
CORS_ORIGINS=https://${DOMAIN}
JWT_SECRET=${JWT_SECRET}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
FRONTEND_URL=https://${DOMAIN}
EOF

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
systemctl enable --now claude-backend
ok "Backend démarré (port interne 8001)"

# ----------------------------------------------------------------------------
# 5) Frontend
# ----------------------------------------------------------------------------
say "Construction du site (frontend React) — cela prend quelques minutes…"
cd "$APP_DIR/frontend"
cat > "$APP_DIR/frontend/.env" <<EOF
REACT_APP_BACKEND_URL=https://${DOMAIN}
EOF
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
cat > /etc/nginx/sites-available/claude <<EOF
server {
    listen 80;
    listen 443 ssl;
    server_name ${DOMAIN};

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
echo -e "${Y}Pour tout mettre à jour plus tard, relancez simplement cette même commande.${N}"
echo
