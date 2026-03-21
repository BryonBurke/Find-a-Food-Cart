import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Camera, File, X, Plus, Trash2 } from 'lucide-react';
import { Cart, Pod } from '../types';
import { useAuth } from '../AuthContext';
import { VoiceInput } from '../components/VoiceInput';
import { CameraInput } from '../components/CameraInput';
import { FileInput } from '../components/FileInput';
import { ClockPicker } from '../components/ClockPicker';
import { CartHoursTable } from '../components/CartHoursTable';
import { checkContentSafety, getRandomFoodImage } from '../utils';
import { AnimatePresence, motion } from 'motion/react';

export default function CartForm() {
  const { user } = useAuth();
  const { podId, cartId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!cartId;
  const id = cartId || '';

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    imageUrl: '',
    menuGallery: [],
    tags: [],
    openTime: '',
    closeTime: '',
    weeklyHours: {},
    podId: podId || '',
    socialLinks: { instagram: '', website: '' }
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTags, setAvailableTags] = useState<{name: string, tag: string}[]>([]);
  const [showHoursModal, setShowHoursModal] = useState(false);

  useEffect(() => {
    fetch('/api/tags')
      .then(res => res.json())
      .then(data => {
        console.log("CartForm: Fetched tags", data);
        if (Array.isArray(data)) {
          setAvailableTags(data);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isEdit) {
      fetch(`/api/carts/${cartId}`).then(res => res.json()).then(data => {
        let parsedMenuGallery = [];
        if (data.menuGallery) {
          try { parsedMenuGallery = typeof data.menuGallery === 'string' ? JSON.parse(data.menuGallery) : data.menuGallery; } catch(e) {}
        }
        let parsedTags = [];
        if (data.tags) {
          try { parsedTags = typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags; } catch(e) {}
        }
        let parsedWeeklyHours = {};
        if (data.weeklyHours) {
          try { parsedWeeklyHours = typeof data.weeklyHours === 'string' ? JSON.parse(data.weeklyHours) : data.weeklyHours; } catch(e) {}
        }
        setFormData({ ...data, menuGallery: parsedMenuGallery, tags: parsedTags, weeklyHours: parsedWeeklyHours });
      });
    }
  }, [cartId, isEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const safety = await checkContentSafety(`${formData.name || ''} ${formData.description || ''}`);
      if (safety.isHateful) {
        setErrorMsg(`Content flagged for violating community guidelines: ${safety.reason}`);
        setIsSubmitting(false);
        return;
      }

      const token = await user.getIdToken();
      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit ? `/api/carts/${cartId}` : '/api/carts';
      
      const submissionData = { ...formData };
      if (!isEdit && !submissionData.imageUrl) {
        submissionData.imageUrl = getRandomFoodImage(formData.name || 'foodcart');
      }

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      });
      
      if (res.ok) {
        const data = await res.json();
        const cartId = isEdit ? id : data.id;
        window.dispatchEvent(new Event('carts-updated'));
        navigate(`/cart/${cartId}`);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to save cart');
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [newTagName, setNewTagName] = useState('');
  const [newTagCode, setNewTagCode] = useState('');

  const removeFoodTag = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      tags: (prev.tags || []).filter((_: any, i: number) => i !== index)
    }));
  };

  const handleAddCustomTag = () => {
    if (!newTagName.trim() || !newTagCode.trim()) return;
    const tagVal = newTagCode.slice(0, 5).toUpperCase().padEnd(5, ' ');
    const nameVal = newTagName.trim();
    
    setFormData((prev: any) => ({
      ...prev,
      tags: [...(prev.tags || []), { name: nameVal, tag: tagVal }]
    }));

    setAvailableTags(prevTags => {
      const exists = prevTags.some(t => t.name.toLowerCase() === nameVal.toLowerCase() || t.tag.toUpperCase() === tagVal.toUpperCase());
      if (!exists) {
        return [...prevTags, { name: nameVal, tag: tagVal }];
      }
      return prevTags;
    });

    setNewTagName('');
    setNewTagCode('');
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
    <div className="max-w-4xl mx-auto p-6">
      <AnimatePresence>
        {showHoursModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setShowHoursModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                  <Plus size={24} />
                </div>
                <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight">Weekly Hours</h2>
              </div>

              <CartHoursTable 
                hours={formData.weeklyHours || {}} 
                onChange={(newHours) => setFormData((prev: any) => ({ ...prev, weeklyHours: newHours }))} 
              />

              <button
                onClick={() => setShowHoursModal(false)}
                className="w-full mt-8 bg-stone-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-lg"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-200 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold">{isEdit ? 'Edit Cart' : 'Add New Cart'}</h1>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 space-y-6">
          <h2 className="text-xl font-bold text-stone-800">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-stone-700 mb-2">Cart Name</label>
              <div className="relative">
                <input
                  required
                  type="text"
                  value={formData.name || ''}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full pl-4 pr-12 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Matt's BBQ"
                />
                <VoiceInput onResult={(text) => setFormData(prev => ({ ...prev, name: text }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-700 bg-emerald-100/50" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 space-y-6">
          <h2 className="text-xl font-bold text-stone-800">Photos</h2>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-4">Main Image</label>
            {formData.imageUrl ? (
              <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-4">
                <img src={formData.imageUrl} alt="Main" className="w-full h-full object-cover" />
                <button onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full shadow-lg">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-4">
                <CameraInput onCapture={url => setFormData(prev => ({ ...prev, imageUrl: url }))} className="flex-1" />
                <FileInput onCapture={url => setFormData(prev => ({ ...prev, imageUrl: url }))} className="flex-1" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-4">Menu Images</label>
            {formData.menuGallery?.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {formData.menuGallery.map((url: string, i: number) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                    <img src={url} alt={`Menu ${i}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, menuGallery: prev.menuGallery?.filter((_: any, idx: number) => idx !== i) }))} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-lg">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4">
              <CameraInput onCapture={url => setFormData(prev => ({ ...prev, menuGallery: [...(prev.menuGallery || []), url] }))} label="Take Photo" className="flex-1" />
              <FileInput onCapture={url => setFormData(prev => ({ ...prev, menuGallery: [...(prev.menuGallery || []), url] }))} label="Upload File" className="flex-1" />
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-800">Food Tags</h2>
          </div>
          
          <datalist id="available-food-names">
            {availableTags.map((t, index) => (
              <option key={index} value={t.name} />
            ))}
          </datalist>

          {formData.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((item: any, i: number) => (
                <span key={i} className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 border border-emerald-200">
                  {item.name} <span className="opacity-50 text-[10px] uppercase font-mono bg-emerald-200/50 px-1.5 py-0.5 rounded">{item.tag}</span>
                  <button type="button" onClick={() => removeFoodTag(i)} className="hover:text-red-500 transition-colors ml-1 p-0.5 rounded-full hover:bg-red-100">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {availableTags.filter(t => !formData.tags?.some((ft: any) => ft.tag?.toUpperCase() === t.tag?.toUpperCase() || ft.name?.toLowerCase() === t.name?.toLowerCase())).length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-stone-500 mr-1">Suggestions:</span>
              {availableTags
                .filter(t => !formData.tags?.some((ft: any) => ft.tag?.toUpperCase() === t.tag?.toUpperCase() || ft.name?.toLowerCase() === t.name?.toLowerCase()))
                .map((t, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setFormData((prev: any) => ({
                        ...prev,
                        tags: [...(prev.tags || []), { name: t.name, tag: t.tag }]
                      }));
                    }}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-emerald-100 hover:text-emerald-700 text-stone-600 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5"
                  >
                    {t.name} <span className="opacity-50 text-[10px] uppercase font-mono">{t.tag}</span>
                    <Plus size={12} className="ml-0.5 opacity-50" />
                  </button>
                ))}
            </div>
          )}

          <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
            <h3 className="text-sm font-bold text-stone-700 mb-4">Add Custom Tag</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-6">
                <label className="block text-xs font-semibold text-stone-500 mb-1">Full Food Name</label>
                <input
                  type="text"
                  list="available-food-names"
                  value={newTagName}
                  onChange={e => {
                    const val = e.target.value;
                    setNewTagName(val);
                    const existing = availableTags.find(t => t.name.toLowerCase() === val.toLowerCase());
                    if (existing) {
                      setNewTagCode(existing.tag);
                    }
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. Pulled Pork Sandwich"
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-stone-500 mb-1">Tag (Max 5 chars)</label>
                <input
                  type="text"
                  maxLength={5}
                  value={newTagCode}
                  onChange={e => setNewTagCode(e.target.value.slice(0, 5).toUpperCase())}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-mono"
                  placeholder="e.g. PORK "
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  disabled={!newTagName.trim() || !newTagCode.trim()}
                  className="w-full bg-emerald-600 text-white py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-800">Operating Hours</h2>
            <button
              type="button"
              onClick={() => setShowHoursModal(true)}
              className="bg-emerald-100 text-emerald-700 px-6 py-2 rounded-full font-bold text-sm hover:bg-emerald-200 transition-all flex items-center gap-2"
            >
              <Plus size={18} /> Edit Schedule
            </button>
          </div>
          <p className="text-stone-500 text-sm">
            Set custom hours for each day of the week. This helps customers know when you're open.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 space-y-6">
          <h2 className="text-xl font-bold text-stone-800">Description</h2>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">About this cart</label>
            <textarea
              rows={4}
              value={formData.description || ''}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="Tell us about this cart..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-200 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Cart')}
        </button>
      </form>
    </div>
  );
}
