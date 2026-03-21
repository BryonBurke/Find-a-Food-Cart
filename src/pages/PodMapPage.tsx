import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { Pod, Cart } from '../types';
import { useAuth } from '../AuthContext';
import { useEditMode } from '../EditModeContext';
import { getEnv } from '../env';
import { isCartOpen, getShortName } from '../utils';
import { CenterPodButton, MapBoundsHandler } from '../components/MapComponents';

export default function PodMapPage() {
  const { user } = useAuth();
  const { editMode } = useEditMode();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const highlightTag = searchParams.get('highlightTag');
  
  const [pod, setPod] = useState<Pod | null>(null);
  const [carts, setCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleNudge = useCallback((latDiff: number, lngDiff: number) => {
    if (!selectedCartId || !user) return;
    
    setCarts(prevCarts => {
      const cart = prevCarts.find(c => c.id === selectedCartId);
      if (!cart || !cart.latitude || !cart.longitude) return prevCarts;
      
      const newLat = cart.latitude + latDiff;
      const newLng = cart.longitude + lngDiff;
      
      user.getIdToken().then(token => {
        const updatedCart = { ...cart, latitude: newLat, longitude: newLng };
        fetch(`/api/carts/${selectedCartId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedCart)
        }).catch(err => console.error(err));
      });

      return prevCarts.map(c => c.id === selectedCartId ? { ...c, latitude: newLat, longitude: newLng } : c);
    });
  }, [selectedCartId, user]);

  useEffect(() => {
    const handleGoToFirstCart = () => {
      if (carts.length > 0) {
        navigate(`/cart/${carts[0].id}`);
      }
    };
    window.addEventListener('go-to-first-cart', handleGoToFirstCart);
    return () => window.removeEventListener('go-to-first-cart', handleGoToFirstCart);
  }, [carts, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCartId) return;
      
      const NUDGE_AMOUNT = 0.000005;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleNudge(NUDGE_AMOUNT, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleNudge(-NUDGE_AMOUNT, 0);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleNudge(0, -NUDGE_AMOUNT);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNudge(0, NUDGE_AMOUNT);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCartId, handleNudge]);

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

  const handleDragEnd = async (cartId: string, lat: number, lng: number) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const cart = carts.find(c => c.id === cartId);
      if (!cart) return;

      const updatedCart = { ...cart, latitude: lat, longitude: lng };
      
      setCarts(prev => prev.map(c => c.id === cartId ? updatedCart : c));

      await fetch(`/api/carts/${cartId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedCart)
      });
    } catch (err) {
      console.error("Failed to update cart location", err);
    }
  };

  const placeCart = (cartId: string) => {
    if (!pod) return;
    const offsetLat = pod.latitude + (Math.random() - 0.5) * 0.0002;
    const offsetLng = pod.longitude + (Math.random() - 0.5) * 0.0002;
    handleDragEnd(cartId, offsetLat, offsetLng);
  };

  const handleDeletePod = async () => {
    if (!user || !pod) return;
    setIsDeleting(true);
    
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/pods/${pod.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        navigate('/');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete pod');
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete pod');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail.podId === id) {
        setShowDeleteConfirm(true);
      }
    };
    window.addEventListener('request-delete-pod', handler);
    return () => window.removeEventListener('request-delete-pod', handler);
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading map...</div>;
  if (!pod) return <div className="p-8 text-center">Pod not found</div>;

  const placedCarts = carts.filter(c => c.latitude !== undefined && c.latitude !== null && c.longitude !== undefined && c.longitude !== null);
  const unplacedCarts = carts.filter(c => c.latitude === undefined || c.latitude === null || c.longitude === undefined || c.longitude === null);

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="bg-white/90 backdrop-blur-md border-b border-stone-200 px-4 py-3 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/pod/${pod.id}`)} className="p-2 hover:bg-stone-100 rounded-full">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-stone-900 leading-tight">{pod.name}</h1>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 z-[3000] bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold text-stone-900 mb-2">Delete Pod?</h2>
            <p className="text-stone-600 mb-6">
              Are you sure you want to delete this pod? This action cannot be undone and will also delete all carts within it.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-xl font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeletePod}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        <APIProvider apiKey={getEnv('VITE_GOOGLE_MAPS_API_KEY') || ''}>
          <GoogleMap
            defaultZoom={19}
            defaultCenter={{ lat: pod.latitude, lng: pod.longitude }}
            mapId={getEnv('VITE_GOOGLE_MAPS_MAP_ID') || "DEMO_MAP_ID"}
            disableDefaultUI={true}
            disableDoubleClickZoom={true}
            gestureHandling="greedy"
            mapTypeId="roadmap"
            style={{ width: '100%', height: '100%' }}
          >
            <MapBoundsHandler carts={carts} pod={pod} />
            <AdvancedMarker position={{ lat: pod.latitude, lng: pod.longitude }} gmpClickable={false}>
              <div className="w-4 h-4 bg-stone-400/50 rounded-full border-2 border-white/50 shadow-sm" title="Pod Center" />
            </AdvancedMarker>

            {(() => {
              const tagToNameMap = new Map<string, string>();
              carts.forEach(c => {
                try {
                  const tags = typeof c.tags === 'string' ? JSON.parse(c.tags || '[]') : (Array.isArray(c.tags) ? c.tags : []);
                  if (Array.isArray(tags)) {
                    tags.forEach(t => {
                      if (typeof t === 'object' && t !== null && t.tag && t.name) {
                        tagToNameMap.set(t.tag.toUpperCase(), t.name.toUpperCase());
                      }
                    });
                  }
                } catch(e) {}
              });
              
              return placedCarts.map((cart) => {
                let hasHighlightTag = false;
                if (highlightTag) {
                  try {
                    const tags = typeof cart.tags === 'string' ? JSON.parse(cart.tags || '[]') : (Array.isArray(cart.tags) ? cart.tags : []);
                    const search = highlightTag.toUpperCase();
                    hasHighlightTag = Array.isArray(tags) && tags.some(t => {
                      if (typeof t === 'string') {
                        const upper = t.toUpperCase();
                        const fullName = tagToNameMap.get(upper) || upper;
                        return fullName === search || upper === search;
                      }
                      if (typeof t === 'object' && t !== null) {
                        const nameMatch = t.name && t.name.toUpperCase() === search;
                        const tagMatch = t.tag && t.tag.toUpperCase() === search;
                        return nameMatch || tagMatch;
                      }
                      return false;
                    });
                  } catch(e) {}
                }
                const isHighlighted = cart.id === highlightId || hasHighlightTag || cart.id === selectedCartId;
              const isOpen = isCartOpen(cart.openTime, cart.closeTime, cart.weeklyHours);
              const pinColor = isHighlighted ? 'bg-red-600' : 'bg-violet-600';
              let ringClass = isHighlighted ? 'ring-4 ring-red-600/50 scale-110' : '';
              if (isOpen && !isHighlighted) {
                ringClass = 'ring-4 ring-green-500/80';
              }
              
              return (
                <AdvancedMarker 
                  key={cart.id} 
                  position={{ lat: cart.latitude!, lng: cart.longitude! }}
                  draggable={editMode && !!user && (!cart.ownerEmail || user.email?.toLowerCase() === cart.ownerEmail || user.email?.toLowerCase() === 'bryonparis@gmail.com')}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={(e) => {
                    setTimeout(() => setIsDragging(false), 50);
                    if (e.latLng) {
                      handleDragEnd(cart.id, e.latLng.lat(), e.latLng.lng());
                    }
                  }}
                  onClick={() => {
                    if (!isDragging) {
                      const canEdit = editMode && !!user && (!cart.ownerEmail || user.email?.toLowerCase() === cart.ownerEmail || user.email?.toLowerCase() === 'bryonparis@gmail.com');
                      if (canEdit) {
                        setSelectedCartId(cart.id);
                      } else {
                        navigate(`/cart/${cart.id}`);
                      }
                    }
                  }}
                  zIndex={isHighlighted || selectedCartId === cart.id ? 100 : 10}
                >
                  <div 
                    className={`marker-container relative flex flex-col items-center group cursor-pointer ${isHighlighted || selectedCartId === cart.id ? 'z-50' : 'z-10'}`}
                    style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                    }}
                    draggable={false}
                  >
                    <div draggable={false} className={`${pinColor} w-12 h-12 shadow-lg border-2 border-white text-white transition-all ${ringClass} ${selectedCartId === cart.id ? 'ring-4 ring-red-600 scale-110' : ''} group-hover:scale-110 pointer-events-none flex items-center justify-center`}>
                      <span draggable={false} className="text-[10px] font-bold whitespace-nowrap pointer-events-none" translate="no">
                        {(() => {
                          try {
                            const tags = typeof cart.tags === 'string' ? JSON.parse(cart.tags || '[]') : (Array.isArray(cart.tags) ? cart.tags : []);
                            if (Array.isArray(tags) && tags.length > 0) {
                              const first = tags[0];
                              const tagStr = typeof first === 'string' ? first : (first.tag || first.name || '');
                              return tagStr.substring(0, 5);
                            }
                            return '';
                          } catch(e) {}
                          const short = getShortName(cart.name);
                          return short.substring(0, 5);
                        })()}
                      </span>
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })})()}
          </GoogleMap>
          <CenterPodButton pod={pod} setPod={setPod} />
        </APIProvider>

        {selectedCartId && !!user && !!user.uid && !user.isAnonymous && editMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-stone-200 z-[2000] flex flex-col items-center gap-4 w-[280px]">
            <div className="text-sm font-bold text-stone-700">Move Cart</div>
            <div className="grid grid-cols-3 gap-2">
              <div />
              <button onClick={() => handleNudge(0.000005, 0)} className="bg-stone-100 p-3 rounded-xl hover:bg-stone-200 active:bg-stone-300 flex items-center justify-center transition-colors"><ChevronUp size={24} /></button>
              <div />
              <button onClick={() => handleNudge(0, -0.000005)} className="bg-stone-100 p-3 rounded-xl hover:bg-stone-200 active:bg-stone-300 flex items-center justify-center transition-colors"><ChevronLeft size={24} /></button>
              <button onClick={() => handleNudge(-0.000005, 0)} className="bg-stone-100 p-3 rounded-xl hover:bg-stone-200 active:bg-stone-300 flex items-center justify-center transition-colors"><ChevronDown size={24} /></button>
              <button onClick={() => handleNudge(0, 0.000005)} className="bg-stone-100 p-3 rounded-xl hover:bg-stone-200 active:bg-stone-300 flex items-center justify-center transition-colors"><ChevronRight size={24} /></button>
            </div>
            <div className="flex gap-2 w-full mt-2">
              <button onClick={() => navigate(`/cart/${selectedCartId}`)} className="flex-1 bg-emerald-100 text-emerald-800 py-3 rounded-xl font-bold text-sm hover:bg-emerald-200 transition-colors">Details</button>
              <button onClick={() => setSelectedCartId(null)} className="flex-1 bg-stone-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors">Done</button>
            </div>
          </div>
        )}

        {!selectedCartId && unplacedCarts.length > 0 && !!user && !!user.uid && !user.isAnonymous && editMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-10">
            <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
              <div className="bg-stone-100 px-4 py-2 border-b border-stone-200 font-bold text-sm text-stone-600 flex justify-between items-center">
                <span>Unplaced Carts ({unplacedCarts.length})</span>
                {!user && <span className="text-xs text-amber-600 font-normal">Login to place</span>}
              </div>
              <div className="max-h-48 overflow-y-auto p-2 flex flex-col gap-2">
                {unplacedCarts.map(cart => {
                  const canPlace = user && (!cart.ownerEmail || user.email?.toLowerCase() === cart.ownerEmail || user.email?.toLowerCase() === 'bryonparis@gmail.com');
                  return (
                    <div key={cart.id} className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <div className="font-semibold text-stone-800">{cart.name}</div>
                      {canPlace && (
                        <button 
                          onClick={() => placeCart(cart.id)}
                          className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-200 transition-colors"
                        >
                          Place on Map
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
