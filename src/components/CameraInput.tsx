import React, { ChangeEvent } from 'react';
import { Camera } from 'lucide-react';
import { fileToDataUrl } from '../utils';

export function CameraInput({ onCapture, label, className, capture = true }: { onCapture: (url: string) => void, label?: React.ReactNode, className?: string, capture?: boolean }) {
  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await fileToDataUrl(file);
        onCapture(url);
      } catch (err) {
        console.error("Error capturing image:", err);
      }
    }
  };

  return (
    <label className={`cursor-pointer flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors text-emerald-700 font-medium ${className}`}>
      <Camera size={18} />
      <span>{label || 'Take Photo'}</span>
      <input
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        onChange={handleChange}
        className="hidden"
      />
    </label>
  );
}
