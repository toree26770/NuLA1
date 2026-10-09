# PRD — Landing Page Claude / IA + Génération de Leads Meta Ads

## Problème initial (résumé)
Landing page premium en continuité visuelle avec une publicité Meta (fond bleu nuit #101722/#0B111B, orange #FF683D/#FF914D, serif Playfair Display, formulaire blanc à droite), formulaire multi-étapes dynamique, admin privée complète (leads, exports CSV progressifs, doublons, anti-bot, constructeur de formulaire, éditeur de contenu, campagnes Meta). Textes FR fournis par le client, tous éditables.

## Personas
- Visiteur Meta Ads (mobile majoritairement) : découvre l'offre, remplit le formulaire.
- Administrateur (l'utilisateur) : récupère les leads en CSV plusieurs fois par jour, gère formulaire et contenus.

## Choix utilisateur (ask_human)
- Pas d'OTP SMS ni de code e-mail (validation format + MX + anti-jetables + doublons).
- Anti-bot intégré (honeypot, rate limiting, soumission trop rapide) — pas de Turnstile.
- Tracking Meta (UTM, fbclid, campaign_id) enregistré par lead ; Pixel/CAPI plus tard.
- Admin en français. Onglet Doublons avec compteur.

## Architecture
- Backend FastAPI : server.py (bootstrap), auth.py (JWT cookie httpOnly + Bearer, bcrypt, brute-force), public_routes.py (content, form publié, POST /leads avec anti-bot + doublons), admin_routes.py (stats, leads, exports CSV progressifs, campagnes, contenu, paramètres), form_routes.py (versions, brouillons, publication, restauration), seed_data.py, validators.py (phonenumbers FR, email-validator + MX, jetables), csv_utils.py (UTF-8 BOM, point-virgule, anti-injection).
- MongoDB : leads, lead_answers (snapshots), form_versions/steps/questions, export_batches, admin_users, security_logs, site_content, settings.
- Frontend React : LandingPage (sections pilotées par le contenu admin), DynamicForm (rendu par la base, transitions framer-motion), /admin (Dashboard recharts, LeadsPage, FormBuilder drag&drop, ContentEditor, ExportsPage, CampaignsPage, SettingsPage).

## Implémenté (2026-10-09)
- Landing fidèle à la pub + nouveaux textes d'accroche du complément client ; encadré Livret 8,10 % remonté sous le titre (visible immédiatement, desktop + mobile).
- Formulaire dynamique 2 étapes par défaut (v1 publiée), consentement, confirmation animée.
- Admin : login sécurisé, dashboard graphiques, leads filtrables + fiche, statuts, doublons, exports progressifs (pending → téléchargement = récupéré), historique + retéléchargement, constructeur (ajout/modif/suppression questions & étapes, drag&drop, préview desktop/mobile, publication, versions), éditeur de contenu complet, campagnes Meta, paramètres + journal de sécurité.
- SEO de base : title/description FR, OG, JSON-LD WebPage, robots.txt, llms.txt, favicon SVG, noscript. (Canonical/sitemap en attente du domaine de production.)

## Tests effectués
Soumission complète mobile (3 étapes, champ personnalisé), doublon bloqué, téléphone invalide rejeté (0712…), exports successifs sans réapparition des leads récupérés, CSV avec colonne personnalisée, publication v2 visible sur la landing, admin complet parcouru par captures.

## Backlog
- P0 : brancher Meta Pixel + Conversions API (clés à fournir), domaine de production + canonical/sitemap.
- P1 : OTP SMS (Twilio) et vérification e-mail par code (Resend) si souhaités ; purge RGPD automatique selon retention_days.
- P2 : rôles admin multiples, notifications e-mail de nouveau lead, A/B testing de titres.

## Identifiants
Voir /app/memory/test_credentials.md (admin@claude-offre.fr).
