import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Pod } from '../types';
import { useAuth } from '../AuthContext';
import { useTutorial } from '../TutorialContext';
import { VoiceInput } from '../components/VoiceInput';
import { checkContentSafety } from '../utils';

export default function PodForm() {
  const { user } = useAuth();
  const { nextStep } = useTutorial();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);
  
  const initialLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : 45.523;
  const initialLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : -122.676;

  const [formData, setFormData] = useState<Partial<Pod>>({
    name: '',
    description: '',
    latitude: initialLat,
    longitude: initialLng,
    imageUrl: ''
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetch(`/api/pods/${id}`).then(res => res.json()).then(setFormData);
    }
  }, [id, isEdit]);

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
      const url = isEdit ? `/api/pods/${id}` : '/api/pods';
      
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
        const podId = isEdit ? id : data.id;
        if (!isEdit) {
          nextStep('FILL_POD_FORM', 'CLICK_ADD_CART');
        }
        navigate(`/pod/${podId}`);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to save pod');
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-200 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold">{isEdit ? 'Edit Pod' : 'Add New Pod'}</h1>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Pod Name</label>
          <div className="relative">
            <input
              required
              type="text"
              value={formData.name || ''}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g. Hawthorne Asylum"
            />
            <VoiceInput 
              onResult={(text) => setFormData(prev => ({ ...prev, name: text }))} 
              className="absolute right-2 top-1/2 -translate-y-1/2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Description (Optional)</label>
          <textarea
            rows={4}
            value={formData.description || ''}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            placeholder="Tell us about this pod..."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-200 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Pod')}
        </button>
      </form>
    </div>
  );
}
