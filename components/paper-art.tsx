export function PaperArt() {
  return (
    <svg
      viewBox="0 0 800 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="pb-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8f5ef" />
          <stop offset="55%" stopColor="#efeae1" />
          <stop offset="100%" stopColor="#e5dfd3" />
        </linearGradient>
        <filter id="pb-sheet" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="14"
            stdDeviation="20"
            floodColor="#3a352a"
            floodOpacity="0.13"
          />
        </filter>
        <filter id="pb-sheet-sm" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="7"
            stdDeviation="11"
            floodColor="#3a352a"
            floodOpacity="0.12"
          />
        </filter>
        <filter id="pb-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width="800" height="1000" fill="url(#pb-bg)" />

      <g filter="url(#pb-sheet)">
        <rect
          x="70"
          y="170"
          width="430"
          height="560"
          rx="10"
          fill="#fdfcf9"
          stroke="#e8e1d4"
          transform="rotate(-7 285 450)"
        />
        <rect
          x="255"
          y="250"
          width="420"
          height="520"
          rx="8"
          fill="#f5f1e9"
          stroke="#e5ddcf"
          transform="rotate(8 465 510)"
        />
        <rect
          x="170"
          y="390"
          width="380"
          height="460"
          rx="9"
          fill="#fffdfa"
          stroke="#eae3d6"
          transform="rotate(-3 360 620)"
        />
      </g>

      <g filter="url(#pb-sheet-sm)">
        <rect
          x="435"
          y="430"
          width="245"
          height="175"
          rx="8"
          fill="#f0ebe1"
          stroke="#e2dacb"
          transform="rotate(12 557 517)"
        />
        <rect
          x="118"
          y="706"
          width="300"
          height="88"
          rx="6"
          fill="#efe9df"
          stroke="#e0d8c8"
          transform="rotate(-18 268 750)"
        />
        <rect
          x="505"
          y="185"
          width="118"
          height="118"
          rx="8"
          fill="#e8e1d4"
          stroke="#dcd3c2"
          transform="rotate(20 564 244)"
        />
      </g>

      {/* curled corner on the front sheet */}
      <path
        d="M470 850 L550 812 L470 812 Z"
        fill="#ffffff"
        opacity="0.85"
        transform="rotate(-3 360 620)"
      />

      <rect
        width="800"
        height="1000"
        filter="url(#pb-grain)"
        opacity="0.2"
        className="mix-blend-multiply"
      />
    </svg>
  );
}