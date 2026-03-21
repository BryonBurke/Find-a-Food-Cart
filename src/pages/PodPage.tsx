import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft, MapPin, Navigation, Map as MapIcon, Star, Info, Edit2, Plus } from 'lucide-react';
import { Pod, Cart } from '../types';
import { useAuth } from '../AuthContext';
import { useEditMode } from '../EditModeContext';
import { isCartOpen } from '../utils';

export default function PodPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const highlightTag = searchParams.get('highlightTag');
  const { user } = useAuth();
  const { editMode } = useEditMode();
  const [pod, setPod] = useState<Pod | null>(null);
  const [carts, setCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [podRes, cartsRes] = await Promise.all([
          fetch(`/api/pods/${id}`),
          fetch(`/api/pods/${id}/carts`)
        ]);
        
        if (!podRes.ok) throw new Error('Pod not found');
        
        const podData = await podRes.json();
        const cartsData = await cartsRes.json();
        
        setPod(podData);
        setCarts(Array.isArray(cartsData) ? cartsData : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading pod details...</div>;
  if (!pod) return <div className="p-8 text-center">Pod not found</div>;

  const canEdit = !!user && !user.isAnonymous && (
    !pod.ownerEmail || 
    user.email?.toLowerCase() === pod.ownerEmail || 
    user.email?.toLowerCase() === 'bryonparis@gmail.com'
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-4 pb-24"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-stone-900 tracking-tight">{pod.name}</h1>
            <div className="flex items-center gap-1.5 text-stone-500 font-medium mt-1">
              <MapPin size={16} className="text-emerald-500" />
              {pod.address}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && editMode && (
            <button 
              onClick={() => navigate(`/pod/${id}/edit`)}
              className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-600"
            >
              <Edit2 size={20} />
            </button>
          )}
          <button 
            onClick={() => navigate(`/pod/${id}/map`)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors shadow-lg"
          >
            <MapIcon size={18} />
            <span className="hidden sm:inline">Pod Map</span>
          </button>
          <button 
            onClick={() => navigate(`/?navTo=${pod.id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg"
          >
            <Navigation size={18} />
            <span className="hidden sm:inline">Directions</span>
          </button>
        </div>
      </div>

      <div className="space-y-8 mb-8">
        {pod.description && (
          <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-stone-100">
            <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
              <Info size={24} className="text-emerald-600" /> About
            </h2>
            <p className="text-stone-600 text-base md:text-lg leading-relaxed">{pod.description}</p>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-stone-900">Food Carts</h2>
            {canEdit && editMode && (
              <button 
                onClick={() => navigate(`/pod/${id}/cart/new`)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-colors"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add Cart</span>
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {carts.map(cart => {
                const isHighlighted = highlightId === cart.id || 
                  (highlightTag && cart.tags && (
                    typeof cart.tags === 'string' 
                      ? cart.tags.toLowerCase().includes(highlightTag.toLowerCase())
                      : Array.isArray(cart.tags) && cart.tags.some(t => 
                          (typeof t === 'string' ? t : t.name || t.tag || '').toLowerCase().includes(highlightTag.toLowerCase())
                        )
                  ));

                return (
                <div 
                  key={cart.id}
                  onClick={() => navigate(`/cart/${cart.id}`)}
                  className={`bg-white rounded-3xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col ${isHighlighted ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-stone-100 hover:border-emerald-200'}`}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
                    <img 
                      src={cart.imageUrl || `https://picsum.photos/seed/cart-${cart.id}/600/450`} 
                      alt={cart.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    {isCartOpen(cart.openTime, cart.closeTime) && (
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Open</span>
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-stone-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-1">
                      {cart.name}
                    </h3>
                    <div className="flex items-center gap-1 text-amber-400 mb-4">
                      <Star size={18} fill="currentColor" />
                      <span className="font-bold text-stone-700">{cart.rating}</span>
                    </div>
                    {(() => {
                      try {
                        const tags = typeof cart.tags === 'string' ? JSON.parse(cart.tags || '[]') : (Array.isArray(cart.tags) ? cart.tags : []);
                        if (Array.isArray(tags) && tags.length > 0) {
                          return (
                            <div className="flex flex-wrap gap-1.5 mt-auto">
                              {tags.slice(0, 3).map((t: any, i: number) => (
                                <span key={i} className="bg-stone-100 text-stone-600 px-2 py-1 rounded-lg text-[10px] font-mono font-bold border border-stone-200" title={t.name}>
                                  {typeof t === 'string' ? t.toUpperCase() : (t.tag || t.name).toUpperCase()}
                                </span>
                              ))}
                            </div>
                          );
                        }
                      } catch (e) {}
                      return null;
                    })()}
                  </div>
                </div>
              )})}
              {carts.length === 0 && (
                <div className="col-span-full text-center py-12 bg-stone-50 rounded-2xl border border-stone-100 border-dashed">
                  <p className="text-stone-500 font-medium">No carts added to this pod yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>
    </motion.div>
  );
}
