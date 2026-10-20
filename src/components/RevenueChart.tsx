import { useMemo, useState } from 'react';
import { formatMoney } from '../lib/format';

export type RevenuePoint = {
  key: string;
  label: string;
  fullLabel: string;
  value: number;
};

type RevenueChartProps = {
  data: RevenuePoint[];
  currency: string;
  height?: number;
};

export function RevenueChart({ data, currency, height = 196 }: RevenueChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = useMemo(() => Math.max(...data.map((point) => point.value), 1), [data]);
  const total = useMemo(() => data.reduce((sum, point) => sum + point.value, 0), [data]);
  const active = hovered === null ? null : data[hovered];
  const labelEvery = data.length > 14 ? Math.ceil(data.length / 7) : 1;

  return (
    <div className="revenue-chart">
      <div className="chart-summary">
        <div>
          <div className="chart-total">{formatMoney(total, currency)}</div>
          <div className="chart-total-label">
            {active
              ? `${active.fullLabel} · ${formatMoney(active.value, currency)}`
              : 'Chiffre d’affaires sur la période'}
          </div>
        </div>
        <div className="chart-legend">
          <span className="legend-dot" />
          Ventes
        </div>
      </div>

      <div className="chart-plot" style={{ height }}>
        <div className="chart-grid" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="chart-bars" role="img" aria-label="Chiffre d’affaires par jour">
          {data.map((point, index) => {
            const ratio = point.value / max;
            return (
              <button
                key={point.key}
                type="button"
                className={`chart-bar ${hovered === index ? 'is-hovered' : ''} ${
                  point.value === 0 ? 'is-empty' : ''
                }`}
                onPointerEnter={() => setHovered(index)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                onTouchStart={() => setHovered(index)}
                aria-label={`${point.fullLabel} : ${formatMoney(point.value, currency)}`}
              >
                <span
                  className="chart-bar-fill"
                  style={{ height: `${Math.max(ratio * 100, point.value > 0 ? 4 : 1.5)}%` }}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="chart-axis">
        {data.map((point, index) => {
          const show = index % labelEvery === 0 || index === data.length - 1;
          return (
            <span key={point.key} className="chart-axis-label">
              {show ? point.label : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}
