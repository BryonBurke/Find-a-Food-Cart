import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Star, Map as MapIcon, Navigation, Camera, Info, Globe, Instagram, FileText, X, Edit2, Trash2 } from 'lucide-react';
import { Pod, Cart } from '../types';
import { useAuth } from '../AuthContext';
import { useEditMode } from '../EditModeContext';
import { isCartOpen } from '../utils';

export default function CartPage() {
  const { user } = useAuth();
  const { editMode } = useEditMode();
  const { id } = useParams();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [pod, setPod] = useState<Pod | null>(null);
  const [podCarts, setPodCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/carts/${id}`);
        const data = await res.json();
        setCart(data);

        const podRes = await fetch(`/api/pods/${data.podId}`);
        const podData = await podRes.json();
        setPod(podData);

        const cartsRes = await fetch(`/api/pods/${data.podId}/carts`);
        const cartsData = await cartsRes.json();
        setPodCarts(Array.isArray(cartsData) ? cartsData : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const handleGoToPodMap = () => {
      if (cart?.podId) {
        navigate(`/pod/${cart.podId}`);
      }
    };
    window.addEventListener('go-to-pod-map', handleGoToPodMap);
    return () => window.removeEventListener('go-to-pod-map', handleGoToPodMap);
  }, [cart, navigate]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteCart = async () => {
    console.log("Client: deleteCart called. cart:", !!cart, "user:", !!user);
    if (!cart || !user) {
      console.error("Client: Cannot delete cart. cart or user is missing.");
      return;
    }

    console.log(`Client: Attempting to delete cart ${cart.id}`);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/carts/${cart.id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`Client: Delete request returned status ${res.status}`);
      if (res.ok) {
        navigate(`/pod/${cart.podId}`);
      } else {
        const error = await res.json();
        console.error("Client: Failed to delete cart:", error);
        alert(`Failed to delete cart: ${error.error || 'Unknown error'}`);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error("Delete cart error:", err);
      alert("A network error occurred while trying to delete the cart.");
      setShowDeleteConfirm(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading cart details...</div>;
  if (!cart || cart.error) return <div className="p-8 text-center">Cart not found</div>;

  let menuGallery: string[] = [];
  try {
    if (cart.menuGallery && typeof cart.menuGallery === 'string' && cart.menuGallery.trim() !== '') {
      menuGallery = JSON.parse(cart.menuGallery);
    } else if (Array.isArray(cart.menuGallery)) {
      menuGallery = cart.menuGallery;
    }
    if (!Array.isArray(menuGallery)) menuGallery = [];
  } catch (e) {
    console.error("Failed to parse menuGallery JSON", e);
    menuGallery = [];
  }

  const canEdit = !!user && !user.isAnonymous && (
    !cart.ownerEmail || 
    user.email?.toLowerCase() === cart.ownerEmail || 
    user.email?.toLowerCase() === 'bryonparis@gmail.com'
  );

  const currentIndex = podCarts.findIndex(c => c.id === cart.id);
  const prevCart = currentIndex > 0 ? podCarts[currentIndex - 1] : podCarts[podCarts.length - 1];
  const nextCart = currentIndex < podCarts.length - 1 ? podCarts[currentIndex + 1] : podCarts[0];

  let firstTag = '';
  try {
    const tags = typeof cart.tags === 'string' ? JSON.parse(cart.tags || '[]') : (Array.isArray(cart.tags) ? cart.tags : []);
    if (Array.isArray(tags) && tags.length > 0) {
      firstTag = typeof tags[0] === 'string' ? tags[0] : (tags[0].tag || tags[0].name);
    }
  } catch (e) {}

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full min-h-screen bg-stone-50 pb-[10vh]"
    >
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
              <h3 className="text-2xl font-bold mb-4 text-stone-900">Delete Cart?</h3>
              <p className="text-stone-600 mb-8">
                Are you sure you want to delete <span className="font-bold text-stone-900">"{cart.name}"</span>? 
                This action cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    console.log("Client: Confirmation button clicked");
                    deleteCart();
                  }}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                >
                  Yes, Delete Cart
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

      <div className="relative w-full h-[100dvh] overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 p-[4vmin] md:p-[3vmin] flex items-start justify-between z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
          {/* Top Left: First Food Tag */}
          <div className="w-1/3 flex justify-start pointer-events-auto">
            {firstTag ? (
              <span className="text-white font-bold text-[4vmin] md:text-[2.5vmin] uppercase tracking-widest drop-shadow-md">
                {firstTag}
              </span>
            ) : (
              <button onClick={() => {
                if (cart?.podId) {
                  navigate(`/pod/${cart.podId}`);
                } else {
                  navigate(-1);
                }
              }} className="px-[3vmin] py-[1.5vmin] text-[3vmin] md:text-[1.5vmin] bg-white/20 backdrop-blur-md text-white rounded-[2vmin] font-bold hover:bg-white/30 transition-colors border border-white/20 shadow-sm">
                POD
              </button>
            )}
          </div>

          {/* Top Middle: Name */}
          <div className="w-1/3 flex justify-center pointer-events-auto">
            <h1 className="text-[6vmin] md:text-[5vmin] font-black text-white text-center leading-tight drop-shadow-xl">
              {cart.name}
            </h1>
          </div>

          {/* Top Right: Edit/Delete */}
          <div className="w-1/3 flex justify-end gap-[2vmin] pointer-events-auto">
            {!!user && !!user.uid && !user.isAnonymous && canEdit && editMode && (
              <>
                <button 
                  onClick={() => {
                    if (user) {
                      navigate(`/cart/${id}/edit`);
                    } else {
                      navigate('/login');
                    }
                  }} 
                  className="p-[2vmin] bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-full transition-colors text-white border border-white/20 shadow-sm"
                >
                  <Edit2 className="w-[4vmin] h-[4vmin]" />
                </button>
                <button 
                  onClick={() => {
                    console.log("Client: New delete button clicked");
                    setShowDeleteConfirm(true);
                  }} 
                  className="flex items-center gap-[1vmin] px-[3vmin] py-[1.5vmin] text-[3vmin] md:text-[1.5vmin] bg-red-500/80 backdrop-blur-md text-white rounded-[2vmin] font-bold hover:bg-red-600 transition-colors border border-red-500/50 shadow-sm"
                  title="Delete Cart"
                >
                  <Trash2 className="w-[4vmin] h-[4vmin]" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        <img 
          src={cart.imageUrl || `https://picsum.photos/seed/cart-${cart.id}/1560/2080`} 
          alt={cart.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        
        {podCarts.length > 1 && prevCart && nextCart && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between p-[4vmin] md:p-[6vmin] pointer-events-none">
            {/* Left Slot: Previous Cart */}
            <div className="w-[15%] flex justify-start pointer-events-auto">
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/cart/${prevCart.id}`); }}
                className="bg-black text-white p-[2.5vmin] rounded-full shadow-2xl border border-white/10"
              >
                <ChevronLeft className="w-[6vw] h-[6vw] md:w-[4vmin] md:h-[4vmin]" />
              </button>
            </div>

            {/* Center Slot: Action Buttons */}
            <div className="w-[70%] flex items-center justify-center gap-[2vmin] pointer-events-auto">
              <button 
                onClick={() => {
                  if (menuGallery.length > 0) {
                    setFullscreenImageIndex(0);
                  } else {
                    alert('No menu photos provided for this cart.');
                  }
                }}
                className={`bg-black text-white px-[4vmin] py-[2.5vmin] rounded-full shadow-2xl border border-white/10 font-black text-[3vmin] md:text-[2vmin] uppercase tracking-widest transition-colors hover:bg-stone-900 ${menuGallery.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Menu
              </button>

              <button 
                onClick={() => {
                  if (cart?.podId) {
                    navigate(`/pod/${cart.podId}`);
                  } else {
                    navigate(-1);
                  }
                }} 
                className="bg-black text-white px-[5vmin] py-[3vmin] rounded-full shadow-2xl border border-white/10 font-black text-[4vmin] md:text-[2.5vmin] uppercase tracking-widest transition-colors hover:bg-stone-900"
              >
                POD
              </button>

              {pod && (
                <button 
                  onClick={() => navigate(`/pod/${pod.id}/map?highlight=${cart.id}`)}
                  className="bg-black text-white px-[4vmin] py-[2.5vmin] rounded-full shadow-2xl border border-white/10 font-black text-[3vmin] md:text-[2vmin] uppercase tracking-widest transition-colors hover:bg-stone-900"
                >
                  Map
                </button>
              )}
            </div>

            {/* Right Slot: Next Cart */}
            <div className="w-[15%] flex justify-end pointer-events-auto">
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/cart/${nextCart.id}`); }}
                className="bg-black text-white p-[2.5vmin] rounded-full shadow-2xl border border-white/10"
              >
                <ChevronRight className="w-[6vw] h-[6vw] md:w-[4vmin] md:h-[4vmin]" />
              </button>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
        
        <div className="absolute inset-x-0 bottom-[18vmin] p-[4vmin] md:p-[6vmin] pointer-events-none">
          <div className="flex justify-between items-end pointer-events-auto">
            <div className="flex flex-col gap-[2vmin]">
              <div className="flex items-center gap-[2vmin]">
                {isCartOpen(cart.openTime, cart.closeTime) && (
                  <span className="inline-flex items-center gap-[1vmin] px-[2.5vmin] py-[1vmin] bg-green-500 text-white text-[2.5vmin] md:text-[1.5vmin] font-bold rounded-full uppercase tracking-widest shadow-lg">
                    <span className="w-[1.5vmin] h-[1.5vmin] bg-white rounded-full animate-pulse"></span> Open
                  </span>
                )}
              </div>
              
              {(() => {
                try {
                  const tags = typeof cart.tags === 'string' ? JSON.parse(cart.tags || '[]') : (Array.isArray(cart.tags) ? cart.tags : []);
                  if (Array.isArray(tags) && tags.length > 1) {
                    return (
                      <div className="flex flex-wrap gap-[1.5vmin]">
                        {tags.slice(1).map((t: any, i: number) => (
                          <span key={i} className="bg-white/20 backdrop-blur-sm text-white px-[2vmin] py-[1vmin] rounded-[1.5vmin] text-[2.5vmin] md:text-[1.5vmin] font-mono font-bold border border-white/10" title={t.name}>
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
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-8 mt-4">
        <div className="max-w-2xl space-y-8 mb-8">
          {cart.description && (
            <section className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Info size={24} className="text-emerald-600" /> About
              </h2>
              <p className="text-stone-600 text-lg leading-relaxed">{cart.description}</p>
            </section>
          )}

          {(cart.instagramUrl || cart.websiteUrl) && (
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Globe size={20} className="text-emerald-600" /> Connect
              </h2>
              <div className="space-y-3">
                {cart.instagramUrl && (
                  <a 
                    href={cart.instagramUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-stone-50 transition-colors text-stone-600 hover:text-pink-600"
                  >
                    <Instagram size={20} />
                    <span className="font-medium">Instagram</span>
                  </a>
                )}
                {cart.websiteUrl && (
                  <a 
                    href={cart.websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-stone-50 transition-colors text-stone-600 hover:text-emerald-600"
                  >
                    <Globe size={20} />
                    <span className="font-medium">Website</span>
                  </a>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {fullscreenImageIndex !== null && (
        <div 
          className="fixed inset-0 z-[4000] bg-black flex items-center justify-center cursor-pointer"
          onClick={() => setFullscreenImageIndex(null)}
        >
          {/* Bottom Navigation Row */}
          <div className="absolute bottom-0 left-0 right-0 z-[5001] flex items-center justify-between p-[6vmin] pointer-events-none">
            {/* Left Slot */}
            <div className="w-1/3 flex justify-start pointer-events-auto">
              {menuGallery.length > 1 && (
                <button 
                  className="bg-black text-white p-[3vmin] rounded-full shadow-2xl border border-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenImageIndex((prev) => (prev! - 1 + menuGallery.length) % menuGallery.length);
                  }}
                >
                  <ChevronLeft className="w-[8vw] h-[8vw] md:w-[6vmin] md:h-[6vmin]" />
                </button>
              )}
            </div>
            
            {/* Center Slot */}
            <div className="w-1/3 flex justify-center pointer-events-auto">
              <button 
                className="bg-black text-white p-[3vmin] rounded-full shadow-2xl border border-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenImageIndex(null);
                }}
              >
                <X className="w-[8vw] h-[8vw] md:w-[6vmin] md:h-[6vmin]" />
              </button>
            </div>

            {/* Right Slot */}
            <div className="w-1/3 flex justify-end pointer-events-auto">
              {menuGallery.length > 1 && (
                <button 
                  className="bg-black text-white p-[3vmin] rounded-full shadow-2xl border border-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenImageIndex((prev) => (prev! + 1) % menuGallery.length);
                  }}
                >
                  <ChevronRight className="w-[8vw] h-[8vw] md:w-[6vmin] md:h-[6vmin]" />
                </button>
              )}
            </div>
          </div>

          <img 
            src={menuGallery[fullscreenImageIndex]} 
            alt="Fullscreen Menu" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </motion.div>
  );
}
