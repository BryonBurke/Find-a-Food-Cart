import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Heart, FileText, MapPin, Edit2, Trash2, Plus, Utensils, Star } from 'lucide-react';
import { Pod, Cart } from '../types';
import { useAuth } from '../AuthContext';
import { useEditMode } from '../EditModeContext';
import { useTutorial } from '../TutorialContext';
import { isCartOpen } from '../utils';

export default function PodPage() {
  const { user } = useAuth();
  const { editMode } = useEditMode();
  const { nextStep } = useTutorial();
  const { id } = useParams();
  const navigate = useNavigate();
  const [pod, setPod] = useState<Pod | null>(null);
  const [carts, setCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cartToDelete, setCartToDelete] = useState<Cart | null>(null);

  const deleteCart = async (cart: Cart) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/carts/${cart.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCarts(prev => prev.filter(c => c.id !== cart.id));
        setSlideshowIndex(null);
        setCartToDelete(null);
      } else {
        const error = await res.json();
        console.error("Client: Failed to delete cart:", error);
        alert(`Failed to delete cart: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert("A network error occurred while trying to delete the cart.");
    }
  };

  const deletePod = async () => {
    if (!pod || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/pods/${pod.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const podRes = await fetch(`/api/pods/${id}`);
        const podData = await podRes.json();
        setPod(podData);

        const cartsRes = await fetch(`/api/pods/${id}/carts`);
        const cartsData = await cartsRes.json();
        setCarts(Array.isArray(cartsData) ? cartsData : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const [searchParams] = useSearchParams();
  const cartIdParam = searchParams.get('cart');

  useEffect(() => {
    if (cartIdParam && carts.length > 0) {
      const index = carts.findIndex(c => c.id === cartIdParam);
      if (index !== -1) {
        setSlideshowIndex(index);
      }
    }
  }, [cartIdParam, carts]);

  const [selectedCartForMenu, setSelectedCartForMenu] = useState<Cart | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);
  const [menuSlideshowIndex, setMenuSlideshowIndex] = useState<number | null>(null);

  const menuGallery = useMemo(() => {
    if (!selectedCartForMenu) return [];
    try {
      if (selectedCartForMenu.menuGallery && typeof selectedCartForMenu.menuGallery === 'string' && selectedCartForMenu.menuGallery.trim() !== '') {
        const gallery = JSON.parse(selectedCartForMenu.menuGallery);
        return Array.isArray(gallery) ? gallery : [];
      } else if (Array.isArray(selectedCartForMenu.menuGallery)) {
        return selectedCartForMenu.menuGallery;
      }
      return [];
    } catch (e) {
      return [];
    }
  }, [selectedCartForMenu]);


  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % carts.length);
  }, [carts.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + carts.length) % carts.length);
  }, [carts.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail.podId === id) {
        setShowDeleteConfirm(true);
      }
    };
    window.addEventListener('request-delete-pod', handler);
    return () => window.removeEventListener('request-delete-pod', handler);
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading pod details...</div>;
  if (!pod) return <div className="p-8 text-center">Pod not found</div>;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen"
      style={{ backgroundColor: '#627D8C' }}
    >
      <div className="max-w-7xl mx-auto p-4 pb-24">
      <AnimatePresence>
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
                  onClick={() => deleteCart(cartToDelete)}
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

      <AnimatePresence>
        {showDeleteConfirm && (
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
                This will also delete all carts associated with this pod. This action cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={deletePod}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                >
                  Yes, Delete Everything
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full bg-stone-100 text-stone-600 py-3 rounded-xl font-bold hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCartForMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[4000] flex items-center justify-center p-4"
            onClick={() => setSelectedCartForMenu(null)}
          >
            <div 
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">{selectedCartForMenu.name} Menu</h2>
                </div>
                <button 
                  onClick={() => setSelectedCartForMenu(null)}
                  className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-500"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {menuGallery.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {menuGallery.map((url, idx) => (
                      <img 
                        key={idx} 
                        src={url} 
                        alt={`Menu page ${idx + 1}`} 
                        className="w-full rounded-xl shadow-sm border border-stone-100 cursor-pointer hover:opacity-80 transition-opacity"
                        referrerPolicy="no-referrer"
                        onClick={() => setMenuSlideshowIndex(idx)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText size={48} className="mx-auto text-stone-300 mb-4" />
                    <p className="text-stone-500 text-lg">No menu photos available for this cart.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuSlideshowIndex !== null && selectedCartForMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[5000] flex items-center justify-center"
            onClick={() => setMenuSlideshowIndex(null)}
          >
          <button 
            className="absolute top-[150px] right-4 bg-black text-white p-2 rounded-full shadow-lg transition-colors z-[5001]"
            onClick={() => { setMenuSlideshowIndex(null); setSelectedCartForMenu(null); }}
          >
            <X size={32} />
          </button>
          <button 
            className="absolute top-[150px] left-4 bg-black text-white px-4 py-2 rounded-full shadow-lg transition-colors z-[5001] font-bold"
            onClick={() => { setMenuSlideshowIndex(null); setSelectedCartForMenu(null); }}
          >
            Done
          </button>
            {menuGallery.length > 1 && (
              <>
                <button 
                  className="absolute left-4 bg-black text-white p-4 rounded-full shadow-lg transition-colors z-[5001]"
                  onClick={(e) => { e.stopPropagation(); setMenuSlideshowIndex((prev) => (prev! - 1 + menuGallery.length) % menuGallery.length); }}
                >
                  <ChevronLeft size={48} />
                </button>
                <button 
                  className="absolute right-4 bg-black text-white p-4 rounded-full shadow-lg transition-colors z-[5001]"
                  onClick={(e) => { e.stopPropagation(); setMenuSlideshowIndex((prev) => (prev! + 1) % menuGallery.length); }}
                >
                  <ChevronRight size={48} />
                </button>
              </>
            )}
            
            <img 
              src={menuGallery[menuSlideshowIndex]}
              alt={`Menu page ${menuSlideshowIndex + 1}`}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {slideshowIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pt-[72px] p-4 sm:p-6 pb-8 bg-black z-[1500] flex items-center justify-center"
            onClick={() => setSlideshowIndex(null)}
          >
            <div className="bg-black rounded-3xl w-full h-full relative overflow-hidden shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
              <button 
                className="absolute top-[150px] right-4 bg-black text-white p-2 rounded-full shadow-lg transition-colors z-[5001]"
                onClick={() => setSlideshowIndex(null)}
              >
                <X size={32} />
              </button>
              {carts.length > 1 && (
                <>
                  <button 
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black text-white p-4 rounded-full shadow-lg transition-colors z-[5001]"
                    onClick={(e) => { e.stopPropagation(); setSlideshowIndex((prev) => (prev! - 1 + carts.length) % carts.length); }}
                  >
                    <ChevronLeft size={48} />
                  </button>
                  <button 
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black text-white p-4 rounded-full shadow-lg transition-colors z-[5001]"
                    onClick={(e) => { e.stopPropagation(); setSlideshowIndex((prev) => (prev! + 1) % carts.length); }}
                  >
                    <ChevronRight size={48} />
                  </button>
                </>
              )}
              
              <img 
                src={carts[slideshowIndex].imageUrl || `https://picsum.photos/seed/cart-${carts[slideshowIndex].id}/800/600`}
                alt={carts[slideshowIndex].name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white flex flex-col items-center z-[5001]">
                <h2 className="text-2xl sm:text-4xl font-bold">{carts[slideshowIndex].name}</h2>
                <p className="text-stone-300 mt-1 text-sm sm:text-lg max-w-2xl text-center">{carts[slideshowIndex].description}</p>
                
                <div className="flex flex-wrap gap-3 mt-4 justify-center">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedCartForMenu(carts[slideshowIndex]); setMenuSlideshowIndex(0); setSlideshowIndex(null); }}
                    className="bg-white text-black px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-200 transition-colors text-sm sm:text-base"
                  >
                    <FileText size={18} /> Menu
                  </button>
                  {carts.length > 1 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/pod/${carts[slideshowIndex].podId}/map?highlight=${carts[slideshowIndex].id}`); setSlideshowIndex(null); }}
                      className="bg-emerald-600 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-colors text-sm sm:text-base"
                    >
                      <MapPin size={18} /> Pod Map
                    </button>
                  )}
                  {!!user && !!user.uid && !user.isAnonymous && editMode && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/cart/${carts[slideshowIndex].id}/edit`); setSlideshowIndex(null); }}
                        className="bg-blue-600 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors text-sm sm:text-base"
                      >
                        <Edit2 size={18} /> Edit
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCartToDelete(carts[slideshowIndex]); }}
                        className="bg-red-600 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500 transition-colors text-sm sm:text-base"
                      >
                        <Trash2 size={18} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black bg-gradient-to-br from-slate-200 via-slate-400 to-slate-200 bg-clip-text text-transparent drop-shadow-lg truncate">{pod.name}</h1>
            <p className="text-stone-500 font-medium truncate">
              {pod.address}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {editMode && user && (
            <div className="flex gap-2 mr-2">
              <button 
                onClick={() => {
                  nextStep('CLICK_ADD_CART', 'FILL_CART_FORM');
                  navigate(`/pod/${pod.id}/cart/new`);
                }}
                className="bg-emerald-600 text-white p-2 rounded-xl shadow-lg hover:bg-emerald-500 transition-colors flex items-center gap-2 text-xs font-bold"
                title="Add Cart"
              >
                <Plus size={18} /> <span className="hidden sm:inline">Add Cart</span>
              </button>
              <button 
                onClick={() => navigate(`/pod/${pod.id}/edit`)}
                className="bg-stone-900 text-white p-2 rounded-xl shadow-lg hover:bg-stone-800 transition-colors flex items-center gap-2 text-xs font-bold"
                title="Edit Pod"
              >
                <Edit2 size={18} /> <span className="hidden sm:inline">Edit Pod</span>
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 text-white p-2 rounded-xl shadow-lg hover:bg-red-500 transition-colors flex items-center gap-2 text-xs font-bold"
                title="Delete Pod"
              >
                <Trash2 size={18} /> <span className="hidden sm:inline">Delete Pod</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {carts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {carts.map((cart) => (
            <div 
              key={cart.id} 
              onClick={() => setSlideshowIndex(carts.indexOf(cart))}
              className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col cursor-pointer"
            >
              <div className="relative h-48 sm:h-56 overflow-hidden">
                <img 
                  src={cart.imageUrl || `https://picsum.photos/seed/cart-${cart.id}/800/600`} 
                  alt={cart.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  {isCartOpen(cart.openTime, cart.closeTime) && (
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> Open
                    </span>
                  )}
                </div>
                {(() => {
                  try {
                    const tags = JSON.parse(cart.tags || '[]');
                    if (Array.isArray(tags) && tags.length > 0) {
                      return (
                        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((t, i) => (
                            <span key={i} className="bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-white/20" title={t.name}>
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
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-stone-900 group-hover:text-emerald-600 transition-colors line-clamp-1">{cart.name}</h3>
                  <div className="flex items-center gap-1 text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                    <Star size={14} fill="currentColor" />
                    <span className="text-sm">{cart.rating}</span>
                  </div>
                </div>
                <p className="text-stone-500 text-sm line-clamp-2 mb-4 flex-1">{cart.description}</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-stone-100">
                  <div className="text-xs text-stone-400 font-medium">
                    {cart.openTime && cart.closeTime ? `${cart.openTime} - ${cart.closeTime}` : 'Hours vary'}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCartForMenu(cart);
                        setMenuSlideshowIndex(0);
                      }}
                      className="text-stone-600 hover:text-stone-900 font-bold text-sm flex items-center gap-1 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <FileText size={14} /> Menu
                    </button>
                    {carts.length > 1 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/pod/${pod.id}/map?highlight=${cart.id}`);
                        }}
                        className="text-emerald-600 hover:text-emerald-700 font-bold text-sm flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <MapPin size={14} /> Pod Map
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-100 shadow-sm">
          <Utensils size={48} className="mx-auto text-stone-300 mb-4" />
          <h3 className="text-xl font-bold text-stone-900 mb-2">No carts yet</h3>
          <p className="text-stone-500 mb-6 max-w-md mx-auto">This pod is empty. Be the first to add a food cart to this location!</p>
          {user && (
            <Link 
              to={`/pod/${id}/cart/new`}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-200"
            >
              <Plus size={20} /> Add a Cart
            </Link>
          )}
        </div>
      )}
      </div>
    </motion.div>
  );
}
