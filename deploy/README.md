# 🚀 Installer votre application en 1 seule commande (VPS + Cloudflare)

Ce guide est pour un **grand débutant**. Vous n'aurez à taper **qu'une seule commande**.
Le reste s'installe tout seul : Node, Python, MongoDB, Nginx, le site, le serveur et le HTTPS.

Vous, vous ne gérez que **le DNS chez Cloudflare** (ce que vous savez faire 👍).

---

## ✅ Avant de commencer, il vous faut

- [ ] Un **VPS Ubuntu** (22.04 ou 24.04) chez Njalla — notez son **adresse IP** et son **mot de passe root**.
- [ ] Votre code sur **GitHub** (bouton « Save to GitHub » dans Emergent). Notez l'adresse, ex :
      `https://github.com/moi/claude-leads.git`
      👉 Pendant l'installation, mettez le dépôt en **public** (plus simple).
- [ ] Votre domaine relié à **Cloudflare** (avec les nameservers Cloudflare), et un **sous-domaine** choisi, ex : `app.mondomaine.com`.

---

## 🟦 ÉTAPE 1 — Créer le sous-domaine chez Cloudflare (2 minutes)

On utilise un **sous-domaine** (ex. `app.mondomaine.com`) : c'est plus simple et ça n'affecte pas votre domaine principal.

1. Allez sur **Cloudflare** → votre domaine → onglet **DNS** → bouton **Add record**.
2. Remplissez :
   | Champ    | Valeur |
   |----------|--------|
   | **Type** | `A` |
   | **Name** | `app`  ← juste le début du sous-domaine (donnera `app.mondomaine.com`) |
   | **IPv4 address** | l'**IP de votre VPS** (ex: `203.0.113.45`) |
   | **Proxy status** | 🟠 **Proxied** (nuage orange) |
3. Cliquez **Save**.
4. Allez dans l'onglet **SSL/TLS** → **Overview** → choisissez le mode **« Full »**.

> 💡 C'est tout pour Cloudflare. Le nuage orange 🟠 donne automatiquement le cadenas HTTPS 🔒 à vos visiteurs.

---

## 🟦 ÉTAPE 2 — Se connecter au VPS

Ouvrez le **Terminal** (Mac) ou **PowerShell** (Windows) et tapez (remplacez par votre IP) :

```bash
ssh root@VOTRE_IP
```
Tapez `yes`, puis collez le mot de passe root de Njalla (rien ne s'affiche, c'est normal), Entrée.

---

## 🟦 ÉTAPE 3 — LA commande magique (installe TOUT)

Copiez-collez cette **seule ligne** (remplacez `moi/claude-leads` par VOTRE dépôt, et gardez `main` ou mettez `master` selon votre branche) :

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/moi/claude-leads/main/deploy/install.sh)
```

Le script va vous poser **3 questions** :
1. L'adresse de votre dépôt GitHub → collez-la.
2. Votre sous-domaine → tapez `app.mondomaine.com`.
3. Votre e-mail admin (+ mot de passe, ou laissez vide pour en générer un).

Puis **tout s'installe automatiquement** (comptez 5 à 10 minutes ☕).

À la fin, le script affiche :
- ✅ l'adresse de votre site : `https://app.mondomaine.com`
- ✅ l'adresse admin : `https://app.mondomaine.com/admin`
- ✅ vos identifiants de connexion (📝 **notez-les !**)

---

## 🟦 ÉTAPE 4 — Vérifier

1. Attendez ~1 à 5 minutes que Cloudflare propage le sous-domaine.
2. Ouvrez **https://app.mondomaine.com** → votre landing page doit s'afficher avec le cadenas 🔒.
3. Testez le formulaire, puis connectez-vous sur **/admin**.

---

## 🔄 Mettre à jour plus tard (quand vous modifiez l'app)

Après avoir refait « Save to GitHub » dans Emergent, reconnectez-vous au VPS (Étape 2) et relancez **exactement la même commande** (Étape 3). Le script récupère le nouveau code, reconstruit et redémarre tout. C'est tout. ✅

---

## 🆘 Si quelque chose ne va pas

| Problème | Que faire |
|----------|-----------|
| « This site can't be reached » | Attendez quelques minutes (propagation Cloudflare), vérifiez l'enregistrement A (Étape 1). |
| « Too many redirects » | Cloudflare → SSL/TLS → mettez le mode sur **Full** (pas « Flexible »). |
| Page blanche / erreur 502 | Reconnectez-vous au VPS et tapez : `systemctl restart claude-backend nginx` |
| Voir ce qui se passe côté serveur | `journalctl -u claude-backend -f` (Ctrl+C pour sortir) |
| Je veux refaire une installation propre | Relancez simplement la commande de l'Étape 3. |

---

## 🔐 Bon à savoir
- Pour changer plus tard d'adresse IP de serveur, modifiez juste l'enregistrement **A** dans Cloudflare.
- Sauvegarde de la base de données :
  ```bash
  mongodump --db=claude_leads --out=/root/backup-$(date +%F)
  ```

🎉 **Et voilà — votre application est en ligne, en une seule commande !**
