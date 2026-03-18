import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Utensils, MapPin, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Cart, Pod } from '../types';
import { useAuth } from '../AuthContext';

export default function FavoritesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Cart[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const token = await user.getIdToken();
        const [favsRes, podsRes] = await Promise.all([
          fetch('/api/favorites', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/pods')
        ]);
        
        if (favsRes.ok && podsRes.ok) {
          const favsData = await favsRes.json();
          const podsData = await podsRes.json();
          setFavorites(favsData);
          setPods(podsData);
        }
      } catch (err) {
        console.error("Error fetching favorites:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const removeFavorite = async (cartId: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/favorites/${cartId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setFavorites(prev => prev.filter(c => c.id !== cartId));
      }
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-200 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Heart className="text-red-500 fill-current" />
          Your Favorites
        </h1>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-100 shadow-sm">
          <Utensils size={48} className="mx-auto text-stone-300 mb-4" />
          <h2 className="text-xl font-semibold text-stone-600 mb-2">No favorites yet</h2>
          <p className="text-stone-400 mb-6">Explore the map to find your next favorite meal!</p>
          <Link to="/" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all">
            Explore Map
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {favorites.map(cart => {
              const pod = pods.find(p => p.id === cart.podId);
              return (
                <motion.div
                  key={cart.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100 group"
                >
                  <div className="relative h-48">
                    <img 
                      src={cart.imageUrl || 'https://picsum.photos/seed/food/800/600'} 
                      alt={cart.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <button 
                      onClick={() => removeFavorite(cart.id!)}
                      className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 shadow-lg hover:bg-red-50 transition-colors"
                    >
                      <Heart className="fill-current" size={20} />
                    </button>
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        {cart.cuisine}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <Link to={`/cart/${cart.id}`} className="block group-hover:text-emerald-600 transition-colors">
                      <h3 className="text-xl font-bold mb-2">{cart.name}</h3>
                    </Link>
                    
                    {pod && (
                      <div className="flex items-center gap-2 text-stone-500 text-sm mb-4">
                        <MapPin size={14} />
                        <span>{pod.name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-50">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star size={16} className="fill-current" />
                        <span className="font-bold">4.8</span>
                        <span className="text-stone-400 text-xs font-normal">(120)</span>
                      </div>
                      <Link 
                        to={`/cart/${cart.id}`}
                        className="text-emerald-600 font-bold text-sm hover:underline"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
