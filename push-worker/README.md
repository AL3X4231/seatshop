# SeatShop Push Worker

Worker Cloudflare **gratuit** qui envoie les notifications de vente SeatShop en
arrière-plan, même quand la PWA est fermée.

Il interroge l’API Seatiks une fois par minute, détecte les nouvelles ventes et
envoie une notification Web Push à chaque appareil abonné. Les clés VAPID sont
générées automatiquement et conservées dans Cloudflare KV : aucune clé Apple ni
service payant n’est nécessaire.

## Ce qu’il stocke

- les abonnements push (endpoint + clés publiques de chiffrement) ;
- l’état de synchronisation (dernière vérification, dernière vente, erreurs) ;
- la paire VAPID générée automatiquement.

Il ne stocke **aucune** vente, aucun acheteur et n’expose jamais la clé API
Seatiks au navigateur. La clé est un secret Cloudflare, utilisé uniquement côté
Worker.

## Prérequis

- un compte Cloudflare gratuit ;
- Node.js 20+ recommandé ;
- `wrangler` est installé par `npm install` ;
- la clé API Seatiks en lecture seule (`events:read`, `listings:read`,
  `sales:read`). Une clé live est nécessaire pour suivre les vraies ventes.

## Installation

### 1. Installer les dépendances

```bash
cd push-worker
npm install
npx wrangler login
```

### 2. Créer le namespace KV

```bash
npx wrangler kv namespace create SEATSHOP_KV
```

Copiez l’identifiant retourné dans `wrangler.toml`, à la place de
`REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

### 3. Configurer l’URL de l’application

Dans `wrangler.toml` :

```toml
[vars]
APP_URL = "https://al3x4231.github.io/seatshop/"
VAPID_SUBJECT = "mailto:vous@exemple.com"
```

- `APP_URL` doit être l’URL publique exacte de la PWA, avec un `/` final ;
- `VAPID_SUBJECT` doit être un vrai `mailto:` (recommandé par Apple/Google).

### 4. Ajouter les secrets

```bash
npx wrangler secret put SEATIKS_API_KEY
# Collez la clé stk_live_... lorsque demandé.

# Optionnel mais recommandé : protège les abonnements et les tests.
npx wrangler secret put SUBSCRIBE_TOKEN
# Choisissez un mot de passe long, puis collez-le dans SeatShop → Paramètres.
```

### 5. Déployer

```bash
npx wrangler deploy
```

Wrangler affiche l’URL du Worker, par exemple :

```text
https://seatshop-push.votre-compte.workers.dev
```

### 6. Connecter la PWA

1. Ouvrez SeatShop **installée sur l’écran d’accueil** (iOS 16.4+ pour les push).
2. Paramètres → Notifications → Notifications push en arrière-plan.
3. Collez l’URL du Worker et, si configuré, le jeton `SUBSCRIBE_TOKEN`.
4. Touchez **Connecter**, puis **Tester**.

Le cron Cloudflare s’exécute ensuite toutes les minutes. Le premier passage
mémorise les ventes existantes et n’envoie rien ; les suivantes sont notifiées.
Pour rattraper la dernière vente après l’installation (ou une notification
manquée), utilisez le bouton **Renvoyer la dernière vente** dans les réglages
de SeatShop. Le Worker l’envoie à tous les appareils abonnés et la marque comme
traitée pour éviter un doublon au passage suivant du cron.

## Routes

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` | `/api/health` | État minimal du Worker |
| `GET` | `/api/config` | Clé publique VAPID + URL de l’app |
| `GET` | `/api/status` | Abonnements, dernière vérification, erreurs |
| `POST` | `/api/subscribe` | Enregistre un abonnement push |
| `POST` | `/api/unsubscribe` | Supprime un abonnement |
| `POST` | `/api/test` | Envoie une notification de test |
| `POST` | `/api/notify-latest` | Renvoie la dernière vente à tous les abonnés |

Les routes sensibles acceptent l’en-tête `X-SeatShop-Token` si
`SUBSCRIBE_TOKEN` est défini.

## Développement local

Créez `push-worker/.dev.vars` (ignoré par Git) :

```dotenv
SEATIKS_API_KEY=stk_live_...
SUBSCRIBE_TOKEN=un-jeton-local
```

Puis :

```bash
npx wrangler dev --test-scheduled
# Déclenche un passage manuel :
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

## Notes importantes

- **iOS** : les notifications Web Push ne fonctionnent que dans une PWA
  installée depuis Safari, sur iOS 16.4 ou supérieur. Le son personnalisé
  Shopify n’est pas contrôlable par les push iOS : iOS joue son son système.
  Le vrai « cha-ching » est joué par l’application au premier plan.
- Le plan gratuit Cloudflare inclut 100 000 lectures Worker par jour ; un cron
  toutes les minutes consomme environ 1 440 exécutions par jour.
- Les endpoints d’abonnement sont supprimés automatiquement sur réponse
  `404`/`410` d’Apple, Google ou Mozilla.
- Si vous supprimez le namespace KV, les clés VAPID changent et les anciens
  abonnements deviennent invalides : reconnectez les appareils.
- Le Worker ne peut pas livrer de billets et ne fait aucun appel d’écriture à
  l’API Seatiks.
