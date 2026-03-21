import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { MapPin, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Utensils, Info, Camera, Star, Instagram, Globe, FileText, ExternalLink, Navigation, X, Clock, Map as MapIcon, List, Play, Square, Search, Menu, Mic, File } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Pod, Cart } from '../types';
import { useAuth } from '../AuthContext';
import { useEditMode } from '../EditModeContext';
import { getEnv } from '../env';
import { getDistance, isCartOpen } from '../utils';
import { PodIcon, UserIcon, NavArrowIcon } from '../components/Icons';
import { Directions, MapZoomListener, MapPanner, MapFitter } from '../components/MapComponents';
import { useTutorial } from '../TutorialContext';

export default function MapView() {
  const { user } = useAuth();
  const { editMode } = useEditMode();
  const { nextStep } = useTutorial();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pods, setPods] = useState<Pod[]>([]);
  const [carts, setCarts] = useState<Cart[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<{minLat: number, maxLat: number, minLng: number, maxLng: number} | null>(null);
  const searchTag = searchParams.get('tag') || '';
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isWatchingLocation, setIsWatchingLocation] = useState(true);
  const isAddingPod = searchParams.get('mode') === 'add' && user;
  const navToId = searchParams.get('navTo');
  const [tempMarker, setTempMarker] = useState<[number, number] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [routeData, setRouteData] = useState<google.maps.DirectionsRoute | null>(null);
  const [navState, setNavState] = useState({
    isActive: false,
    currentIndex: 0,
    points: [] as { lat: number, lng: number, stepIndex: number, instruction: string }[]
  });
  const [navTarget, setNavTarget] = useState<Pod | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [mapTypeId, setMapTypeId] = useState('roadmap');
  const [resetTrigger, setResetTrigger] = useState(0);

  const [showWelcomeTip, setShowWelcomeTip] = useState(() => {
    return localStorage.getItem('hideWelcomeTip') !== 'true';
  });

  const handlePanComplete = useCallback(() => {
    setMapTypeId('roadmap');
  }, []);

  const [zoomLevel, setZoomLevel] = useState(13);

  useEffect(() => {
    const handleZoomChanged = (e: any) => setZoomLevel(e.detail);
    window.addEventListener('map-zoom-changed', handleZoomChanged);
    return () => window.removeEventListener('map-zoom-changed', handleZoomChanged);
  }, []);

  useEffect(() => {
    const handleGoToNearestPod = () => {
      if (pods.length > 0) {
        let closest = pods[0];
        if (userLocation) {
          let minD = Infinity;
          for (const p of pods) {
            const d = Math.pow(p.latitude - userLocation[0], 2) + Math.pow(p.longitude - userLocation[1], 2);
            if (d < minD) {
              minD = d;
              closest = p;
            }
          }
        }
        navigate(`/pod/${closest.id}/map`);
      }
    };
    const handleGoToNearestCart = () => {
      if (carts.length > 0) {
        let closest = carts[0];
        if (userLocation) {
          let minD = Infinity;
          for (const c of carts) {
            if (c.latitude && c.longitude) {
              const d = Math.pow(c.latitude - userLocation[0], 2) + Math.pow(c.longitude - userLocation[1], 2);
              if (d < minD) {
                minD = d;
                closest = c;
              }
            }
          }
        }
        if (closest) {
          navigate(`/pod/${closest.podId}/map?highlight=${closest.id}`);
        }
      }
    };
    window.addEventListener('go-to-nearest-pod', handleGoToNearestPod);
    window.addEventListener('go-to-nearest-cart', handleGoToNearestCart);
    return () => {
      window.removeEventListener('go-to-nearest-pod', handleGoToNearestPod);
      window.removeEventListener('go-to-nearest-cart', handleGoToNearestCart);
    };
  }, [pods, carts, userLocation, navigate]);

  useEffect(() => {
    const handleResetMap = () => {
      setMapTypeId('roadmap');
      setResetTrigger(prev => prev + 1);
    };
    window.addEventListener('reset-map', handleResetMap);
    return () => window.removeEventListener('reset-map', handleResetMap);
  }, []);

  const [panTrigger, setPanTrigger] = useState(0);

  useEffect(() => {
    if (isAddingPod) {
      window.dispatchEvent(new Event('locate-me'));
    }
  }, [isAddingPod]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleRouteFetched = useCallback((route: google.maps.DirectionsRoute) => {
    setRouteData(route);
    if (route.legs[0] && !navState.isActive) {
      const points = route.legs[0].steps.flatMap((step, idx) => 
        step.path.map(p => ({
          lat: p.lat(),
          lng: p.lng(),
          stepIndex: idx,
          instruction: step.instructions.replace(/<[^>]*>?/gm, '')
        }))
      );
      setNavState(prev => ({ ...prev, points, currentIndex: 0 }));
    }
  }, [navState.isActive]);

  const handlePodDragEnd = async (podId: string, lat: number, lng: number) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const pod = pods.find(p => p.id === podId);
      if (!pod) return;

      const updatedPod = { ...pod, latitude: lat, longitude: lng };
      
      setPods(prev => prev.map(p => p.id === podId ? updatedPod : p));

      await fetch(`/api/pods/${podId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedPod)
      });
    } catch (err) {
      console.error("Failed to update pod location", err);
    }
  };

  const fetchPods = async () => {
    try {
      console.log('Fetching pods...');
      const res = await fetch('/api/pods');
      const data = await res.json();
      console.log('Pods data:', data);
      if (Array.isArray(data)) {
        setPods(data);
        setFetchError(null);
      } else {
        setFetchError(data.error || "Failed to load pods");
        setPods([]);
      }
    } catch (err) {
      console.error('Error fetching pods:', err);
      setFetchError((err as Error).message);
      setPods([]);
    }
  };

  const fetchCarts = async (bounds?: {minLat: number, maxLat: number, minLng: number, maxLng: number}, tag?: string) => {
    try {
      let url = '/api/carts';
      const params = new URLSearchParams();
      if (bounds) {
        params.append('minLat', bounds.minLat.toString());
        params.append('maxLat', bounds.maxLat.toString());
        params.append('minLng', bounds.minLng.toString());
        params.append('maxLng', bounds.maxLng.toString());
      }
      if (tag) {
        params.append('tag', tag);
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCarts(data);
      } else {
        setFetchError(data.error || "Failed to load carts");
        setCarts([]);
      }
    } catch (err) {
      setFetchError((err as Error).message);
      setCarts([]);
    }
  };

  useEffect(() => {
    fetchPods();
    // Initial fetch without bounds to populate some carts, 
    // or we can wait for mapBounds. Let's wait for mapBounds.
  }, []);

  useEffect(() => {
    if (!mapBounds) return;
    const timer = setTimeout(() => {
      if (searchTag) {
        fetchCarts(mapBounds, searchTag);
      } else {
        setCarts([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [mapBounds, searchTag]);

  useEffect(() => {
    if (!isWatchingLocation) return;
    let lastLoc: [number, number] | null = null;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        setUserLocation(prev => {
          if (!prev) return [lat, lng];
          if (getDistance(prev[0], prev[1], lat, lng) > 5) {
            return [lat, lng];
          }
          return prev;
        });
      },
      (err) => {
        console.warn("Geolocation error:", err);
        setUserLocation(prev => prev || [45.5946, -121.1787]);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isWatchingLocation]);

  useEffect(() => {
    const handleLocate = () => {
      setPanTrigger(prev => prev + 1);
    };
    window.addEventListener('locate-me', handleLocate);
    return () => window.removeEventListener('locate-me', handleLocate);
  }, []);

  useEffect(() => {
    if (!navState.isActive || navState.points.length === 0 || !userLocation) return;

    let minDistance = Infinity;
    let closestIndex = navState.currentIndex;

    const searchEnd = Math.min(navState.currentIndex + 50, navState.points.length);
    
    for (let i = navState.currentIndex; i < searchEnd; i++) {
      const pt = navState.points[i];
      const dist = getDistance(userLocation[0], userLocation[1], pt.lat, pt.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    const currentStep = navState.points[navState.currentIndex]?.stepIndex ?? -1;
    const newStep = navState.points[closestIndex]?.stepIndex ?? -1;

    if (newStep > currentStep && navState.points[closestIndex]) {
      speak(navState.points[closestIndex].instruction);
    }

    if (closestIndex === navState.points.length - 1 && minDistance < 20) {
      speak("You have arrived at your destination.");
      setNavState(prev => ({ ...prev, isActive: false }));
    } else if (closestIndex !== navState.currentIndex) {
      setNavState(prev => ({ ...prev, currentIndex: closestIndex }));
    }
  }, [userLocation, navState.isActive, navState.points]);

  useEffect(() => {
    if (navToId && pods.length > 0) {
      const target = pods.find(p => p.id === navToId);
      if (target) {
        setNavTarget(target);
        setShowSteps(false);
        setNavState(prev => ({ ...prev, isActive: false }));
      }
    }
  }, [navToId, pods]);

  useEffect(() => {
    if (!navTarget) {
      setRouteData(null);
      setShowSteps(false);
      setNavState(prev => ({ ...prev, isActive: false }));
    }
  }, [navTarget]);

  const filteredPods = useMemo(() => {
    if (!searchTag || searchTag.length < 2) return pods;
    const search = searchTag.toUpperCase();
    
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

    const matchingCartPodIds = new Set(
      carts.filter(c => {
        try {
          const tags = typeof c.tags === 'string' ? JSON.parse(c.tags || '[]') : (Array.isArray(c.tags) ? c.tags : []);
          return Array.isArray(tags) && tags.some(t => {
            if (typeof t === 'string') {
              const upper = t.toUpperCase();
              const fullName = tagToNameMap.get(upper) || upper;
              return fullName.includes(search) || upper.includes(search);
            }
            if (typeof t === 'object' && t !== null) {
              const nameMatch = t.name && t.name.toUpperCase().includes(search);
              const tagMatch = t.tag && t.tag.toUpperCase().includes(search);
              return nameMatch || tagMatch;
            }
            return false;
          });
        } catch(e) { return false; }
      }).map(c => c.podId)
    );
    
    return pods.filter(p => matchingCartPodIds.has(p.id));
  }, [pods, carts, searchTag]);

  if (!userLocation) return <div className="h-full w-full flex items-center justify-center bg-stone-100">Loading map...</div>;

  return (
    <div className="absolute inset-0">
      <APIProvider apiKey={getEnv('VITE_GOOGLE_MAPS_API_KEY') || ''}>
        <GoogleMap
          defaultZoom={12}
          defaultCenter={{ lat: userLocation[0], lng: userLocation[1] }}
          mapId={getEnv('VITE_GOOGLE_MAPS_MAP_ID') || "DEMO_MAP_ID"}
          mapTypeId={mapTypeId}
          onMapTypeIdChanged={(e) => setMapTypeId(e.map.getMapTypeId())}
          onBoundsChanged={(e) => {
            const b = e.map.getBounds();
            if (b) {
              const ne = b.getNorthEast();
              const sw = b.getSouthWest();
              setMapBounds({
                minLat: sw.lat(),
                maxLat: ne.lat(),
                minLng: sw.lng(),
                maxLng: ne.lng()
              });
            }
          }}
          onClick={(e) => {
            console.log('Map clicked at:', e.detail.latLng?.lat, e.detail.latLng?.lng);
            if (isAddingPod && e.detail.latLng) {
              setTempMarker([e.detail.latLng.lat, e.detail.latLng.lng]);
              nextStep('CLICK_MAP', 'CLICK_POD_PIN');
            } else if (e.detail.latLng && e.map) {
              const currentZoom = e.map.getZoom();
              if (currentZoom && currentZoom <= 14) {
                const tapLat = e.detail.latLng.lat;
                const tapLng = e.detail.latLng.lng;
                
                const nearbyPods = filteredPods.filter(pod => {
                  const dist = getDistance(tapLat, tapLng, pod.latitude, pod.longitude);
                  return dist < 500;
                });
                
                if (nearbyPods.length > 0) {
                  let closestPod = nearbyPods[0];
                  let minDistance = getDistance(tapLat, tapLng, closestPod.latitude, closestPod.longitude);
                  nearbyPods.forEach(pod => {
                    const dist = getDistance(tapLat, tapLng, pod.latitude, pod.longitude);
                    if (dist < minDistance) {
                      minDistance = dist;
                      closestPod = pod;
                    }
                  });
                  e.map.setCenter({ lat: closestPod.latitude, lng: closestPod.longitude });
                } else {
                  e.map.setCenter(e.detail.latLng);
                }
                e.map.setZoom(15);
              }
            }
          }}
          disableDefaultUI={true}
          gestureHandling={navTarget ? "none" : "greedy"}
          style={{ width: '100%', height: '100%' }}
        >
          <MapZoomListener />
          <MapFitter pods={filteredPods} searchTag={searchTag} />
          <MapPanner location={userLocation} isActive={navState.isActive} panTrigger={panTrigger} resetTrigger={resetTrigger} onPanComplete={handlePanComplete} />

          {fetchError && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl shadow-lg z-[3000] max-w-md text-center">
              <p className="font-bold">Error loading data</p>
              <p className="text-sm">{fetchError}</p>
            </div>
          )}

          {userLocation && (
            <AdvancedMarker position={{ lat: userLocation[0], lng: userLocation[1] }} gmpClickable={false}>
              {navState.isActive ? <NavArrowIcon /> : <UserIcon />}
            </AdvancedMarker>
          )}
          
          {userLocation && navTarget && (
            <Directions 
              origin={userLocation} 
              destination={[navTarget.latitude, navTarget.longitude]} 
              onRouteFetched={handleRouteFetched}
            />
          )}
          
          {filteredPods.map((pod) => {
            const podCarts = carts.filter(c => c.podId === pod.id);
            const hasOpenCart = podCarts.some(c => isCartOpen(c.openTime, c.closeTime));
            const isLevel1 = zoomLevel <= 14;
            return (
              <AdvancedMarker 
                key={pod.id} 
                position={{ lat: pod.latitude, lng: pod.longitude }}
                gmpClickable={true}
                draggable={!!user}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={(e) => {
                  setTimeout(() => setIsDragging(false), 50);
                  if (e.latLng) {
                    handlePodDragEnd(pod.id, e.latLng.lat(), e.latLng.lng());
                  }
                }}
                onClick={() => {
                  console.log('Pod marker clicked:', pod.id, pod.name);
                  if (isDragging) {
                    console.log('Click ignored because isDragging is true');
                    return;
                  }
                  const podCarts = carts.filter(c => c.podId === pod.id);
                  console.log('Pod carts found:', podCarts.length);
                  if (podCarts.length === 1) {
                    navigate(`/pod/${pod.id}?cart=${podCarts[0].id}`);
                  } else if (searchTag) {
                    navigate(`/pod/${pod.id}?highlightTag=${searchTag}`);
                  } else {
                    navigate(`/pod/${pod.id}`);
                  }
                }}
              >
                <div 
                  className="marker-container relative flex flex-col items-center group z-10 cursor-pointer"
                  style={{ touchAction: 'auto', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                  }}
                  onClick={(e) => {
                    console.log('Pod div clicked:', pod.id);
                    // We don't stop propagation here to let the marker handle it, 
                    // but we log it to see if it's firing.
                  }}
                  draggable={false}
                >
                  <div className="absolute bottom-full mb-1 bg-stone-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-xl border border-stone-700 whitespace-nowrap text-sm font-bold text-white pointer-events-none hidden group-hover:block z-[100]">
                    {pod.name}
                  </div>
                  <PodIcon name={pod.name} hasOpenCart={hasOpenCart} isLevel1={isLevel1} />
                </div>
              </AdvancedMarker>
            );
          })}
          
          {tempMarker && (
            <AdvancedMarker 
              position={{ lat: tempMarker[0], lng: tempMarker[1] }}
              gmpClickable={true}
              onClick={() => {
                console.log('Temp marker clicked:', tempMarker);
                nextStep('CLICK_POD_PIN', 'FILL_POD_FORM');
                navigate(`/pod/new?lat=${tempMarker[0]}&lng=${tempMarker[1]}`);
              }}
            >
              <div 
                className="marker-container relative flex flex-col items-center cursor-pointer group z-10"
                style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                onContextMenu={(e) => {
                  e.preventDefault();
                }}
                draggable={false}
              >
                <div className="absolute bottom-full mb-1 bg-stone-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-xl border border-stone-700 whitespace-nowrap text-sm font-bold text-white pointer-events-none hidden group-hover:block z-[100]">
                  New Pod
                </div>
                <div className="bg-emerald-600 w-10 h-10 shadow-lg border-2 border-white text-white transition-all group-hover:scale-110 pointer-events-none flex items-center justify-center">
                  <span className="text-[10px] font-bold whitespace-nowrap pointer-events-none" translate="no">
                    New
                  </span>
                </div>
              </div>
            </AdvancedMarker>
          )}
        </GoogleMap>
      </APIProvider>
      
      {showWelcomeTip && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2rem] p-8 shadow-2xl max-w-sm w-full border border-stone-200 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>
            <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 shadow-inner">
              <Info size={28} />
            </div>
            <h2 className="text-2xl font-black text-stone-900 mb-8 tracking-tight">New? Check the hamburger to the right</h2>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setShowWelcomeTip(false)}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-200 active:scale-[0.98]"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('hideWelcomeTip', 'true');
                  setShowWelcomeTip(false);
                }}
                className="w-full bg-stone-100 text-stone-500 py-4 rounded-2xl font-bold hover:bg-stone-200 transition-all active:scale-[0.98] text-sm"
              >
                Do not show again
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="absolute bottom-8 right-8 z-[1000] flex flex-col gap-4 items-end">
        {navState.isActive && navState.points[navState.currentIndex] && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2000] w-full max-w-md px-4">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-600 text-white rounded-3xl p-6 shadow-2xl border border-emerald-500 flex flex-col items-center text-center"
            >
              <Navigation size={32} className="mb-3" />
              <h2 className="text-2xl font-bold leading-tight">
                {navState.points[Math.min(navState.currentIndex, navState.points.length - 1)].instruction}
              </h2>
            </motion.div>
          </div>
        )}

        {navState.isActive && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[2000]">
            <button 
              onClick={() => {
                setNavState(prev => ({ ...prev, isActive: false }));
                window.speechSynthesis.cancel();
              }}
              className="bg-red-600 text-white px-8 py-4 rounded-full font-bold shadow-2xl hover:bg-red-700 transition-colors flex items-center gap-2 text-lg"
            >
              <Square size={24} fill="currentColor" />
              End Navigation
            </button>
          </div>
        )}

        {!navState.isActive && routeData && navTarget && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-2xl border border-emerald-100 w-80 mb-4 flex flex-col max-h-[70vh]"
          >
            <div className="flex justify-between items-start mb-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-stone-900 leading-tight">{navTarget.name}</h3>
                <p className="text-stone-500 text-sm flex items-center gap-1 mt-1">
                  <Navigation size={12} /> {routeData.summary || 'Fastest route'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setNavTarget(null);
                  setSearchParams({});
                }}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={20} className="text-stone-400" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4 flex-shrink-0">
              <div className="bg-emerald-50 p-3 rounded-2xl">
                <div className="text-emerald-600 mb-1">
                  <Clock size={18} />
                </div>
                <div className="text-xl font-black text-emerald-900">
                  {routeData.legs[0]?.duration?.text}
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-2xl">
                <div className="text-blue-600 mb-1">
                  <Navigation size={18} />
                </div>
                <div className="text-xl font-black text-blue-900">
                  {routeData.legs[0]?.distance?.text}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-2">
              <button 
                onClick={() => {
                  setNavState(prev => ({ ...prev, isActive: true }));
                  setIsWatchingLocation(true);
                }}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 text-lg shadow-lg shadow-emerald-200"
              >
                <Play size={20} fill="currentColor" />
                Start Navigation
              </button>
            </div>
            
            <div className="flex gap-2 flex-shrink-0">
              <button 
                onClick={() => setShowSteps(!showSteps)}
                className={`flex-1 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${showSteps ? 'bg-stone-200 text-stone-800' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
              >
                <List size={18} />
                {showSteps ? 'Hide Steps' : 'Steps'}
              </button>
              <button 
                onClick={() => {
                  const podCarts = carts.filter(c => c.podId === navTarget.id);
                  if (podCarts.length === 1) {
                    navigate(`/pod/${navTarget.id}?cart=${podCarts[0].id}`);
                  } else {
                    navigate(`/pod/${navTarget.id}`);
                  }
                }}
                className="flex-1 bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
              >
                <Info size={18} />
                Details
              </button>
            </div>

            <div 
              id="directions-panel" 
              className={`mt-4 overflow-y-auto transition-all duration-300 ${showSteps ? 'opacity-100 flex-1' : 'opacity-0 h-0 overflow-hidden'}`}
              style={{ minHeight: showSteps ? '200px' : '0' }}
            ></div>
          </motion.div>
        )}

        {isAddingPod ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setSearchParams({});
                setTempMarker(null);
                window.dispatchEvent(new Event('reset-map'));
              }}
              className="flex items-center justify-center px-6 h-14 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-transform hover:scale-110 font-bold"
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>

      {isAddingPod && !tempMarker && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-emerald-200 text-emerald-800 font-bold animate-bounce">
          Click on the map to drop a pin
        </div>
      )}

      {isAddingPod && tempMarker && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-emerald-200 text-emerald-800 font-bold animate-bounce">
          Click the new pin to create the pod
        </div>
      )}
    </div>
  );
}
