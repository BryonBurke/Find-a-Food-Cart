import React from 'react';
import { Navigation } from 'lucide-react';
import { motion } from 'motion/react';

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

export const PodIcon = ({ name, hasOpenCart, isLevel1 }: { name: string, hasOpenCart: boolean, isLevel1: boolean }) => {
  const displayName = getTwoLineName(name);
  return (
    <div 
      draggable={false}
      className={`relative flex flex-col items-center transition-all duration-300 pointer-events-none ${isLevel1 ? 'scale-75' : 'scale-100'}`}
    >
      <div className="relative">
        {/* Literal Industrial Food Cart SVG */}
        <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
          {/* Main Cart Structure - Metallic Silver */}
          <rect x="5" y="30" width="90" height="55" fill="#94A3B8" />
          <rect x="7" y="32" width="86" height="51" fill="#CBD5E1" />
          
          {/* Top Menu Header Strip */}
          <rect x="5" y="30" width="90" height="8" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="0.5" />
          <rect x="8" y="31" width="10" height="6" fill="#EF4444" opacity="0.6" />
          <rect x="19" y="31" width="10" height="6" fill="#F59E0B" opacity="0.6" />
          <rect x="30" y="31" width="10" height="6" fill="#10B981" opacity="0.6" />
          <rect x="41" y="31" width="10" height="6" fill="#3B82F6" opacity="0.6" />

          {/* Left Side Menu Panels */}
          <rect x="7" y="40" width="20" height="43" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="0.5" />
          <rect x="9" y="42" width="16" height="8" fill="#EF4444" opacity="0.4" />
          <rect x="9" y="52" width="16" height="8" fill="#F59E0B" opacity="0.4" />
          <rect x="9" y="62" width="16" height="8" fill="#10B981" opacity="0.4" />
          <rect x="9" y="72" width="16" height="8" fill="#3B82F6" opacity="0.4" />

          {/* Serving Window Area */}
          <rect x="30" y="40" width="40" height="25" fill="#1E293B" />
          <rect x="32" y="42" width="36" height="21" fill="#334155" />
          
          {/* Counter/Ledge */}
          <rect x="28" y="65" width="44" height="3" fill="#64748B" />

          {/* Right Side Menu Panels */}
          <rect x="73" y="40" width="20" height="43" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="0.5" />
          <rect x="75" y="42" width="16" height="12" fill="#EF4444" opacity="0.4" />
          <rect x="75" y="56" width="16" height="12" fill="#F59E0B" opacity="0.4" />
          <rect x="75" y="70" width="16" height="12" fill="#10B981" opacity="0.4" />

          {/* Bottom Graphics Area */}
          <rect x="30" y="70" width="40" height="13" fill="#3B82F6" opacity="0.2" />
          <rect x="32" y="72" width="10" height="9" fill="#3B82F6" opacity="0.5" />
          <rect x="44" y="72" width="10" height="9" fill="#EF4444" opacity="0.5" />

          {/* Wheels - Larger, Industrial */}
          <circle cx="25" cy="88" r="9" fill="#1E293B" />
          <circle cx="75" cy="88" r="9" fill="#1E293B" />
          
          {/* Status Indicator - Blinking green light in the middle of the window */}
          {hasOpenCart && (
            <g>
              <motion.circle 
                cx="50" 
                cy="52" 
                r="8" 
                fill="#22C55E" 
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
              />
              <motion.circle 
                cx="50" 
                cy="52" 
                r="4" 
                fill="#4ADE80" 
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
              />
            </g>
          )}
        </svg>

        {/* Name Label */}
        {!isLevel1 && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-3 py-1 rounded-lg border-2 border-white shadow-2xl whitespace-nowrap z-20 flex flex-col items-center">
            {displayName.split('\n').map((line, i) => (
              <span key={i} className="text-[10px] font-black uppercase tracking-tight leading-none">
                {line}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const UserIcon = () => (
  <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
);

export const NavArrowIcon = () => (
  <div className="relative flex items-center justify-center">
    <div className="bg-blue-600 w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
      <Navigation size={16} className="text-white fill-current" />
    </div>
  </div>
);

export const SimplePodIcon = ({ size = 37, className = "", hasOpenCart = false }: { size?: number, className?: string, hasOpenCart?: boolean }) => (
  <div className={className}>
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main Cart Structure - Metallic Silver */}
      <rect x="5" y="30" width="90" height="55" fill="#94A3B8" />
      <rect x="7" y="32" width="86" height="51" fill="#CBD5E1" />
      
      {/* Top Menu Header Strip */}
      <rect x="5" y="30" width="90" height="8" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="0.5" />
      <rect x="8" y="31" width="10" height="6" fill="#EF4444" opacity="0.6" />
      <rect x="19" y="31" width="10" height="6" fill="#F59E0B" opacity="0.6" />
      <rect x="30" y="31" width="10" height="6" fill="#10B981" opacity="0.6" />
      <rect x="41" y="31" width="10" height="6" fill="#3B82F6" opacity="0.6" />

      {/* Left Side Menu Panels */}
      <rect x="7" y="40" width="20" height="43" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="0.5" />
      <rect x="9" y="42" width="16" height="8" fill="#EF4444" opacity="0.4" />
      <rect x="9" y="52" width="16" height="8" fill="#F59E0B" opacity="0.4" />
      <rect x="9" y="62" width="16" height="8" fill="#10B981" opacity="0.4" />
      <rect x="9" y="72" width="16" height="8" fill="#3B82F6" opacity="0.4" />

      {/* Serving Window Area */}
      <rect x="30" y="40" width="40" height="25" fill="#1E293B" />
      <rect x="32" y="42" width="36" height="21" fill="#334155" />
      
      {/* Counter/Ledge */}
      <rect x="28" y="65" width="44" height="3" fill="#64748B" />

      {/* Right Side Menu Panels */}
      <rect x="73" y="40" width="20" height="43" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="0.5" />
      <rect x="75" y="42" width="16" height="12" fill="#EF4444" opacity="0.4" />
      <rect x="75" y="56" width="16" height="12" fill="#F59E0B" opacity="0.4" />
      <rect x="75" y="70" width="16" height="12" fill="#10B981" opacity="0.4" />

      {/* Bottom Graphics Area */}
      <rect x="30" y="70" width="40" height="13" fill="#3B82F6" opacity="0.2" />
      <rect x="32" y="72" width="10" height="9" fill="#3B82F6" opacity="0.5" />
      <rect x="44" y="72" width="10" height="9" fill="#EF4444" opacity="0.5" />

      {/* Wheels - Larger, Industrial */}
      <circle cx="25" cy="88" r="9" fill="#1E293B" />
      <circle cx="75" cy="88" r="9" fill="#1E293B" />
      
      {/* Status Indicator - Blinking green light in the middle of the window */}
      {hasOpenCart && (
        <g>
          <motion.circle 
            cx="50" 
            cy="52" 
            r="8" 
            fill="#22C55E" 
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
          />
          <motion.circle 
            cx="50" 
            cy="52" 
            r="4" 
            fill="#4ADE80" 
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
          />
        </g>
      )}
    </svg>
  </div>
);

export const ClusterIcon = ({ count, zoomLevel }: { count: number, zoomLevel: number }) => {
  // Base size at zoom 10 is 24px, scales down as we zoom out
  const size = Math.max(8, zoomLevel * 2.4);
  
  return (
    <div className="relative flex items-center justify-center group cursor-pointer">
      <div 
        className="bg-red-600 rounded-full shadow-lg border-2 border-white transition-all duration-300 group-hover:scale-125"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      {zoomLevel > 8 && (
        <div className="absolute -bottom-6 bg-stone-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          {count} PODS
        </div>
      )}
    </div>
  );
};
