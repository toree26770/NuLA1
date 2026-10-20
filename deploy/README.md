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

Le script va vous poser **quelques questions** :
1. L'adresse de votre dépôt GitHub → collez-la.
2. Votre sous-domaine Claude → tapez `app.mondomaine.com`.
3. Votre e-mail admin (+ mot de passe, ou laissez vide pour en générer un).
4. **Sous-domaine Défense** (optionnel) → tapez `militaire.axinvest.app` pour activer le 2ᵉ site (ou laissez vide pour l'ignorer).
5. Si vous avez mis un sous-domaine Défense : e-mail + mot de passe de l'admin Défense.

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

## 🟩 ÉTAPE 5 — Activer le 2ᵉ site « Livret Défense » (militaire.axinvest.app)

Le 2ᵉ site tourne sur **le même serveur** et la **même base** (données 100 % séparées, collections `defense_*`). Vous avez juste **un enregistrement DNS en plus** à créer.

1. **Cloudflare → votre domaine → DNS → Add record** :
   | Champ | Valeur |
   |-------|--------|
   | **Type** | `A` |
   | **Name** | `militaire`  ← donnera `militaire.axinvest.app` |
   | **IPv4 address** | la **MÊME IP de votre VPS** que pour Claude |
   | **Proxy status** | 🟠 **Proxied** (nuage orange) |
2. Cliquez **Save**. (Le mode SSL/TLS **Full** déjà réglé à l'étape 1 s'applique aussi.)
3. Lors de l'installation (ou de la mise à jour), à la question **« Sous-domaine Défense »**, tapez `militaire.axinvest.app`, puis saisissez l'e-mail et le mot de passe de l'admin Défense.
4. Attendez 1 à 5 minutes, puis ouvrez :
   - **https://militaire.axinvest.app** → la landing Défense s'affiche à la racine 🔒
   - **https://militaire.axinvest.app/admin** → l'administration Défense (identique à Claude, mais données séparées).

> 💡 Si le site Défense est déjà en place mais que vous avez modifié l'app : refaites « Save to GitHub » puis relancez la **même commande** d'installation.

---

## 🟧 ÉTAPE 6 — Activer le 3ᵉ site « Super Livret » (livret.axinvest.app)

Même principe que le site Défense : **même serveur, même base** (données 100 % séparées, collections `livret_*`), juste **un enregistrement DNS en plus**.

1. **Cloudflare → votre domaine → DNS → Add record** :
   | Champ | Valeur |
   |-------|--------|
   | **Type** | `A` |
   | **Name** | `livret`  ← donnera `livret.axinvest.app` |
   | **IPv4 address** | la **MÊME IP de votre VPS** |
   | **Proxy status** | 🟠 **Proxied** (nuage orange) |
2. Cliquez **Save**.
3. Lors de l'installation (ou de la mise à jour), à la question **« Sous-domaine Super Livret »**, tapez `livret.axinvest.app`, puis l'e-mail et le mot de passe de l'admin Super Livret.
4. Ouvrez :
   - **https://livret.axinvest.app** → la landing Super Livret 🔒
   - **https://livret.axinvest.app/admin** → son administration (identique aux autres, données séparées).

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
