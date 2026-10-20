import { Link } from 'react-router-dom';

type LogoProps = {
  size?: number;
  withText?: boolean;
  to?: string;
  compact?: boolean;
};

export function Logo({ size = 36, withText = true, to = '/', compact = false }: LogoProps) {
  const image = (
    <img
      className="logo-mark"
      src={`${import.meta.env.BASE_URL}icons/icon-180.png`}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );

  const content = (
    <span className={`logo ${compact ? 'logo-compact' : ''}`}>
      {image}
      {withText ? (
        <span className="logo-text">
          <span className="logo-name">SeatShop</span>
          {!compact ? <span className="logo-sub">SEATIKS SELLER</span> : null}
        </span>
      ) : null}
    </span>
  );

  if (!to) return content;
  return (
    <Link to={to} className="logo-link" aria-label="SeatShop — accueil">
      {content}
    </Link>
  );
}
