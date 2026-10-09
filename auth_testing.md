# Auth — Playbook de test

## Vérification MongoDB
```
db.admin_users.find({role: "admin"})
```
Le hash du mot de passe doit commencer par `$2b$`. Index unique sur `admin_users.email`, index sur `login_attempts.identifier`.

## Tests API
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@claude-offre.fr","password":"Claude2026!Admin"}'
curl -b cookies.txt http://localhost:8001/api/auth/me
```
Le login retourne l'utilisateur + cookie `access_token` httpOnly (12 h) + champ `token` (fallback Bearer). `/me` retourne le même utilisateur.

## Verrouillage anti-brute-force
Après 5 échecs sur un même couple IP:email → HTTP 429 pendant 15 minutes. Les échecs sont journalisés dans `security_logs` (event_type `failed_login`).

## Identifiants
Voir `/app/memory/test_credentials.md`.
