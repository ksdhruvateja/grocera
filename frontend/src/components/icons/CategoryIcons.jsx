import React from 'react';

export const DailyEssentialsIcon = ({ className = '' }) => (
  <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="de-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#de-g)" />
    <rect x="18" y="28" width="28" height="16" rx="4" fill="#fff" />
    <rect x="24" y="22" width="16" height="8" rx="3" fill="#e5e7eb" />
    <circle cx="26" cy="36" r="2" fill="#10b981" />
    <circle cx="32" cy="36" r="2" fill="#10b981" />
    <circle cx="38" cy="36" r="2" fill="#10b981" />
  </svg>
);

export const FreshFruitsIcon = ({ className = '' }) => (
  <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ff-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#fb923c" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#ff-g)" />
    <ellipse cx="32" cy="36" rx="12" ry="10" fill="#fef3c7" />
    <path d="M32 20c4 0 6 3 6 6-4-2-8-2-12 0 0-3 2-6 6-6z" fill="#16a34a" />
    <circle cx="28" cy="36" r="1" fill="#f59e0b" />
    <circle cx="36" cy="36" r="1" fill="#f59e0b" />
  </svg>
);

export const IndianVegetablesIcon = ({ className = '' }) => (
  <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="iv-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#84cc16" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#iv-g)" />
    <path d="M20 40c8-10 16-10 24 0-6 4-18 4-24 0z" fill="#065f46" opacity="0.25" />
    <ellipse cx="28" cy="34" rx="6" ry="10" fill="#7c3aed" />
    <rect x="26" y="24" width="4" height="6" rx="2" fill="#22c55e" />
    <ellipse cx="38" cy="34" rx="6" ry="10" fill="#8b5cf6" />
    <rect x="36" y="24" width="4" height="6" rx="2" fill="#22c55e" />
  </svg>
);

export const SpicesMasalasIcon = ({ className = '' }) => (
  <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sm-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#sm-g)" />
    <rect x="22" y="22" width="20" height="20" rx="6" fill="#fff" />
    <path d="M24 40c4-8 12-8 16 0" stroke="#ef4444" strokeWidth="2" fill="none" />
    <circle cx="28" cy="28" r="2" fill="#f59e0b" />
    <circle cx="36" cy="28" r="2" fill="#f59e0b" />
  </svg>
);

export const PoojaItemsIcon = ({ className = '' }) => (
  <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pi-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#fb7185" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#pi-g)" />
    <path d="M32 20c3 3 3 6 0 9-3-3-3-6 0-9z" fill="#f59e0b" />
    <rect x="22" y="34" width="20" height="6" rx="3" fill="#fff" />
    <path d="M24 34h16" stroke="#f59e0b" strokeWidth="2" />
  </svg>
);

export const GodIdolsIcon = ({ className = '' }) => (
  <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gi-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#a78bfa" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#gi-g)" />
    <rect x="22" y="36" width="20" height="6" rx="3" fill="#fff" />
    <path d="M26 36c0-8 12-8 12 0" stroke="#a78bfa" strokeWidth="2" fill="none" />
    <rect x="28" y="26" width="8" height="8" rx="2" fill="#c4b5fd" />
  </svg>
);

export const SeeAllProductsIcon = ({ className = '' }) => (
  <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sa-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#22d3ee" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#sa-g)" />
    <circle cx="32" cy="30" r="8" fill="#fff" />
    <rect x="38" y="36" width="10" height="3" rx="1.5" transform="rotate(45 38 36)" fill="#0ea5e9" />
  </svg>
);
