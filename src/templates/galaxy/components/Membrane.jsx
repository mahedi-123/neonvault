/**
 * Organic section divider — a slowly breathing bioluminescent membrane.
 * SVG with SMIL path morphs: no JS, no layout cost, paused by the browser
 * when off screen.
 */
const SHAPES = [
  'M0 40 C 160 10, 320 70, 480 38 S 800 8, 960 40 S 1280 70, 1440 36',
  'M0 34 C 180 66, 340 6, 500 42 S 820 72, 980 30 S 1300 6, 1440 44',
  'M0 44 C 140 18, 300 58, 460 30 S 780 60, 940 44 S 1260 14, 1440 32',
];

const Membrane = ({ flip = false }) => (
  <div className={`nv-membrane ${flip ? 'is-flip' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
      <defs>
        <linearGradient id="nv-mem-g" x1="0" x2="1">
          <stop offset="0" stopColor="#8ab4ff" stopOpacity="0" />
          <stop offset="0.3" stopColor="#8ab4ff" />
          <stop offset="0.6" stopColor="#f0abfc" />
          <stop offset="0.85" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="nv-membrane-glow" d={SHAPES[0]}>
        <animate attributeName="d" dur="14s" repeatCount="indefinite" values={`${SHAPES[0]};${SHAPES[1]};${SHAPES[2]};${SHAPES[0]}`} />
      </path>
      <path className="nv-membrane-line" d={SHAPES[0]}>
        <animate attributeName="d" dur="14s" repeatCount="indefinite" values={`${SHAPES[0]};${SHAPES[1]};${SHAPES[2]};${SHAPES[0]}`} />
      </path>
      <circle r="3" className="nv-membrane-pulse">
        <animateMotion dur="9s" repeatCount="indefinite" path={SHAPES[0]} />
      </circle>
    </svg>
  </div>
);

export default Membrane;
