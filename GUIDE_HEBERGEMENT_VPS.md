# 🚀 Guide ultra-détaillé : héberger votre application sur un VPS Njalla + Cloudflare

> Ce guide est écrit pour un **grand débutant**. Vous n'avez besoin d'aucune connaissance technique.
> Il suffit de **copier-coller** les commandes, les unes après les autres, dans l'ordre.
> Chaque bloc gris est une commande à coller. Appuyez sur **Entrée** après chaque bloc.

---

## 🧩 Ce que fait votre application (pour comprendre)

Votre app est composée de 3 morceaux :
1. **Le site web (frontend)** — ce que voient vos visiteurs (React).
2. **Le serveur (backend)** — le cerveau qui enregistre les leads (FastAPI / Python).
3. **La base de données (MongoDB)** — là où sont stockés les leads.

Le VPS (= un ordinateur loué chez Njalla, allumé 24h/24) va faire tourner ces 3 morceaux.
Cloudflare va fournir le **cadenas de sécurité (HTTPS)** et protéger votre site.

---

## ⚠️ IMPORTANT — Lisez ceci avant de commencer

> **La façon la PLUS SIMPLE et la plus rapide d'héberger votre app est le bouton « Deploy » d'Emergent** (en haut de l'écran). En 1 clic, tout est mis en ligne, avec HTTPS automatique, sans serveur à gérer. Vous pouvez même y brancher votre nom de domaine Njalla.
>
> **Le VPS (ce guide) demande plus de travail et de maintenance.** Choisissez cette voie seulement si vous voulez vraiment gérer votre propre serveur.

Si vous continuez avec le VPS, suivez tout le guide ci-dessous. Comptez **45 à 60 minutes** la première fois.

---

## ✅ Ce qu'il vous faut avant de commencer

- [ ] Un compte **Njalla** (https://njal.la) avec un peu de crédit
- [ ] Un compte **Cloudflare** gratuit (https://cloudflare.com)
- [ ] Votre code sur **GitHub** (voir Étape 0 ci-dessous)
- [ ] Un ordinateur avec internet

---

# 🟦 ÉTAPE 0 — Mettre votre code sur GitHub

1. Dans Emergent, cliquez sur le bouton **« Save to GitHub »** (dans la barre de chat).
2. Suivez les instructions, choisissez un nom de dépôt (ex: `claude-leads`).
3. Notez l'adresse de votre dépôt, elle ressemble à :
   `https://github.com/VOTRE-NOM/claude-leads`

> On en aura besoin à l'Étape 5 pour télécharger le code sur le VPS.

---

# 🟦 ÉTAPE 1 — Acheter un VPS chez Njalla

1. Allez sur **https://njal.la** → connectez-vous.
2. Menu **« Servers »** → **« Add server »**.
3. Choisissez :
   - **OS (système)** : **Ubuntu 24.04** (très important, tout ce guide est basé dessus)
   - **Taille** : la plus petite avec **au moins 2 Go de RAM** suffit pour démarrer.
4. Validez et payez.
5. Njalla vous donne une **adresse IP** (ex: `203.0.113.45`) et un **mot de passe root**.
   📝 **Notez ces 2 informations**, on va en avoir besoin tout de suite.

---

# 🟦 ÉTAPE 2 — Acheter votre nom de domaine chez Njalla

1. Menu **« Domains »** → cherchez le domaine voulu (ex: `monoffreclaude.com`).
2. Achetez-le.
3. On configurera les DNS **plus tard** (Étape 9), une fois Cloudflare prêt. Laissez-le tel quel pour l'instant.

---

# 🟦 ÉTAPE 3 — Se connecter à votre VPS (SSH)

« SSH » = une fenêtre pour commander votre serveur à distance.

### 🪟 Si vous êtes sur Windows
1. Ouvrez l'application **« Terminal »** ou **« PowerShell »** (cherchez-la dans le menu Démarrer).

### 🍎 Si vous êtes sur Mac
1. Ouvrez l'application **« Terminal »** (dans Applications → Utilitaires).

### Puis, pour tout le monde :
Tapez ceci (remplacez `VOTRE_IP` par l'adresse IP notée à l'Étape 1) :

```bash
ssh root@VOTRE_IP
```

- Il va demander « Are you sure... ? » → tapez **yes** et Entrée.
- Il demande le mot de passe → collez le mot de passe root de Njalla (⚠️ rien ne s'affiche quand vous tapez le mot de passe, c'est normal) → Entrée.

✅ Vous êtes connecté quand la ligne commence par `root@...`.

---

# 🟦 ÉTAPE 4 — Préparer le serveur (installer les outils)

Copiez-collez ces blocs **un par un**. Attendez que chacun se termine avant le suivant.

### 4.1 — Mettre le serveur à jour
```bash
apt update && apt upgrade -y
```

### 4.2 — Installer les outils de base
```bash
apt install -y git curl nginx ufw
```

### 4.3 — Installer Node.js (pour construire le site) et Yarn
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn
```

### 4.4 — Installer Python (pour le serveur backend)
```bash
apt install -y python3 python3-pip python3-venv
```

### 4.5 — Installer MongoDB (la base de données)
```bash
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl enable --now mongod
```

Vérifiez que MongoDB tourne :
```bash
systemctl status mongod --no-pager
```
✅ Vous devez voir le mot **active (running)** en vert. Appuyez sur **q** pour sortir.

---

# 🟦 ÉTAPE 5 — Télécharger votre application

Remplacez l'adresse par celle de votre dépôt GitHub (Étape 0) :

```bash
cd /var/www
git clone https://github.com/VOTRE-NOM/claude-leads.git app
cd app
```

> Si votre dépôt est **privé**, GitHub demandera votre nom + un « token ». Le plus simple : rendez le dépôt **public** le temps de l'installation, ou créez un token sur https://github.com/settings/tokens.

---

# 🟦 ÉTAPE 6 — Configurer le backend (le cerveau)

### 6.1 — Installer les librairies Python
```bash
cd /var/www/app/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 6.2 — Créer le fichier de configuration `.env` du backend
```bash
nano /var/www/app/backend/.env
```
Une fenêtre de texte s'ouvre. Collez ceci **exactement** :
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=claude_leads
CORS_ORIGINS=*
```
Puis sauvegardez : appuyez sur **Ctrl + O**, Entrée, puis **Ctrl + X** pour quitter.

> ⚠️ Si votre app utilise d'autres clés secrètes (clé JWT, clé LLM Emergent, etc.), ajoutez-les ici aussi, une par ligne, au format `NOM=valeur`.

### 6.3 — Démarrer le backend automatiquement (service systemd)
```bash
nano /etc/systemd/system/backend.service
```
Collez ceci :
```
[Unit]
Description=Backend FastAPI
After=network.target mongod.service

[Service]
WorkingDirectory=/var/www/app/backend
ExecStart=/var/www/app/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```
Sauvegardez (**Ctrl + O**, Entrée, **Ctrl + X**).

Activez-le :
```bash
systemctl daemon-reload
systemctl enable --now backend
systemctl status backend --no-pager
```
✅ Vous devez voir **active (running)**. (**q** pour sortir.)

> ℹ️ Si votre fichier principal ne s'appelle pas `server.py` ou que l'app n'est pas `app`, dites-le moi et je corrige la ligne `ExecStart`.

---

# 🟦 ÉTAPE 7 — Construire le site (frontend)

### 7.1 — Dire au site où est le backend
```bash
nano /var/www/app/frontend/.env
```
Collez ceci (remplacez par VOTRE domaine) :
```
REACT_APP_BACKEND_URL=https://monoffreclaude.com
```
Sauvegardez (**Ctrl + O**, Entrée, **Ctrl + X**).

### 7.2 — Construire le site
```bash
cd /var/www/app/frontend
yarn install
yarn build
```
⏳ Cette étape prend quelques minutes. À la fin, un dossier `build` est créé. ✅

---

# 🟦 ÉTAPE 8 — Configurer Nginx (le chef d'orchestre)

Nginx va :
- montrer le **site** aux visiteurs,
- rediriger les adresses qui commencent par **/api** vers le **backend**.

```bash
nano /etc/nginx/sites-available/app
```
Collez ceci (remplacez `monoffreclaude.com` par VOTRE domaine, **2 fois**) :
```
server {
    listen 80;
    server_name monoffreclaude.com www.monoffreclaude.com;

    # Le site (fichiers construits)
    root /var/www/app/frontend/build;
    index index.html;

    # Les appels API vont vers le backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Tout le reste = le site React
    location / {
        try_files $uri /index.html;
    }
}
```
Sauvegardez (**Ctrl + O**, Entrée, **Ctrl + X**).

Activez la configuration :
```bash
ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```
✅ `nginx -t` doit dire **syntax is ok** et **test is successful**.

### Ouvrir le pare-feu
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

---

# 🟦 ÉTAPE 9 — Cloudflare : sécurité + HTTPS (le cadenas 🔒)

### 9.1 — Ajouter votre domaine à Cloudflare
1. Créez un compte gratuit sur **https://cloudflare.com**.
2. Cliquez **« Add a site »** → tapez votre domaine (`monoffreclaude.com`) → plan **Free**.
3. Cloudflare vous donne **2 adresses de serveurs de noms** (nameservers), ex :
   `dana.ns.cloudflare.com` et `rob.ns.cloudflare.com`
   📝 **Notez-les.**

### 9.2 — Dire à Njalla d'utiliser Cloudflare
1. Retournez sur **Njalla** → **Domains** → votre domaine → **DNS / Nameservers**.
2. Remplacez les nameservers Njalla par les **2 nameservers de Cloudflare**.
3. Sauvegardez. (⏳ Peut prendre de 10 min à quelques heures pour s'activer.)

### 9.3 — Créer les enregistrements DNS dans Cloudflare
Dans Cloudflare → votre domaine → onglet **DNS** → **Add record**. Créez 2 lignes :

| Type | Name | Content (= votre IP VPS) | Proxy status |
|------|------|--------------------------|--------------|
| A    | `@`  | `203.0.113.45`           | 🟠 Proxied (nuage orange) |
| A    | `www`| `203.0.113.45`           | 🟠 Proxied (nuage orange) |

> Remplacez `203.0.113.45` par **l'IP de votre VPS** (Étape 1).

### 9.4 — Activer le HTTPS correctement
1. Cloudflare → onglet **SSL/TLS** → **Overview**.
2. Choisissez le mode **« Full (strict) »** (recommandé) ou **« Full »** pour aller vite.
3. Onglet **SSL/TLS → Edge Certificates** → activez **« Always Use HTTPS »**.

### 9.5 — (Recommandé pour « Full strict ») Certificat d'origine
Pour que le lien VPS ↔ Cloudflare soit chiffré :
1. Cloudflare → **SSL/TLS → Origin Server** → **Create Certificate** → laissez les options par défaut → Create.
2. Copiez les 2 blocs de texte donnés (« Origin Certificate » et « Private Key »).
3. Sur le VPS, créez les fichiers :
```bash
mkdir -p /etc/ssl/cloudflare
nano /etc/ssl/cloudflare/cert.pem
```
→ collez le **Origin Certificate**, sauvegardez (**Ctrl+O**, Entrée, **Ctrl+X**).
```bash
nano /etc/ssl/cloudflare/key.pem
```
→ collez la **Private Key**, sauvegardez.

4. Modifiez Nginx pour écouter en HTTPS :
```bash
nano /etc/nginx/sites-available/app
```
Remplacez la ligne `listen 80;` par ces lignes :
```
    listen 443 ssl;
    ssl_certificate     /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;
```
Et **ajoutez tout en bas du fichier** (après l'accolade `}` finale) ce bloc qui redirige le http vers https :
```
server {
    listen 80;
    server_name monoffreclaude.com www.monoffreclaude.com;
    return 301 https://$host$request_uri;
}
```
Sauvegardez, puis :
```bash
nginx -t && systemctl restart nginx
```

> 💡 Plus simple (mode « Full » sans strict) : vous pouvez sauter 9.5 entièrement. Cloudflare gère quand même le cadenas HTTPS côté visiteur. Le « Full strict » est juste plus sécurisé.

---

# 🟦 ÉTAPE 10 — Vérifier que tout marche 🎉

1. Attendez que les nameservers soient actifs (Cloudflare vous envoie un e-mail « Your site is active »).
2. Ouvrez votre navigateur → tapez **https://monoffreclaude.com**
3. ✅ Vous devez voir votre landing page, avec le cadenas 🔒 à gauche de l'adresse.
4. Testez le formulaire : remplissez et envoyez un lead.
5. Allez sur **https://monoffreclaude.com/admin** pour vérifier l'administration.

### Si ça ne marche pas, vérifiez :
```bash
systemctl status backend --no-pager   # le backend tourne ?
systemctl status mongod --no-pager    # la base tourne ?
systemctl status nginx --no-pager     # nginx tourne ?
```
Voir les erreurs du backend en direct :
```bash
journalctl -u backend -f
```
(**Ctrl + C** pour arrêter.)

---

# 🔄 METTRE À JOUR L'APP PLUS TARD

Quand vous modifiez votre app dans Emergent et refaites « Save to GitHub », mettez à jour le VPS ainsi :

```bash
cd /var/www/app
git pull

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
systemctl restart backend

# Frontend
cd ../frontend
yarn install
yarn build

systemctl restart nginx
```

---

# 🆘 Problèmes fréquents (dépannage simple)

| Symptôme | Solution |
|----------|----------|
| « This site can't be reached » | Les nameservers Cloudflare ne sont pas encore actifs. Attendez, ou vérifiez l'Étape 9.2. |
| Page blanche | Le frontend n'est pas construit. Refaites `yarn build` (Étape 7.2). |
| Erreur 502 Bad Gateway | Le backend est arrêté. Faites `systemctl restart backend` puis regardez `journalctl -u backend -f`. |
| Le formulaire ne s'envoie pas | Vérifiez que `REACT_APP_BACKEND_URL` (Étape 7.1) est bien votre domaine en `https://`, puis refaites `yarn build`. |
| Boucle de redirection HTTPS | Dans Cloudflare SSL/TLS, essayez le mode **« Full »** au lieu de « Flexible ». |
| « Too many redirects » | Mode SSL Cloudflare = **Full** ou **Full strict**, jamais « Flexible ». |

---

## 🔐 Règles de sécurité à retenir
- Ne partagez **jamais** votre mot de passe root ni vos clés secrètes.
- Gardez le serveur à jour : de temps en temps, relancez `apt update && apt upgrade -y`.
- Sauvegardez votre base de données régulièrement :
```bash
mongodump --db=claude_leads --out=/root/backup-$(date +%F)
```

---

✅ **Félicitations, votre application est en ligne sur votre propre VPS Njalla avec Cloudflare !**

> ❓ Besoin d'aide sur une étape précise ? Dites-moi à quel numéro d'étape vous êtes bloqué et le message exact affiché, je vous guide pas à pas.
