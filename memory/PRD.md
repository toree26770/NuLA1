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

## Journal (mises à jour)
- 2026-10-10 : **App 2 Défense — ADMIN IDENTIQUE à la landing 1 + formulaire/contenu modifiables, données 100% séparées** (demande utilisateur: « exactement à l'identique que la landing 1, juste séparé »).
  - **Backend cloné** vers collections `defense_*` (comportement identique à Claude, zéro risque pour Claude) : `defense_public_routes.py` (prefix /defense : content, form/published, pixels/active, track, leads, leads/partial avec honeypot+fast_submit+rate_limit+doublons), `defense_admin_routes.py` (prefix /defense/admin : stats, analytics, leads CRUD+réponses, campagnes, contenu, pixels, exports/récupération, sécurité), `defense_form_routes.py` (FormBuilder: versions draft/publish), `defense_auth.py` (cookie isolé `defense_access_token`), `defense_db.py`, `defense_seed.py` (contenu au MÊME schéma que Claude + formulaire 2 étapes).
  - **Frontend** : réutilise les COMPOSANTS ADMIN EXACTS de la landing 1 (AdminLayout, Dashboard, LeadsPage, FormBuilder, ContentEditor, Exports, Campagnes, Settings, PartialLeads, Login) via un intercepteur axios (`api.js`) qui préfixe `/defense` aux appels `/admin` et `/auth` quand on est en scope Défense. Marque « Défense » dans la barre latérale.
  - **Landing Défense dynamique** : le formulaire est désormais rendu depuis `/api/defense/form/published` (donc modifiable via FormBuilder) et le contenu depuis `/api/defense/content` (taux, textes — modifiables via l'éditeur de contenu), **sans changer le design** (militaire, 7,10 %, secteur Thales/Safran/Dassault/Airbus, préfixes téléphoniques FR).
  - **Routage par domaine** (`defenseBase.js`) : en production sur `militaire.axinvest.app`, la landing Défense est à `/` et l'admin à `/admin` ; en preview, à `/defense` et `/defense/admin`. Variable `REACT_APP_DEFENSE_HOST` dans frontend/.env.
  - **Validé** testing_agent iteration_5 : backend 34/34, frontend 100%, **isolation stricte** (collections + cookies + endpoints, 401 sessions croisées) et **non-régression Claude** confirmées. Données de test purgées, réglages anti-bot remis en prod.
  - Identifiants admin Défense : voir /app/memory/test_credentials.md.
  - **Déploiement prévu** (Option A) : sous-domaine `militaire.axinvest.app` → même VPS, bloc Nginx + SSL, config à fournir à l'utilisateur (DNS Cloudflare).
- 2026-10-10 : **App 2 Défense — image militaire, téléphone à préfixe, anti-bot, section secteur & ADMIN ISOLÉ complet**.
  - Hero : image sur-mesure d'un militaire français moderne (générée, drapeau tricolore) dans la colonne gauche.
  - Formulaire : champ téléphone avec **menu déroulant de préfixes français** (France + outre-mer, identique à la 1ʳᵉ landing), numéro composé en format international.
  - **Anti-bot** (POST /api/defense/leads) : honeypot, rejet soumission trop rapide (`started_at` < min_submit_seconds), limite par IP/heure, détection doublons sur fenêtre configurable. + suivi d'audience (`/api/defense/track`) et capture de leads incomplets (`/api/defense/leads/partial`), le tout en collections `defense_*`.
  - Nouvelle **section « secteur de la défense »** (bandeau navy) : Thales, Safran, Dassault Aviation, Airbus + mention souveraineté (noms cités à titre illustratif).
  - **Admin Défense ISOLÉ** à `/defense/admin` : auth séparée (`defense_auth.py`, cookie `defense_access_token`, collection `defense_admin_users`, login admin@livret-defense.fr) ; routes `defense_admin_routes.py` (prefix /api/defense/admin) : stats, analytics, prospects (liste/recherche/filtre/statut/notes/suppression/suppression groupée/fiche), exports (nouveaux lot pending→récupéré, personnalisé, liste, download, cancel) CSV UTF-8-BOM, leads incomplets + export CSV, Meta Pixels CRUD, paramètres (anti-bot). Frontend `pages/defense/*` (Layout, Login, Dashboard, Leads, PartialLeads, Exports, Pixels, Settings).
  - **Isolation vérifiée** (testing_agent iteration_4, 100 %) : collections + cookies + endpoints séparés ; un lead /defense n'apparaît pas dans l'admin Claude ; sessions croisées => 401. App Claude non modifiée.
  - Identifiants admin Défense dans /app/memory/test_credentials.md.
- 2026-10-10 : **App 2 Défense — refonte hero/logo/typo (retours utilisateur)**. Formulaire dans le hero (visible sans scroll) avec 7,10 % NET/AN mis en avant + 2ᵉ formulaire en bas ; typo Bricolage Grotesque + Manrope ; logo monogramme « LD » ; tricolore accentué (couleurs drapeau, bandes épaissies) ; consentement raccourci. Validé testing_agent iteration_3.
- 2026-10-10 : **App 2 « Livret d'Épargne Défense » — Phase 1 (landing Preview)**. Nouvelle app isolée dans le même projet. Backend `defense_routes.py` (collections `defense_*`, aucune donnée partagée) : GET /api/defense/pixels/active, POST /api/defense/leads (validation nom/email/téléphone, consentement obligatoire, honeypot, dédup, campaign+pixel_ids). Frontend `/defense` : landing 9 sections (bandeau tricolore, hero 7,10%, caractéristiques, « ouvert à tous », avantages, comment ça marche, formulaire 2 étapes, FAQ, footer) + bannière cookies + pixel (trackSingle PageView/Lead). Design institutionnel (Playfair Display + Outfit, #071D3A/#163A63/#C8102E). Isolation vérifiée (le prospect défense n'apparaît pas dans les leads du site 1). App 1 non modifiée. Reste : Phase 2 (admin indépendant /defense/admin : dashboard, prospects, pixels, contenu, paramètres), Phase 3 (déploiement 2e sous-domaine).
- 2026-10-10 : Meta Pixels — le Pixel se charge désormais TOUJOURS (plus de blocage par consentement) ; la bannière du bas devient une simple notice cookies informative (bouton « Accepter » qui la ferme, persistance localStorage). Événements PageView + Lead via trackSingle (une seule fois chacun), aucune donnée sensible.
- 2026-10-10 : Champ téléphone — menu déroulant de préfixes des zones françaises uniquement (🇫🇷 +33, 🇬🇵 +590, 🇲🇶 +596, 🇬🇫 +594, 🇷🇪/🇾🇹 +262, 🇵🇲 +508, 🇧🇱/🇲🇫 +590, 🇳🇨 +687, 🇵🇫 +689, 🇼🇫 +681) + champ numéro ; la valeur est envoyée en format international. Validé 100% (iteration_2).
- 2026-10-10 : Gestionnaire Meta Pixels administrable (Paramètres → Meta Pixels) : CRUD, activation/désactivation, association campagne→pixel (résolution côté serveur GET /api/pixels/active), Pixel 1 (1905482920834524) seedé is_default. Suppression de leads (individuelle + sélection + fiche, endpoints DELETE /api/admin/leads/{id} et POST /api/admin/leads/bulk-delete). Validation téléphone outre-mer (validators.normalize_phone_fr multi-régions). Visuels landing : titre « LIVRET D'ÉPARGNE » en relief, badge d'éligibilité clignotant, halo autour du formulaire, champs avec relief. Validé 100% (iteration_1).
- 2026-10-09 : Statistiques — page rendue robuste (états chargement / erreur + bouton « Réessayer » au lieu d'une page blanche si le chargement échoue).
- 2026-10-09 : **Leads incomplets** (NOUVEAU). Capture automatique des réponses partielles pendant la saisie (`POST /api/leads/partial`, collection `partial_leads`, upsert par `session_id`, debounce 1,5 s côté formulaire). Marquage auto `completed` à l'envoi complet (via `session_id` dans le meta). Admin : page `/admin/leads/incomplets` (liste + pagination) et export CSV français `GET /api/admin/partial-leads/export.csv` (`build_partial_leads_csv`).
- 2026-10-09 : Retrait de la question de consentement du formulaire (affichage + validation backend).
- 2026-10-09 : FormBuilder — clarification UX pour un novice (bandeau + bouton « Modifier ce formulaire » qui crée un brouillon éditable).
- 2026-10-09 : Déploiement VPS simplifié — script tout-en-un `deploy/install.sh` + notice `deploy/README.md` (et `README.md` racine). Filtre auto des libs internes non utilisées (emergentintegrations, litellm). HTTPS via Cloudflare (sous-domaine).
- 2026-10-09 : **Système d'analyse d'audience** (NOUVEAU). Collecte d'évènements publics `POST /api/track` (page_view, form_start, step_view, form_submit) dans `analytics_events` ; agrégation `GET /api/admin/analytics?days=` (visites, visiteurs uniques, formulaires commencés/envoyés, abandons, taux conversion/complétion/abandon, entonnoir par étape, série temporelle, sources de trafic). Page admin `Statistiques` (`/admin/statistiques`) avec cartes, entonnoir, graphique visites/envois et sources. Suivi session via `localStorage` (helper `trackEvent` dans `api.js`).

## Identifiants
Voir /app/memory/test_credentials.md (admin@claude-offre.fr).
