import React from 'react';

interface TechDanaLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const TechDanaLogo: React.FC<TechDanaLogoProps> = ({
  size = 48,
  className = '',
  showText = false
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* SVG Emblem reproducing the exact circular TechDana logo */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 drop-shadow-sm select-none"
      >
        {/* Background Circle */}
        <circle cx="100" cy="100" r="96" fill="#FFFFFF" />

        {/* Dual-color Outer Ring (Navy on Left, Orange on Right) */}
        {/* Left half (Navy Blue) */}
        <path
          d="M 100 8 A 92 92 0 0 0 100 192 L 100 180 A 80 80 0 0 1 100 20 Z"
          fill="#0D2146"
        />
        {/* Right half (Vibrant Orange) */}
        <path
          d="M 100 8 A 92 92 0 0 1 100 192 L 100 180 A 80 80 0 0 0 100 20 Z"
          fill="#FF6A00"
        />

        {/* Inner Subtle Ring Divider */}
        <circle cx="100" cy="100" r="76" stroke="#E2E8F0" strokeWidth="1.5" fill="none" />

        {/* Central Geometric 3-Pillar Hexagon Symbol */}
        <g transform="translate(100, 92) scale(0.9) translate(-100, -92)">
          {/* Left Wing / Pillar (Navy Blue) */}
          <path
            d="M 58 48 L 82 34 L 82 110 L 70 117 L 58 110 Z"
            fill="#0D2146"
          />
          {/* Center Left Pillar (Navy Blue) */}
          <path
            d="M 88 56 L 97 51 L 97 125 L 88 120 Z"
            fill="#0D2146"
          />
          {/* Center Right Pillar (Vibrant Orange) */}
          <path
            d="M 103 51 L 112 56 L 112 120 L 103 125 Z"
            fill="#FF6A00"
          />
          {/* Right Wing / Pillar (Vibrant Orange) */}
          <path
            d="M 118 34 L 142 48 L 142 110 L 130 117 L 118 110 Z"
            fill="#FF6A00"
          />
        </g>

        {/* Brand Text "تک دانا" stylization */}
        <text
          x="100"
          y="152"
          textAnchor="middle"
          fontSize="24"
          fontWeight="900"
          fontFamily="'Vazirmatn', sans-serif"
          fill="#0D2146"
          letterSpacing="0.5"
        >
          تـک‌دانـا
        </text>

        {/* Signature Orange Dot */}
        <circle cx="105" cy="135" r="3.5" fill="#FF6A00" />

        {/* Thin baseline divider */}
        <line x1="60" y1="160" x2="92" y2="160" stroke="#0D2146" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="100" cy="160" r="2.5" fill="#FF6A00" />
        <line x1="108" y1="160" x2="140" y2="160" stroke="#FF6A00" strokeWidth="1.5" strokeLinecap="round" />

        {/* Three Value Icons indicators at the bottom */}
        {/* Search / کشف */}
        <circle cx="68" cy="176" r="7" stroke="#0D2146" strokeWidth="1.2" fill="#F8FAFC" />
        <path d="M 66 174 L 69 177 M 69 177 L 72 180" stroke="#0D2146" strokeWidth="1.2" strokeLinecap="round" />

        {/* Lightbulb / یادگیری */}
        <circle cx="100" cy="176" r="7" stroke="#FF6A00" strokeWidth="1.2" fill="#FFF7ED" />
        <circle cx="100" cy="175" r="2.5" fill="#FF6A00" />

        {/* Rocket / نوآوری */}
        <circle cx="132" cy="176" r="7" stroke="#0D2146" strokeWidth="1.2" fill="#F8FAFC" />
        <path d="M 132 172 L 134 176 L 130 176 Z" fill="#0D2146" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black text-[#0D2146] tracking-tight">
              TechDana
            </span>
            <span className="text-xs font-bold text-[#FF6A00]">
              تک‌دانا
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            کشف • یادگیری • نوآوری
          </span>
        </div>
      )}
    </div>
  );
};
