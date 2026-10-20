import { Check, Copy, Download, PlusSquare, Share, Smartphone, Sparkles } from 'lucide-react';
import { useInstall } from '../context/InstallContext';
import { useToast } from '../context/ToastContext';
import { Modal } from './Modal';

export function InstallSheet() {
  const {
    open,
    closeInstall,
    installed,
    canInstall,
    promptInstall,
    isIos,
    isSafariBrowser,
    isChromeIos,
  } = useInstall();
  const { toast } = useToast();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + import.meta.env.BASE_URL);
      toast({ title: 'Lien copié', message: 'Collez-le dans Safari sur votre iPhone.', tone: 'success' });
    } catch {
      toast({ title: 'Impossible de copier le lien', tone: 'error' });
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SeatShop',
          text: 'Mon administration de ventes Seatiks',
          url: window.location.origin + import.meta.env.BASE_URL,
        });
      } catch {
        /* cancelled */
      }
    } else {
      await copyLink();
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeInstall}
      title={installed ? 'SeatShop est installée' : 'Installer SeatShop'}
      subtitle={
        installed
          ? 'Vous utilisez déjà la version application.'
          : 'Gratuit, sans App Store. Une vraie PWA, avec notifications.'
      }
      size="sm"
      footer={
        <div className="install-footer">
          {canInstall && !installed ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void promptInstall()}
            >
              <Download size={16} />
              Installer maintenant
            </button>
          ) : null}
          {!isIos && !installed ? (
            <button type="button" className="btn btn-secondary" onClick={() => void copyLink()}>
              <Copy size={16} />
              Copier le lien
            </button>
          ) : null}
          {isIos && !installed ? (
            <button type="button" className="btn btn-secondary" onClick={() => void shareLink()}>
              <Share size={16} />
              Partager le lien
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={closeInstall}>
            Fermer
          </button>
        </div>
      }
    >
      <div className="install-hero">
        <img src={`${import.meta.env.BASE_URL}icons/icon-180.png`} alt="" width={64} height={64} />
        <div>
          <div className="install-hero-title">SeatShop sur votre écran d’accueil</div>
          <div className="install-hero-text">
            Plein écran, démarrage rapide, alertes de vente et son « cha-ching ».
          </div>
        </div>
      </div>

      {installed ? (
        <div className="install-done">
          <span className="install-done-icon">
            <Check size={20} />
          </span>
          <div>
            <strong>C’est déjà fait.</strong>
            <p>SeatShop fonctionne comme une application. Activez les notifications dans les réglages.</p>
          </div>
        </div>
      ) : null}

      {isIos && !installed ? (
        <div className="install-steps">
          {isChromeIos ? (
            <div className="install-warning">
              <Smartphone size={18} />
              <span>
                Vous êtes dans Chrome sur iPhone. Ouvrez d’abord ce lien dans <strong>Safari</strong>{' '}
                pour pouvoir installer l’application.
              </span>
            </div>
          ) : null}
          <div className={`install-step ${isSafariBrowser ? '' : 'is-muted'}`}>
            <span className="install-step-number">1</span>
            <div>
              <strong>Ouvrez cette page dans Safari</strong>
              <p>Sur iPhone, seule Safari peut installer une PWA sur l’écran d’accueil.</p>
            </div>
            <Smartphone size={20} className="install-step-icon" />
          </div>
          <div className="install-step">
            <span className="install-step-number">2</span>
            <div>
              <strong>Touchez le bouton Partager</strong>
              <p>L’icône carrée avec une flèche, en bas de l’écran.</p>
            </div>
            <Share size={20} className="install-step-icon" />
          </div>
          <div className="install-step">
            <span className="install-step-number">3</span>
            <div>
              <strong>« Sur l’écran d’accueil »</strong>
              <p>Faites défiler le menu, puis touchez « Ajouter ».</p>
            </div>
            <PlusSquare size={20} className="install-step-icon" />
          </div>
          <div className="install-step">
            <span className="install-step-number">4</span>
            <div>
              <strong>Ouvrez SeatShop et autorisez les notifications</strong>
              <p>Les notifications iOS nécessitent l’application installée (iOS 16.4+).</p>
            </div>
            <Sparkles size={20} className="install-step-icon" />
          </div>
        </div>
      ) : null}

      {!isIos && !installed && !canInstall ? (
        <div className="install-steps">
          <div className="install-step">
            <span className="install-step-number">1</span>
            <div>
              <strong>Ouvrez le menu du navigateur</strong>
              <p>Chrome, Edge ou Samsung Internet proposent « Installer l’application ».</p>
            </div>
          </div>
          <div className="install-step">
            <span className="install-step-number">2</span>
            <div>
              <strong>Ajoutez SeatShop à l’écran d’accueil</strong>
              <p>L’application s’ouvrira ensuite en plein écran, comme une app native.</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="install-note">
        <Check size={15} />
        <span>
          100 % gratuit, aucune carte bancaire, aucun App Store. Vos données restent sur votre
          appareil.
        </span>
      </div>
    </Modal>
  );
}
