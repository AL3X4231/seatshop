import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Volume2,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useInstall } from '../context/InstallContext';
import { useToast } from '../context/ToastContext';
import { errorText } from '../lib/api';
import { formatMoney } from '../lib/format';
import { playSaleSound, unlockSound } from '../lib/notifications';
import { Logo } from '../components/Logo';

export function LoginPage() {
  const { isAuthenticated, signInLive, startDemo } = useAuth();
  const { openInstall } = useInstall();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const from = (location.state as { from?: string } | null)?.from || '/';

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    unlockSound();
    try {
      await signInLive(key);
      void playSaleSound(0.65);
      toast({
        title: 'Bienvenue sur SeatShop',
        message: 'Votre boutique est connectée. Le son de vente est prêt.',
        tone: 'success',
      });
      navigate(from, { replace: true });
    } catch (submitError) {
      setError(errorText(submitError));
    } finally {
      setLoading(false);
    }
  };

  const onDemo = () => {
    startDemo();
    unlockSound();
    navigate('/', { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden="true" />
      <div className="login-topbar">
        <Logo size={36} />
        <button type="button" className="login-install" onClick={openInstall}>
          <Download size={15} />
          <span>Installer l’application</span>
        </button>
      </div>

      <div className="login-grid">
        <section className="login-hero">
          <div className="login-kicker">
            <span className="login-kicker-dot" />
            PWA pour iPhone et Android
          </div>
          <h1 className="login-headline">
            Vos ventes de billets.
            <br />
            <span>Enfin aussi agréables que Shopify.</span>
          </h1>
          <p className="login-lead">
            Une administration mobile-first pour votre compte Seatiks : ventes en direct, inventaire,
            événements, et le fameux <strong>cha-ching</strong> à chaque commande.
          </p>

          <div className="login-features">
            <div className="login-feature">
              <span className="login-feature-icon">
                <Volume2 size={18} />
              </span>
              <div>
                <strong>Le son de vente Shopify</strong>
                <p>Le vrai « cha-ching », à chaque nouvelle vente.</p>
              </div>
            </div>
            <div className="login-feature">
              <span className="login-feature-icon">
                <BellRing size={18} />
              </span>
              <div>
                <strong>Notifications iOS</strong>
                <p>Installée depuis Safari, avec alertes push en arrière-plan.</p>
              </div>
            </div>
            <div className="login-feature">
              <span className="login-feature-icon">
                <ShieldCheck size={18} />
              </span>
              <div>
                <strong>Vos clés restent chez vous</strong>
                <p>Connexion directe à l’API Seatiks, sans serveur intermédiaire.</p>
              </div>
            </div>
          </div>

          <div className="login-preview" aria-hidden="true">
            <div className="preview-window">
              <div className="preview-window-bar">
                <span />
                <span />
                <span />
              </div>
              <div className="preview-body">
                <div className="preview-side">
                  <div className="preview-side-logo" />
                  <div className="preview-side-line is-active" />
                  <div className="preview-side-line" />
                  <div className="preview-side-line" />
                  <div className="preview-side-line is-short" />
                </div>
                <div className="preview-main">
                  <div className="preview-kpis">
                    <div className="preview-kpi">
                      <span>Ventes du jour</span>
                      <strong>{formatMoney(1248.5, 'USD')}</strong>
                      <em>+18,2 %</em>
                    </div>
                    <div className="preview-kpi">
                      <span>Billets vendus</span>
                      <strong>26</strong>
                      <em>+6 aujourd’hui</em>
                    </div>
                  </div>
                  <div className="preview-chart">
                    {[42, 65, 48, 78, 56, 88, 72, 96, 68, 84, 92, 74].map((height, index) => (
                      <span key={index} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <div className="preview-toast">
                    <span className="preview-toast-icon">
                      <ShoppingBag size={16} />
                    </span>
                    <div>
                      <strong>Nouvelle vente · 286,80 $</strong>
                      <small>2 billets · Atlético — Bayern</small>
                    </div>
                    <Sparkles size={15} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="login-card-wrap">
          <div className="login-card">
            <div className="login-card-icon">
              <Wallet size={22} />
            </div>
            <h2>Connectez votre compte Seatiks</h2>
            <p className="login-card-sub">
              Collez une clé API en lecture seule. Vos données s’affichent en quelques secondes.
            </p>

            <form onSubmit={onSubmit} className="login-form">
              <label htmlFor="api-key">Clé API Seatiks</label>
              <div className={`input-with-icon ${error ? 'has-error' : ''}`}>
                <KeyRound size={17} />
                <input
                  id="api-key"
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                  placeholder="stk_live_…"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowKey((visible) => !visible)}
                  aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}
                >
                  {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              {error ? (
                <div className="form-error" role="alert">
                  {error}
                </div>
              ) : null}

              <button type="submit" className="btn btn-primary btn-lg login-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" />
                    Connexion à Seatiks…
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            <div className="login-divider">
              <span>ou</span>
            </div>

            <button type="button" className="btn btn-secondary btn-lg login-demo" onClick={onDemo}>
              <Sparkles size={17} />
              Explorer la démo
            </button>
            <p className="login-demo-note">
              Aucune clé nécessaire. Vous pourrez simuler une vente pour entendre le son.
            </p>

            <div className="login-security">
              <LockKeyhole size={15} />
              <span>
                La clé est stockée uniquement sur cet appareil. SeatShop appelle directement l’API
                Seatiks.
              </span>
            </div>

            <button
              type="button"
              className="login-help-toggle"
              onClick={() => setShowHelp((visible) => !visible)}
            >
              Où trouver ma clé API ?
            </button>
            {showHelp ? (
              <div className="login-help">
                <p>
                  Dans votre compte Seatiks : <strong>Réglages → Développeurs → Clés API</strong>.
                  Créez une clé avec les scopes :
                </p>
                <div className="scope-list">
                  <span>
                    <CheckCircle2 size={13} /> events:read
                  </span>
                  <span>
                    <CheckCircle2 size={13} /> listings:read
                  </span>
                  <span>
                    <CheckCircle2 size={13} /> sales:read
                  </span>
                </div>
                <p className="login-help-muted">
                  Une clé de test <code>stk_test_…</code> fonctionne aussi, avec un catalogue fictif.
                </p>
              </div>
            ) : null}
          </div>

          <div className="login-trust">
            <span>
              <Smartphone size={14} /> iPhone · Android
            </span>
            <span>
              <BellRing size={14} /> Notifications push
            </span>
            <span>
              <ShieldCheck size={14} /> 100 % gratuit
            </span>
          </div>
        </section>
      </div>

      <footer className="login-footer">
        SeatShop n’est pas affilié à Shopify. Le son de notification est utilisé pour usage
        personnel. Données fournies par l’API Seatiks.
      </footer>
    </div>
  );
}
