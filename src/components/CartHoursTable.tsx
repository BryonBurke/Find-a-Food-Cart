import React, { useState } from 'react';
import { Clock, X, Plus } from 'lucide-react';
import { ClockPicker } from './ClockPicker';
import { AnimatePresence } from 'motion/react';

interface DayHours {
  open: string;
  close: string;
  closed?: boolean;
}

interface CartHoursTableProps {
  hours: { [key: string]: DayHours };
  onChange: (hours: { [key: string]: DayHours }) => void;
}

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const CartHoursTable: React.FC<CartHoursTableProps> = ({ hours, onChange }) => {
  const [picking, setPicking] = useState<{ day: string; field: 'open' | 'close' } | null>(null);

  const handleDayChange = (day: string, field: keyof DayHours, value: any) => {
    const newHours = { ...hours };
    if (!newHours[day]) {
      newHours[day] = { open: '09:00', close: '17:00', closed: false };
    }
    newHours[day] = { ...newHours[day], [field]: value };
    onChange(newHours);
  };

  const toggleClosed = (day: string) => {
    const newHours = { ...hours };
    const current = newHours[day] || { open: '09:00', close: '17:00', closed: false };
    newHours[day] = { ...current, closed: !current.closed };
    onChange(newHours);
  };

  const formatTime = (time?: string) => {
    if (!time) return 'Set Time';
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return time;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    const m = minutes.toString().padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  };

  return (
    <div className="overflow-x-auto">
      <AnimatePresence>
        {picking && (
          <ClockPicker
            label={`${picking.day} ${picking.field === 'open' ? 'Opening' : 'Closing'} Time`}
            value={hours[picking.day]?.[picking.field] || ''}
            onChange={(val) => handleDayChange(picking.day, picking.field, val)}
            onClose={() => setPicking(null)}
          />
        )}
      </AnimatePresence>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-stone-100">
            <th className="py-3 px-4 text-xs font-black text-stone-400 uppercase tracking-widest">Day</th>
            <th className="py-3 px-4 text-xs font-black text-stone-400 uppercase tracking-widest">Open</th>
            <th className="py-3 px-4 text-xs font-black text-stone-400 uppercase tracking-widest">Close</th>
            <th className="py-3 px-4 text-xs font-black text-stone-400 uppercase tracking-widest text-center">Closed</th>
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => {
            const dayData = hours[day] || { open: '', close: '', closed: false };
            return (
              <tr key={day} className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                <td className="py-4 px-4 font-bold text-stone-700">{day}</td>
                <td className="py-4 px-4">
                  <button
                    type="button"
                    disabled={dayData.closed}
                    onClick={() => setPicking({ day, field: 'open' })}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-900 font-bold text-sm hover:bg-emerald-100 transition-all text-left flex items-center justify-between disabled:opacity-30 disabled:bg-stone-100 disabled:border-stone-200"
                  >
                    {formatTime(dayData.open)}
                    {!dayData.closed && <Plus size={14} className="text-emerald-400" />}
                  </button>
                </td>
                <td className="py-4 px-4">
                  <button
                    type="button"
                    disabled={dayData.closed}
                    onClick={() => setPicking({ day, field: 'close' })}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-900 font-bold text-sm hover:bg-emerald-100 transition-all text-left flex items-center justify-between disabled:opacity-30 disabled:bg-stone-100 disabled:border-stone-200"
                  >
                    {formatTime(dayData.close)}
                    {!dayData.closed && <Plus size={14} className="text-emerald-400" />}
                  </button>
                </td>
                <td className="py-4 px-4 text-center">
                  <button
                    type="button"
                    onClick={() => toggleClosed(day)}
                    className={`p-2 rounded-lg transition-all ${
                      dayData.closed 
                        ? 'bg-red-100 text-red-600 shadow-inner' 
                        : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                    }`}
                  >
                    {dayData.closed ? <X size={20} /> : <Clock size={20} />}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
