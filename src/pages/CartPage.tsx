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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-4 pb-24"
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

      <div className="flex items-center justify-between mb-6">
        <button onClick={() => {
          if (cart?.podId) {
            navigate(`/pod/${cart.podId}`);
          } else {
            navigate(-1);
          }
        }} className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors">
          POD
        </button>
        <div className="flex gap-2">
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
                className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-600"
              >
                <Edit2 size={20} />
              </button>
              <button 
                onClick={() => {
                  console.log("Client: New delete button clicked");
                  setShowDeleteConfirm(true);
                }} 
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors border border-red-200"
                title="Delete Cart"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden mb-8 shadow-2xl group">
        <img 
          src={cart.imageUrl || `https://picsum.photos/seed/cart-${cart.id}/1560/2080`} 
          alt={cart.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        
        {podCarts.length > 1 && prevCart && nextCart && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/cart/${prevCart.id}`); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur-md transition-all z-10 opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft size={32} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/cart/${nextCart.id}`); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur-md transition-all z-10 opacity-0 group-hover:opacity-100"
            >
              <ChevronRight size={32} />
            </button>
          </>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 pointer-events-none">
          <div className="flex justify-between items-end pointer-events-auto">
            <div>
              <div className="flex items-center gap-2 mb-3">
                {isCartOpen(cart.openTime, cart.closeTime) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full uppercase tracking-widest shadow-lg">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> Open
                  </span>
                )}
              </div>
              <h1 className="text-5xl font-black text-white mb-2">{cart.name}</h1>
              {(() => {
                try {
                  const tags = typeof cart.tags === 'string' ? JSON.parse(cart.tags || '[]') : (Array.isArray(cart.tags) ? cart.tags : []);
                  if (Array.isArray(tags) && tags.length > 0) {
                    return (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {tags.map((t: any, i: number) => (
                          <span key={i} className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-mono font-bold border border-white/10" title={t.name}>
                            {typeof t === 'string' ? t.toUpperCase() : (t.tag || t.name).toUpperCase()}
                          </span>
                        ))}
                      </div>
                    );
                  }
                } catch (e) {}
                return null;
              })()}
              <div className="flex items-center gap-4 text-stone-200">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star size={20} fill="currentColor" />
                  <span className="font-bold text-lg">{cart.rating}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pointer-events-auto">
              <button 
                onClick={() => {
                  if (menuGallery.length > 0) {
                    setFullscreenImageIndex(0);
                  } else {
                    alert('No menu photos provided for this cart.');
                  }
                }}
                className={`bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium border border-white/20 shadow-sm ${menuGallery.length === 0 ? 'opacity-50' : ''}`}
              >
                <FileText size={18} />
                Menu
              </button>
              {pod && (
                <button 
                  onClick={() => navigate(`/pod/${pod.id}/map?highlight=${cart.id}`)}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium border border-white/20 shadow-sm"
                >
                  <MapIcon size={18} />
                  Pod Map
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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

      {fullscreenImageIndex !== null && (
        <div 
          className="fixed inset-0 z-[4000] bg-black flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setFullscreenImageIndex(null)}
        >
          <button 
            className="absolute top-[150px] right-4 bg-black text-white p-2 rounded-full shadow-lg transition-colors z-[5001]"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenImageIndex(null);
            }}
          >
            <X size={32} />
          </button>

          {menuGallery.length > 1 && (
            <>
              <button 
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black text-white p-4 rounded-full shadow-lg transition-colors z-[5001]"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenImageIndex((prev) => (prev! - 1 + menuGallery.length) % menuGallery.length);
                }}
              >
                <ChevronLeft size={48} />
              </button>
              <button 
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black text-white p-4 rounded-full shadow-lg transition-colors z-[5001]"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenImageIndex((prev) => (prev! + 1) % menuGallery.length);
                }}
              >
                <ChevronRight size={48} />
              </button>
            </>
          )}

          <img 
            src={menuGallery[fullscreenImageIndex]} 
            alt="Fullscreen Menu" 
            className="max-w-full max-h-full object-contain rounded-lg"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </motion.div>
  );
}
