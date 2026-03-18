import React, { ChangeEvent } from 'react';
import { File } from 'lucide-react';
import { fileToDataUrl } from '../utils';

export function FileInput({ onCapture, label, className }: { onCapture: (url: string) => void, label?: React.ReactNode, className?: string }) {
  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await fileToDataUrl(file);
        onCapture(url);
      } catch (err) {
        console.error("Error uploading file:", err);
      }
    }
  };

  return (
    <label className={`cursor-pointer flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors text-emerald-700 font-medium ${className}`}>
      <File size={18} />
      <span>{label || 'Upload File'}</span>
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </label>
  );
}
