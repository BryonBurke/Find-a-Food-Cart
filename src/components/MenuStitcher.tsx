import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, Plus, Layers, Download, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MenuStitcherProps {
  images: string[];
  onStitch: (stitchedImageUrl: string) => void;
  onClose: () => void;
}

export function MenuStitcher({ images, onStitch, onClose }: MenuStitcherProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>(images);
  const [isStitching, setIsStitching] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...selectedImages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;
    
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
    setSelectedImages(newImages);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleStitch = async () => {
    if (selectedImages.length < 2) return;
    setIsStitching(true);

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Load all images
      const loadedImages = await Promise.all(
        selectedImages.map(url => {
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
          });
        })
      );

      // Calculate total height and max width
      const maxWidth = Math.max(...loadedImages.map(img => img.width));
      const totalHeight = loadedImages.reduce((sum, img) => {
        // Maintain aspect ratio relative to maxWidth
        const aspect = img.height / img.width;
        return sum + (maxWidth * aspect);
      }, 0);

      canvas.width = maxWidth;
      canvas.height = totalHeight;

      let currentY = 0;
      loadedImages.forEach(img => {
        const aspect = img.height / img.width;
        const drawHeight = maxWidth * aspect;
        ctx.drawImage(img, 0, currentY, maxWidth, drawHeight);
        currentY += drawHeight;
      });

      const stitchedUrl = canvas.toDataURL('image/jpeg', 0.8);
      onStitch(stitchedUrl);
      onClose();
    } catch (err) {
      console.error('Stitching failed:', err);
      alert('Failed to stitch images. Please make sure all images are accessible.');
    } finally {
      setIsStitching(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[5000] flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-6 border-bottom border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <Layers size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">Menu Stitcher</h2>
              <p className="text-sm text-stone-500">Combine multiple photos into one long image</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/50">
          {selectedImages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-stone-500">No images selected to stitch.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedImages.map((url, i) => (
                <motion.div 
                  layout
                  key={`${url}-${i}`}
                  className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-stone-200 shadow-sm group"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                    <img src={url} alt={`Menu ${i}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 font-medium text-stone-700">
                    Page {i + 1}
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => moveImage(i, 'up')}
                      disabled={i === 0}
                      className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-900 disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp size={20} />
                    </button>
                    <button 
                      onClick={() => moveImage(i, 'down')}
                      disabled={i === selectedImages.length - 1}
                      className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-900 disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown size={20} />
                    </button>
                    <button 
                      onClick={() => removeImage(i)}
                      className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-stone-100 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl font-bold text-stone-600 hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleStitch}
            disabled={selectedImages.length < 2 || isStitching}
            className="flex-[2] bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isStitching ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Stitching...
              </>
            ) : (
              <>
                <Download size={20} />
                Stitch {selectedImages.length} Images
              </>
            )}
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
