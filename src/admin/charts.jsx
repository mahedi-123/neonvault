import { useState } from 'react';
import { money } from './ui.jsx';

/**
 * Revenue by day: bars for revenue, with the hovered day's numbers called
 * out above. One hue, quiet gridlines, values readable without colour.
 */
export function RevenueChart({ series }) {
  const [hover, setHover] = useState(null);
  const W = 720, H = 220, P = { l: 48, r: 8, t: 12, b: 26 };
  const max = Math.max(1, ...series.map((d) => d.revenue));
  const nice = niceMax(max);
  const bw = (W - P.l - P.r) / series.length;
  const y = (v) => P.t + (H - P.t - P.b) * (1 - v / nice);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * nice);
  const active = hover != null ? series[hover] : null;
  const total = series.reduce((s, d) => s + d.revenue, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="text-mute">{active ? new Date(active.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : `Last ${series.length} days`}</span>
        <span className="tabular font-mono text-ink">{money(active ? active.revenue : total, 0)} <span className="text-faint">· {active ? active.orders : series.reduce((s, d) => s + d.orders, 0)} orders</span></span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Revenue per day, total ${money(total, 0)}`} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray={t ? '2 4' : ''} />
            <text x={P.l - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--color-faint)" fontFamily="var(--font-mono)">{short(t)}</text>
          </g>
        ))}
        {series.map((d, i) => {
          const h = Math.max(d.revenue ? 2 : 0, H - P.b - y(d.revenue));
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${d.date}: ${money(d.revenue, 0)}`}>
              <rect x={P.l + i * bw} y={P.t} width={bw} height={H - P.t - P.b} fill="transparent" />
              <rect x={P.l + i * bw + bw * 0.18} y={H - P.b - h} width={bw * 0.64} height={h} rx="3"
                fill="var(--color-accent)" opacity={hover == null || hover === i ? 0.9 : 0.35} />
              {(i % Math.ceil(series.length / 7) === 0 || i === series.length - 1) && (
                <text x={P.l + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-faint)" fontFamily="var(--font-mono)">
                  {d.date.slice(5).replace('-', '/')}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const niceMax = (v) => {
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v) || v;
};
const short = (v) => (v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${Math.round(v)}`);

/** Visit → cart → checkout → order, as proportional bars with step conversion. */
export function Funnel({ steps }) {
  const top = Math.max(1, steps[0]?.value || 0);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const prev = i ? steps[i - 1].value : null;
        const rate = prev != null ? Math.min(100, Math.round((s.value / Math.max(1, prev)) * 100)) : null;
        return (
          <li key={s.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-mute">{s.label}</span>
              <span className="tabular font-mono text-ink">{s.value}{rate != null && <span className="ml-2 text-faint">{rate}%</span>}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-accent" style={{ width: `${(s.value / top) * 100}%`, opacity: 1 - i * 0.15 }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
