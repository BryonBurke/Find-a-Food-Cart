import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Star, Info, Utensils } from 'lucide-react';
import { Cart } from '../types';
import { useAuth } from '../AuthContext';
import { isCartOpen } from '../utils';

export function Favorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/favorites', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setFavorites(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, [user]);

  if (loading) return <div className="p-8 text-center">Loading favorites...</div>;
  if (!user) return <div className="p-8 text-center">Please sign in to see your favorites.</div>;
  if (favorites.length === 0) return <div className="p-8 text-center">No favorites yet.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-black text-stone-900 mb-8 tracking-tight flex items-center gap-4">
        <Heart size={32} className="text-red-500 fill-current" />
        Your Favorites
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((cart, index) => (
          <motion.div 
            key={cart.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-stone-200 hover:shadow-xl transition-all group flex flex-col"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
              <img 
                src={cart.imageUrl || `https://picsum.photos/seed/${cart.id}/800/600`} 
                alt={cart.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2 mb-2">
                  {isCartOpen(cart.openTime, cart.closeTime) ? (
                    <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-emerald-500/20">Open Now</span>
                  ) : (
                    <span className="bg-stone-500/80 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">Closed</span>
                  )}
                  {cart.rating && (
                    <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                      <Star size={10} className="text-amber-500 fill-current" />
                      <span className="text-[10px] font-black text-stone-900">{cart.rating}</span>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-black text-white leading-tight drop-shadow-lg">{cart.name}</h3>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              {(() => {
                try {
                  const tags = typeof cart.tags === 'string' ? JSON.parse(cart.tags || '[]') : (Array.isArray(cart.tags) ? cart.tags : []);
                  if (Array.isArray(tags) && tags.length > 0) {
                    return (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {tags.slice(0, 3).map((t, i) => (
                          <span key={i} className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-stone-200" title={t.name}>
                            {typeof t === 'string' ? t.toUpperCase() : (t.tag || t.name).toUpperCase()}
                          </span>
                        ))}
                      </div>
                    );
                  }
                } catch (e) {}
                return null;
              })()}
              <p className="text-stone-500 text-sm line-clamp-2 mb-6 flex-1">{cart.description}</p>
              
              <div className="grid grid-cols-2 gap-3">
                <Link 
                  to={`/pod/${cart.podId}?cart=${cart.id}`}
                  className="bg-stone-900 text-white py-3 rounded-2xl font-bold text-sm hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Info size={16} />
                  Details
                </Link>
                <Link 
                  to={`/pod/${cart.podId}`}
                  className="bg-emerald-50 text-emerald-700 py-3 rounded-2xl font-bold text-sm hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 border border-emerald-100"
                >
                  <Utensils size={16} />
                  Pod
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
