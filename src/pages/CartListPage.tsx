import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Utensils, Navigation } from 'lucide-react';
import { Cart, Pod } from '../types';
import { getDistance } from '../utils';

export default function CartListPage() {
  const navigate = useNavigate();
  const [carts, setCarts] = useState<Cart[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cartsRes, podsRes] = await Promise.all([
          fetch('/api/carts'),
          fetch('/api/pods')
        ]);
        
        if (!cartsRes.ok || !podsRes.ok) throw new Error('Failed to fetch data');
        
        const cartsData = await cartsRes.json();
        const podsData = await podsRes.json();
        
        setCarts(cartsData);
        setPods(podsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load carts. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (err) => {
            console.error('Geolocation error:', err);
            setError('Please enable location services to see distances.');
          }
        );
      } else {
        setError('Geolocation is not supported by your browser.');
      }
    };

    fetchData();
    getLocation();
  }, []);

  const cartsWithDistance = carts.map(cart => {
    const pod = pods.find(p => p.id === cart.podId);
    if (!pod || !userLocation) return { ...cart, distance: Infinity };
    
    const distance = getDistance(
      userLocation.lat,
      userLocation.lng,
      pod.latitude,
      pod.longitude
    );
    
    return { ...cart, distance };
  })
  .sort((a, b) => a.distance - b.distance);

  const formatDistance = (meters: number) => {
    if (meters === Infinity) return 'Unknown';
    const miles = meters / 1609.34;
    if (miles < 0.1) return 'Very close';
    return `${miles.toFixed(1)} mi`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Navigation className="text-emerald-600" />
          Cart List
        </h1>
      </div>

      {error && !userLocation && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl mb-8 flex items-center gap-3">
          <MapPin size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {cartsWithDistance.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-100 shadow-sm">
            <Utensils size={48} className="mx-auto text-stone-300 mb-4" />
            <h2 className="text-xl font-semibold text-stone-600">No carts found</h2>
          </div>
        ) : (
          cartsWithDistance.map((cart) => (
            <div
              key={cart.id}
              onClick={() => navigate(`/cart/${cart.id}`)}
              className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                    <img
                      src={cart.imageUrl || `https://picsum.photos/seed/cart-${cart.id}/200/200`}
                      alt={cart.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 group-hover:text-emerald-600 transition-colors">
                      {cart.name}
                    </h3>
                    <p className="text-sm text-stone-500">{cart.cuisine}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-emerald-600 font-bold">
                    <Navigation size={14} className="rotate-45" />
                    <span>{formatDistance(cart.distance)}</span>
                  </div>
                  <p className="text-[10px] text-stone-400 uppercase font-bold tracking-tighter">away</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
