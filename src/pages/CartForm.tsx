import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Camera, File, X, Plus, Trash2 } from 'lucide-react';
import { Cart, Pod } from '../types';
import { useAuth } from '../AuthContext';
import { VoiceInput } from '../components/VoiceInput';
import { CameraInput } from '../components/CameraInput';
import { FileInput } from '../components/FileInput';
import { checkContentSafety } from '../utils';

export default function CartForm() {
  const { user } = useAuth();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const podId = searchParams.get('podId');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const [formData, setFormData] = useState<Partial<Cart>>({
    name: '',
    cuisine: '',
    description: '',
    imageUrl: '',
    gallery: [],
    menu: [],
    openTime: '11:00',
    closeTime: '20:00',
    podId: podId || '',
    socialLinks: { instagram: '', website: '' }
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetch(`/api/carts/${id}`).then(res => res.json()).then(setFormData);
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const safety = await checkContentSafety(`${formData.name || ''} ${formData.description || ''} ${formData.cuisine || ''}`);
      if (safety.isHateful) {
        setErrorMsg(`Content flagged for violating community guidelines: ${safety.reason}`);
        setIsSubmitting(false);
        return;
      }

      const token = await user.getIdToken();
      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit ? `/api/carts/${id}` : '/api/carts';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        const data = await res.json();
        const cartId = isEdit ? id : data.id;
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

  const addMenuItem = () => {
    setFormData(prev => ({
      ...prev,
      menu: [...(prev.menu || []), { name: '', price: '', description: '', imageUrl: '' }]
    }));
  };

  const removeMenuItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      menu: (prev.menu || []).filter((_, i) => i !== index)
    }));
  };

  const updateMenuItem = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      menu: (prev.menu || []).map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
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
            <div>
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
                <VoiceInput onResult={(text) => setFormData(prev => ({ ...prev, name: text }))} className="absolute right-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Cuisine</label>
              <input
                required
                type="text"
                value={formData.cuisine || ''}
                onChange={e => setFormData(prev => ({ ...prev, cuisine: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. BBQ, Thai, Mexican"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Description</label>
            <textarea
              rows={4}
              value={formData.description || ''}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="Tell us about this cart..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Opening Time</label>
              <input
                type="time"
                value={formData.openTime || ''}
                onChange={e => setFormData(prev => ({ ...prev, openTime: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Closing Time</label>
              <input
                type="time"
                value={formData.closeTime || ''}
                onChange={e => setFormData(prev => ({ ...prev, closeTime: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
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
            <label className="block text-sm font-semibold text-stone-700 mb-4">Gallery Images</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {formData.gallery?.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={url} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                  <button onClick={() => setFormData(prev => ({ ...prev, gallery: prev.gallery?.filter((_, idx) => idx !== i) }))} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-lg">
                    <X size={12} />
                  </button>
                </div>
              ))}
              <div className="flex flex-col gap-2">
                <CameraInput onCapture={url => setFormData(prev => ({ ...prev, gallery: [...(prev.gallery || []), url] }))} label="Add" className="h-full text-xs" />
                <FileInput onCapture={url => setFormData(prev => ({ ...prev, gallery: [...(prev.gallery || []), url] }))} label="Add" className="h-full text-xs" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-800">Menu Items</h2>
            <button type="button" onClick={addMenuItem} className="flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700">
              <Plus size={20} />
              <span>Add Item</span>
            </button>
          </div>
          
          <div className="space-y-6">
            {formData.menu?.map((item, i) => (
              <div key={i} className="p-6 bg-stone-50 rounded-2xl border border-stone-100 relative">
                <button type="button" onClick={() => removeMenuItem(i)} className="absolute top-4 right-4 text-stone-400 hover:text-red-500">
                  <Trash2 size={20} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">Item Name</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => updateMenuItem(i, 'name', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">Price</label>
                    <input
                      type="text"
                      value={item.price}
                      onChange={e => updateMenuItem(i, 'price', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-stone-500 mb-1">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => updateMenuItem(i, 'description', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-stone-500 mb-1">Item Photo</label>
                    {item.imageUrl ? (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        <button onClick={() => updateMenuItem(i, 'imageUrl', '')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <CameraInput onCapture={url => updateMenuItem(i, 'imageUrl', url)} label="Photo" className="text-xs py-1" />
                        <FileInput onCapture={url => updateMenuItem(i, 'imageUrl', url)} label="File" className="text-xs py-1" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
