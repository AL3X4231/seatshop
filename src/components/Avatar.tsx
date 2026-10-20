import { initials } from '../lib/format';

const COLORS = ['#008060', '#2c6ecb', '#7b5cf0', '#b98900', '#d72c0d', '#0e7490', '#9d3fbf'];

function colorFor(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

type AvatarProps = {
  name: string;
  size?: number;
  square?: boolean;
  className?: string;
};

export function Avatar({ name, size = 32, square = false, className = '' }: AvatarProps) {
  const background = colorFor(name || 'SeatShop');
  return (
    <span
      className={`avatar ${square ? 'avatar-square' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        background,
        fontSize: Math.max(10, Math.round(size * 0.36)),
      }}
      aria-hidden="true"
    >
      {initials(name || 'S')}
    </span>
  );
}

export function MarketplaceAvatar({ name, size = 28 }: { name: string; size?: number }) {
  return <Avatar name={name} size={size} square />;
}
