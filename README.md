# SeatShop

**Votre administration de vente de billets, façon Shopify, pour l’API Seatiks.**

**Application en ligne : [al3x4231.github.io/seatshop](https://al3x4231.github.io/seatshop/)**

SeatShop est une PWA mobile-first en lecture seule qui affiche vos ventes,
annonces et événements Seatiks en direct, avec le vrai son de vente « cha-ching »
de Shopify et des notifications installables sur iPhone et Android.

> Projet indépendant, non affilié à Shopify ni à Seatiks. Les données et marques
> appartiennent à leurs propriétaires respectifs.

## Fonctionnalités

- **Tableau de bord** : chiffre d’affaires, ventes, billets, panier moyen,
  graphique par jour, top événements et actions à traiter.
- **Ventes** : recherche, filtres par statut, marketplace et date, export CSV,
  détail d’une commande, acheteurs et livraison.
- **Inventaire** : annonces, prix, quantités, statuts de diffusion, erreurs par
  marketplace et détail par annonce.
- **Événements** : catalogue à venir, recherche, pays, sections et ventes liées.
- **Alertes** : historique local, badges non lus, notifications système.
- **Son Shopify** : joué à chaque nouvelle vente détectée lorsque l’app est
  ouverte, avec volume réglable et bouton de test.
- **Mode démo** : données réalistes et bouton « Simuler une vente » pour tester
  le son, les alertes et l’interface sans clé API.
- **PWA installable** : plein écran, cache hors ligne, icône Seatiks, raccourcis
  Ventes / Inventaire / Alertes.
- **Push en arrière-plan optionnel** : Worker Cloudflare gratuit fourni dans
  [`push-worker/`](push-worker/README.md), notifications iOS 16.4+ et Android.
- **Lecture seule** : la clé n’a besoin que de `events:read`, `listings:read` et
  `sales:read`. Aucun appel d’écriture à Seatiks.

## Démarrage rapide

```bash
npm install
npm run dev
```

Ouvrez `http://localhost:5173`, puis :

1. **Explorer la démo** pour découvrir l’application ;
2. ou collez une clé API Seatiks en lecture seule pour vous connecter au direct.

La clé API est stockée **uniquement dans le `localStorage` de cet appareil**. Elle
n’est jamais envoyée à un serveur SeatShop. Les appels partent directement du
navigateur vers `https://api.seatiks.com`.

## Créer une clé API Seatiks

Dans votre compte Seatiks, créez une clé **live en lecture seule** avec les
scopes :

```text
events:read
listings:read
sales:read
```

Ne créez pas de clé avec des droits d’écriture : SeatShop n’en a pas besoin.
Si vous partagez votre écran ou vos logs, masquez la clé.

> Le fichier `seatiksapi.md` et le dossier `api-samples/` sont ignorés par Git :
> ils ne doivent jamais être publiés sur GitHub.

## Installer sur iPhone

1. Ouvrez [al3x4231.github.io/seatshop](https://al3x4231.github.io/seatshop/) **dans Safari**.
2. Touchez **Partager** → **Sur l’écran d’accueil** → **Ajouter**.
3. Ouvrez l’application depuis l’écran d’accueil.
4. Autorisez les notifications quand SeatShop le propose.

C’est gratuit, sans App Store ni compte développeur Apple. Les notifications
push iOS exigent **iOS 16.4 ou supérieur** et une PWA réellement installée.

### Limites du son sur iPhone

- **Application ouverte** : SeatShop joue le vrai son Shopify.
- **Notification push en arrière-plan** : iOS joue son propre son de
  notification. Apple ne permet pas à une PWA d’imposer un son personnalisé
  dans une notification push. Le son Shopify reste donc réservé au premier plan.
- Le son doit être déverrouillé par un premier toucher sur l’écran (règle
  d’autoplay des navigateurs). SeatShop le fait automatiquement au premier clic.

## Notifications push en arrière-plan

Le dossier [`push-worker/`](push-worker/README.md) contient un Worker Cloudflare
prêt à déployer :

```bash
cd push-worker
npm install
npx wrangler login
npx wrangler kv namespace create SEATSHOP_KV
# reporter l'identifiant dans wrangler.toml
npx wrangler secret put SEATIKS_API_KEY
npx wrangler secret put SUBSCRIBE_TOKEN   # optionnel
npx wrangler deploy
```

Puis dans SeatShop → **Paramètres → Notifications**, collez l’URL du Worker.
Le Worker vérifie les ventes chaque minute et envoie les notifications aux
appareils abonnés. Le plan gratuit Cloudflare suffit largement.

Détails, routes et dépannage : [`push-worker/README.md`](push-worker/README.md).

## Déploiement GitHub Pages

Le code source vit sur `main` et le site publié sur la branche `gh-pages`, qui
contient uniquement le build. Après une modification :

```bash
npm run deploy
```

La commande build avec `BASE_PATH=/seatshop/`, ajoute `.nojekyll` et force-push
le contenu de `dist/` sur `gh-pages`.

Configuration initiale sur GitHub : **Settings → Pages → Build and deployment**
→ **Deploy from a branch**, branche `gh-pages`, dossier `/ (root)`.

Le site est alors publié sur `https://<compte>.github.io/seatshop/`. Pour un
autre nom de dépôt, modifiez `BASE_PATH` dans `scripts/deploy-pages.sh`, ainsi
que `APP_URL` dans le Worker.

Build manuel :

```bash
BASE_PATH=/seatshop/ npm run build
BASE_PATH=/seatshop/ npm run preview
```

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Vérification TypeScript + build de production |
| `npm run preview` | Prévisualisation du build |
| `npm run deploy` | Build et publication sur la branche `gh-pages` |
| `npm run icons` | Régénère les icônes PWA (ImageMagick requis) |

## Architecture

```text
src/
  components/       Shell, tableaux, drawers, modales, installation
  context/          Auth, données/polling, alertes, toasts, installation
  lib/              Client API, stockage local, démo, formatage, notifications
  pages/            Tableau de bord, ventes, inventaire, événements, alertes, réglages
public/
  icons/            Icônes PWA générées depuis l’icône Seatiks
  sounds/           Son de vente Shopify
  sw.js             Service worker (cache + push)
  manifest.webmanifest
push-worker/        Worker Cloudflare optionnel pour le push
```

Le client interroge l’API toutes les 30 secondes lorsque l’onglet est visible
(paramétrable : 15, 30, 60 ou 120 secondes). Les données sont mises en cache dans
`localStorage` pour un affichage immédiat et hors ligne. Au retour sur l’app
après quelques minutes, un rafraîchissement complet est déclenché.

## Vie privée et sécurité

- Aucun backend SeatShop : les données live vont du navigateur à Seatiks.
- La clé API reste sur l’appareil et n’est jamais incluse dans le build.
- Le Worker push ne reçoit que les abonnements push et utilise la clé Seatiks
  comme secret Cloudflare. Il ne stocke pas les ventes ni les acheteurs.
- Les exports CSV et les données mises en cache restent locaux.
- `seatiksapi.md`, `api-samples/`, `node_modules/`, `dist/` et les fichiers
  `.dev.vars` sont ignorés par Git.

## Dépannage

**La PWA ne s’installe pas sur iPhone**  
Utilisez Safari, pas Chrome. Le menu Partager doit proposer « Sur l’écran
d’accueil ». Si la page est déjà ouverte dans Chrome, copiez le lien dans Safari.

**Aucune notification push**  
Vérifiez que l’app est installée, que les notifications sont autorisées dans
iOS, que l’URL du Worker est correcte et que `npx wrangler tail` ne montre pas
d’erreur. Le premier passage du cron n’envoie rien : il mémorise l’existant.

**Le son ne joue pas**  
Touchez d’abord l’écran, vérifiez le volume et le bouton son dans la barre
supérieure. Sur iPhone, le mode silencieux peut couper le son de l’application.

**Erreur 401 / clé invalide**  
La clé a peut-être été révoquée ou copiée partiellement. Créez une nouvelle clé
live en lecture seule et reconnectez-vous.

**Les données semblent figées**  
Touchez l’icône de rafraîchissement ou revenez sur l’onglet. Vérifiez la bannière
d’erreur et la connexion réseau.
