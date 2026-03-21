import React, { ChangeEvent, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { uploadFileToStorage } from '../utils';

export function CameraInput({ onCapture, label, className, capture = true }: { onCapture: (url: string) => void, label?: React.ReactNode, className?: string, capture?: boolean }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const url = await uploadFileToStorage(file);
        onCapture(url);
      } catch (err: any) {
        console.error("Error capturing image:", err);
        if (err.message?.includes('CORS') || err.message?.includes('preflight')) {
          alert("Upload blocked by CORS. Please ensure your Firebase Storage bucket allows this domain.");
        } else {
          alert(`Failed to capture image: ${err.message || 'Unknown error'}`);
        }
      } finally {
        setIsUploading(false);
        // Reset the input so the same file can be selected again
        e.target.value = '';
      }
    }
  };

  return (
    <label className={`cursor-pointer flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors text-emerald-700 font-medium ${className} ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}>
      {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
      <span>{isUploading ? 'Uploading...' : (label || 'Take Photo')}</span>
      <input
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        onChange={handleChange}
        className="hidden"
        disabled={isUploading}
      />
    </label>
  );
}
