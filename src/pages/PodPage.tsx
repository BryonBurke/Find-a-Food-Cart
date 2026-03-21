import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft, Info, Edit2, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
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
  const [showDeletePodConfirm, setShowDeletePodConfirm] = useState(false);
  const [cartToDelete, setCartToDelete] = useState<Cart | null>(null);

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

  useEffect(() => {
    fetchData();
  }, [id]);

  const deletePod = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/pods/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCart = async (cartId: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/carts/${cartId}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setCartToDelete(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

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
      className="h-screen flex flex-col bg-stone-50 overflow-hidden"
    >
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full p-4">
        <AnimatePresence>
          {showDeletePodConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-2xl font-bold mb-4 text-stone-900">Delete Pod?</h3>
                <p className="text-stone-600 mb-8">
                  Are you sure you want to delete <span className="font-bold text-stone-900">"{pod.name}"</span>? 
                  This will delete the pod and all its carts. This action cannot be undone.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={deletePod}
                    className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                  >
                    Yes, Delete Pod
                  </button>
                  <button 
                    onClick={() => setShowDeletePodConfirm(false)}
                    className="w-full bg-stone-100 text-stone-600 py-3 rounded-xl font-bold hover:bg-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {cartToDelete && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-2xl font-bold mb-4 text-stone-900">Delete Cart?</h3>
                <p className="text-stone-600 mb-8">
                  Are you sure you want to delete <span className="font-bold text-stone-900">"{cartToDelete.name}"</span>? 
                  This action cannot be undone.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => deleteCart(cartToDelete.id)}
                    className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                  >
                    Yes, Delete Cart
                  </button>
                  <button 
                    onClick={() => setCartToDelete(null)}
                    className="w-full bg-stone-100 text-stone-600 py-3 rounded-xl font-bold hover:bg-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-shrink-0 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </button>
            {canEdit && editMode && (
              <div className="flex gap-1">
                <button 
                  onClick={() => navigate(`/pod/${id}/edit`)}
                  className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-600"
                >
                  <Edit2 size={20} />
                </button>
                <button 
                  onClick={() => setShowDeletePodConfirm(true)}
                  className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="px-2">
            <h1 className="text-3xl md:text-5xl font-black text-stone-900 tracking-tight leading-tight mb-1">
              {pod.name}
            </h1>
            <div className="text-stone-500 font-medium mb-4 text-sm md:text-base">
              {pod.address}
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => navigate(`/pod/${id}/map`)}
                className="flex-1 bg-black text-white py-3 rounded-full shadow-lg border border-white/10 font-black text-xs md:text-sm uppercase tracking-widest transition-all hover:bg-stone-900 active:scale-[0.98] text-center"
              >
                Map
              </button>
              <button 
                onClick={() => navigate(`/?navTo=${pod.id}`)}
                className="flex-1 bg-black text-white py-3 rounded-full shadow-lg border border-white/10 font-black text-xs md:text-sm uppercase tracking-widest transition-all hover:bg-stone-900 active:scale-[0.98] text-center"
              >
                Directions
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pr-2 -mr-2 scrollbar-hide">
          {pod.description && (
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <Info size={20} className="text-emerald-600" /> About
              </h2>
              <p className="text-stone-600 text-sm leading-relaxed">{pod.description}</p>
            </section>
          )}

          <section className="pb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-900">Food Carts</h2>
              {canEdit && editMode && (
                <button 
                  onClick={() => navigate(`/pod/${id}/cart/new`)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-colors text-sm"
                >
                  <Plus size={16} />
                  <span>Add Cart</span>
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    {(() => {
                      const status = isCartOpen(cart.openTime, cart.closeTime, cart.weeklyHours) ? 'open' : 'closed';
                      return (
                        <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-colors ${
                          status === 'open' ? 'bg-green-500' : 
                          status === 'closed' ? 'bg-red-500' : 
                          'bg-yellow-500'
                        }`}>
                          <span className="text-[10px] font-black text-white uppercase tracking-wider">
                            {status === 'open' ? 'Open' : status === 'closed' ? 'Closed' : 'Unknown'}
                          </span>
                        </div>
                      );
                    })()}
                    {canEdit && editMode && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCartToDelete(cart);
                        }}
                        className="absolute top-4 left-4 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-stone-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-1">
                      {cart.name}
                    </h3>
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
      </div>
    </motion.div>
  );
}
