import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock } from 'lucide-react';

interface ClockPickerProps {
  value: string; // HH:mm format
  onChange: (value: string) => void;
  label: string;
  onClose: () => void;
}

export const ClockPicker: React.FC<ClockPickerProps> = ({ value, onChange, label, onClose }) => {
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);
  const [isAm, setIsAm] = useState(true);
  const [pickingMode, setPickingMode] = useState<'hours' | 'minutes'>('hours');
  
  const clockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        setIsAm(h < 12);
        setHours(h % 12 || 12);
        setMinutes(m);
      }
    }
  }, [value]);

  const updateTime = (newHours: number, newMinutes: number, newIsAm: boolean) => {
    let h = newHours % 12;
    if (!newIsAm) h += 12;
    const timeString = `${h.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    onChange(timeString);
  };

  const handleClockInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!clockRef.current) return;
    
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    // Calculate angle in degrees (0 is top, clockwise)
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    
    if (pickingMode === 'hours') {
      // 15 degrees per half-hour (360 / 24)
      let step = Math.round(angle / 15);
      if (step === 24) step = 0;
      
      let h = Math.floor(step / 2);
      let m = (step % 2) * 30;
      
      if (h === 0) h = 12;
      
      setHours(h);
      setMinutes(m);
      updateTime(h, m, isAm);
    } else {
      // Half hour increments: 360 / 2 = 180 degrees per 30 minutes
      let m = Math.round(angle / 180) * 30;
      if (m === 60) m = 0;
      setMinutes(m);
      updateTime(hours, m, isAm);
    }
  };

  const hourAngle = ((hours % 12) * 30) + (minutes === 30 ? 15 : 0);
  const minuteAngle = minutes * 6;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-1">{label}</h3>
            <div className="flex items-baseline gap-2">
              <button 
                onClick={() => setPickingMode('hours')}
                className={`text-5xl font-black transition-colors ${pickingMode === 'hours' ? 'text-emerald-600' : 'text-stone-300'}`}
              >
                {hours}
              </button>
              <span className="text-4xl font-black text-stone-200">:</span>
              <button 
                onClick={() => setPickingMode('minutes')}
                className={`text-5xl font-black transition-colors ${pickingMode === 'minutes' ? 'text-emerald-600' : 'text-stone-300'}`}
              >
                {minutes.toString().padStart(2, '0')}
              </button>
              <div className="ml-4 flex flex-col gap-1">
                <button 
                  onClick={() => { setIsAm(true); updateTime(hours, minutes, true); }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${isAm ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-stone-100 text-stone-400'}`}
                >
                  AM
                </button>
                <button 
                  onClick={() => { setIsAm(false); updateTime(hours, minutes, false); }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${!isAm ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-stone-100 text-stone-400'}`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="relative aspect-square w-full mb-8">
          {/* Clock Face */}
          <div 
            ref={clockRef}
            className="absolute inset-0 bg-stone-50 rounded-full border-8 border-stone-100 shadow-inner flex items-center justify-center cursor-crosshair touch-none"
            onMouseDown={handleClockInteraction}
            onMouseMove={(e) => e.buttons === 1 && handleClockInteraction(e)}
            onTouchMove={handleClockInteraction}
            onTouchStart={handleClockInteraction}
          >
            {/* Center Dot */}
            <div className="w-4 h-4 bg-emerald-600 rounded-full z-20 shadow-lg" />
            
            {/* Hand */}
            <div 
              className="absolute top-1/2 left-1/2 w-1 bg-emerald-600 origin-bottom z-10 rounded-full transition-all duration-75"
              style={{ 
                height: pickingMode === 'hours' ? '30%' : '40%',
                transform: `translate(-50%, -100%) rotate(${pickingMode === 'hours' ? hourAngle : minuteAngle}deg)`,
                opacity: 0.8
              }}
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-emerald-600 rounded-full shadow-lg flex items-center justify-center text-white text-xs font-bold">
                {pickingMode === 'hours' ? (minutes === 30 ? `${hours}:30` : hours) : minutes}
              </div>
            </div>

            {/* Numbers and Marks */}
            {pickingMode === 'hours' ? (
              <>
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => {
                  const angle = i * 30;
                  return (
                    <React.Fragment key={n}>
                      {/* Hour Number */}
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{ transform: `rotate(${angle}deg)` }}
                      >
                        <span 
                          className={`absolute top-4 left-1/2 -translate-x-1/2 text-sm font-black transition-colors ${hours === n && minutes === 0 ? 'text-emerald-600 scale-125' : 'text-stone-400'}`}
                          style={{ transform: `rotate(-${angle}deg)` }}
                        >
                          {n}
                        </span>
                      </div>
                      {/* Half Hour Mark */}
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{ transform: `rotate(${angle + 15}deg)` }}
                      >
                        <div 
                          className={`absolute top-5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full transition-colors ${hours === n && minutes === 30 ? 'bg-emerald-600 scale-150' : 'bg-stone-200'}`}
                        />
                      </div>
                    </React.Fragment>
                  );
                })}
              </>
            ) : (
              [0, 30].map((n, i) => {
                const angle = n === 0 ? 0 : 180;
                return (
                  <div 
                    key={n}
                    className="absolute inset-0 pointer-events-none"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <span 
                      className={`absolute top-4 left-1/2 -translate-x-1/2 text-sm font-black transition-colors ${minutes === n ? 'text-emerald-600 scale-125' : 'text-stone-400'}`}
                      style={{ transform: `rotate(-${angle}deg)` }}
                    >
                      {n.toString().padStart(2, '0')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-stone-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
        >
          Set Time
        </button>
      </motion.div>
    </motion.div>
  );
};
