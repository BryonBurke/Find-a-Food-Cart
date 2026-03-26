import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, ChevronLeft } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Cart } from '../types';

export default function Favorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchTag = searchParams.get('tag') || '';

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
        setFavorites(data);
      } catch (err) {
        console.error("Failed to fetch favorites:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-4 flex flex-col items-center justify-center min-h-[50vh]">
        <Heart size={48} className="text-stone-300 mb-4" />
        <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight mb-2">Sign in required</h2>
        <p className="text-stone-500 text-center max-w-md mb-6">You need to be signed in to view and manage your favorite food carts.</p>
        <button
          onClick={() => navigate('/login')}
          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 pb-24">
      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-100 text-rose-600 rounded-2xl">
            <Heart size={28} fill="currentColor" />
          </div>
          <h1 className="text-3xl font-black text-stone-900 uppercase tracking-tight">Favorite Carts</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
        </div>
      ) : favorites.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-12 text-center shadow-sm border border-stone-100 flex flex-col items-center">
          <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-6 text-rose-200">
            <Heart size={48} fill="currentColor" />
          </div>
          <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight mb-2">No favorites yet</h2>
          <p className="text-stone-500 max-w-md mx-auto mb-8">
            When you find a food cart you love, tap the heart icon on its page to save it here for quick access.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-stone-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-colors"
          >
            Explore Map
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((cart) => (
            <button
              key={cart.id}
              onClick={() => navigate(`/cart/${cart.id}${searchTag ? `?tag=${searchTag}` : ''}`)}
              className="bg-white p-4 rounded-[2rem] shadow-sm border border-stone-100 hover:shadow-md hover:border-rose-200 transition-all group text-left flex items-center gap-4"
            >
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-stone-100 border border-stone-200">
                <img 
                  src={cart.imageUrl || `https://picsum.photos/seed/cart-${cart.id}/200/200`} 
                  alt={cart.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-stone-900 text-lg truncate uppercase tracking-tight leading-tight mb-1">{cart.name}</div>
                <div className="text-sm text-stone-500 font-bold truncate">{cart.podName || 'Standalone Cart'}</div>
              </div>
              <div className="p-3 text-rose-500 bg-rose-50 rounded-full group-hover:bg-rose-100 transition-colors">
                <Heart size={24} fill="currentColor" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
