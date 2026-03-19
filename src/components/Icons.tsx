import React from 'react';
import { Navigation } from 'lucide-react';

export const CartIcon = () => (
  <div className="bg-emerald-600 p-1.5 rounded-full shadow-lg border-2 border-white text-white transform hover:scale-110 transition-transform flex items-center justify-center pointer-events-none">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
      <rect x="2" y="4" width="20" height="2" rx="1" />
      <path d="M5 6v8" />
      <path d="M19 6v8" />
      <path d="M5 10h14" />
      <rect x="3" y="14" width="18" height="5" rx="1" />
      <circle cx="8" cy="19" r="3" />
      <circle cx="16" cy="19" r="3" />
      <path d="M8 19h.01" />
      <path d="M16 19h.01" />
      <path d="M21 16h2" />
    </svg>
  </div>
);

const getTwoLineName = (name: string) => {
  const ignoredWords = ['the', 'a', 'an', 'and', 'or', 'our', 'your', 'my', 'of', 'in', 'on', 'at'];
  const words = name.split(' ').filter(w => w.trim() !== '');
  const meaningfulWords = words.filter(w => !ignoredWords.includes(w.toLowerCase().replace(/[^a-z]/g, '')));
  if (meaningfulWords.length >= 2) {
    return meaningfulWords.slice(0, 2).join('\n');
  }
  return meaningfulWords[0] || words[0] || '';
};

export const PodIcon = ({ name, hasOpenCart, isLevel1 }: { name: string, hasOpenCart: boolean, isLevel1: boolean }) => (
  <div 
    className={`bg-violet-600 flex items-center justify-center shadow-lg border-2 ${hasOpenCart ? 'border-green-500' : 'border-white'} text-white transition-all group-hover:scale-110 pointer-events-none ${isLevel1 ? 'w-4 h-4' : 'w-10 h-10'} ${hasOpenCart ? 'ring-4 ring-green-500/80' : ''} animate-pulse`}
  >
    {!isLevel1 && (
      <span className="text-[10px] font-bold text-center leading-tight pointer-events-none whitespace-pre-wrap px-0.5" translate="no">
        {getTwoLineName(name)}
      </span>
    )}
  </div>
);

export const UserIcon = () => (
  <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
);

export const NavArrowIcon = () => (
  <div className="bg-blue-600 p-2 rounded-full shadow-xl border-4 border-white text-white transform">
    <Navigation size={20} className="fill-current" />
  </div>
);
