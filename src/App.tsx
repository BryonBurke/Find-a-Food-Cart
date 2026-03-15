/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/// <reference types="vite/client" />

import React, { useState, useEffect, FormEvent, ChangeEvent, MouseEvent, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Utensils, Info, Camera, Star, Instagram, Globe, FileText, ExternalLink, Navigation, X, Clock, Map as MapIcon, List, Play, Square, Search, Menu, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Pod, Cart } from './types';
import { AuthProvider, useAuth } from './AuthContext';
import { EditModeProvider, useEditMode } from './EditModeContext';
import Login from './Login';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { getEnv } from './env';

// Custom Food Cart Icon
const CartIcon = () => (
  <div className="bg-emerald-600 p-1.5 rounded-full shadow-lg border-2 border-white text-white transform hover:scale-110 transition-transform flex items-center justify-center pointer-events-none">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
      <rect x="2" y="4" width="20" height="2" rx="1" />
      <path d="M5 6v8" />
      <path d="M19 6v8" />
      <path d="M5 10h14" />
      <rect x="3" y="14" width="18" height="5" rx="1" />
      <circle cx="8" cy="19" r="3" />
      <circle cx="16" cy="19" r="3" />
      <path d="M8 19h.01" />
      <path d="M16 19h.01" />
      <path d="M21 16h2" />
    </svg>
  </div>
);

const getShortName = (name: string) => {
  const ignoredWords = ['the', 'a', 'an', 'and', 'or', 'our', 'your', 'my', 'of', 'in', 'on', 'at'];
  const words = name.split(' ').filter(w => w.trim() !== '');
  const meaningfulWord = words.find(w => !ignoredWords.includes(w.toLowerCase().replace(/[^a-z]/g, '')));
  return meaningfulWord || words[0] || '';
};

const getTwoLineName = (name: string) => {
  const ignoredWords = ['the', 'a', 'an', 'and', 'or', 'our', 'your', 'my', 'of', 'in', 'on', 'at'];
  const words = name.split(' ').filter(w => w.trim() !== '');
  const meaningfulWords = words.filter(w => !ignoredWords.includes(w.toLowerCase().replace(/[^a-z]/g, '')));
  if (meaningfulWords.length >= 2) {
    return meaningfulWords.slice(0, 2).join('\n');
  }
  return meaningfulWords[0] || words[0] || '';
};

const UserIcon = () => (
  <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
);

const NavArrowIcon = () => (
  <div className="bg-blue-600 p-2 rounded-full shadow-xl border-4 border-white text-white transform">
    <Navigation size={20} className="fill-current" />
  </div>
);

// --- Helpers ---

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimension
        const MAX_SIZE = 600;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        let quality = 0.7;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Ensure the base64 string is under ~800KB to be safe for Firestore's 1MB limit
        while (dataUrl.length > 800000 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(dataUrl);
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- Components ---

function CameraInput({ onCapture, label, className, capture = true }: { onCapture: (url: string) => void, label?: React.ReactNode, className?: string, capture?: boolean }) {
  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await fileToDataUrl(file);
        onCapture(url);
      } catch (err) {
        console.error("Error capturing image:", err);
      }
    }
  };

  return (
    <label className={`cursor-pointer flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors text-emerald-700 font-medium ${className}`}>
      <Camera size={18} />
      <span>{label || 'Take Photo'}</span>
      <input
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        onChange={handleChange}
        className="hidden"
      />
    </label>
  );
}

function Directions({ 
  origin, 
  destination, 
  onRouteFetched 
}: { 
  origin: [number, number], 
  destination: [number, number],
  onRouteFetched: (route: google.maps.DirectionsRoute) => void
}) {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ 
      map, 
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#10b981',
        strokeOpacity: 0.8,
        strokeWeight: 6,
      }
    }));
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer) return;

    directionsService.route({
      origin: { lat: origin[0], lng: origin[1] },
      destination: { lat: destination[0], lng: destination[1] },
      travelMode: google.maps.TravelMode.DRIVING,
    }).then(response => {
      directionsRenderer.setDirections(response);
      
      // Bind to the panel if it exists
      const panel = document.getElementById('directions-panel');
      if (panel) {
        directionsRenderer.setPanel(panel);
      }

      const route = response.routes[0];
      if (route) {
        onRouteFetched(route);
      }
    }).catch(err => {
      console.error("Directions request failed", err);
    });

    return () => {
      directionsRenderer.setMap(null);
      directionsRenderer.setPanel(null);
    };
  }, [directionsService, directionsRenderer, origin[0], origin[1], destination[0], destination[1]]);

  return null;
}



function MapZoomListener() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('zoom_changed', () => {
      window.dispatchEvent(new CustomEvent('map-zoom-changed', { detail: map.getZoom() }));
    });
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map]);

  useEffect(() => {
    const handleSetZoom = (e: any) => {
      if (map) {
        map.setZoom(e.detail);
      }
    };
    window.addEventListener('set-zoom', handleSetZoom);
    return () => window.removeEventListener('set-zoom', handleSetZoom);
  }, [map]);
  return null;
}

function isCartOpen(openTime?: string, closeTime?: string): boolean {
  if (!openTime || !closeTime || typeof openTime !== 'string' || typeof closeTime !== 'string') return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [openH, openM] = openTime.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  
  const [closeH, closeM] = closeTime.split(':').map(Number);
  let closeMinutes = closeH * 60 + closeM;
  
  if (isNaN(openMinutes) || isNaN(closeMinutes)) return false;
  
  if (closeMinutes < openMinutes) {
    // Closes after midnight
    closeMinutes += 24 * 60;
  }
  
  let checkMinutes = currentMinutes;
  if (checkMinutes < openMinutes && closeMinutes > 24 * 60) {
    checkMinutes += 24 * 60;
  }
  
  return checkMinutes >= openMinutes && checkMinutes <= closeMinutes;
}

function MapPanner({ location, isActive, panTrigger, resetTrigger, onPanComplete }: { location: [number, number] | null, isActive: boolean, panTrigger?: number, resetTrigger?: number, onPanComplete?: () => void }) {
  const map = useMap();

  useEffect(() => {
    if (isActive && location && map) {
      map.panTo({ lat: location[0], lng: location[1] });
      map.setZoom(18);
    }
  }, [location, isActive, map]);

  useEffect(() => {
    if (panTrigger && panTrigger > 0 && location && map) {
      map.panTo({ lat: location[0], lng: location[1] });
      map.setZoom(19);
      map.setMapTypeId('roadmap');
      if (onPanComplete) onPanComplete();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panTrigger]);

  useEffect(() => {
    if (resetTrigger && resetTrigger > 0 && map) {
      map.setZoom(13);
      map.setMapTypeId('roadmap');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger]);

  return null;
}

function MapView() {
  const { user } = useAuth();
  const { editMode } = useEditMode();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pods, setPods] = useState<Pod[]>([]);
  const [carts, setCarts] = useState<Cart[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
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
  const [simulatedLoc, setSimulatedLoc] = useState<[number, number] | null>(null);
  const [navTarget, setNavTarget] = useState<Pod | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [mapTypeId, setMapTypeId] = useState('roadmap');
  const [resetTrigger, setResetTrigger] = useState(0);

  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(13);

  useEffect(() => {
    const handleLocate = () => setIsZoomedIn(true);
    const handleReset = () => setIsZoomedIn(false);
    const handleZoomChanged = (e: any) => setZoomLevel(e.detail);
    
    window.addEventListener('locate-me', handleLocate);
    window.addEventListener('reset-map', handleReset);
    window.addEventListener('map-zoom-changed', handleZoomChanged);
    
    return () => {
      window.removeEventListener('locate-me', handleLocate);
      window.removeEventListener('reset-map', handleReset);
      window.removeEventListener('map-zoom-changed', handleZoomChanged);
    };
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
    console.log("Current Map ID:", getEnv('VITE_GOOGLE_MAPS_MAP_ID'));
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

  const handleRouteFetched = (route: google.maps.DirectionsRoute) => {
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
  };

  const handlePodDragEnd = async (podId: string, lat: number, lng: number) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const pod = pods.find(p => p.id === podId);
      if (!pod) return;

      const updatedPod = { ...pod, latitude: lat, longitude: lng };
      
      // Optimistic update
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
      const res = await fetch('/api/pods');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPods(data);
        setFetchError(null);
      } else {
        console.error("Failed to fetch pods:", data);
        setFetchError(data.error || "Failed to load pods");
        setPods([]);
      }
    } catch (err) {
      console.error("Failed to fetch pods:", err);
      setFetchError((err as Error).message);
      setPods([]);
    }
  };

  const fetchCarts = async () => {
    try {
      const res = await fetch('/api/carts');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCarts(data);
      } else {
        console.error("Failed to fetch carts:", data);
        setFetchError(data.error || "Failed to load carts");
        setCarts([]);
      }
    } catch (err) {
      console.error("Failed to fetch carts:", err);
      setFetchError((err as Error).message);
      setCarts([]);
    }
  };

  useEffect(() => {
    fetchPods();
    fetchCarts();
  }, []);

  useEffect(() => {
    if (!isWatchingLocation) return;
    let lastLoc: [number, number] | null = null;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        if (!lastLoc || getDistance(lastLoc[0], lastLoc[1], newLoc[0], newLoc[1]) > 5) {
          lastLoc = newLoc;
          setUserLocation(newLoc);
        }
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

  // Real GPS Navigation Effect
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
    const tag = searchTag.toUpperCase();
    
    const matchingCartPodIds = new Set(
      carts.filter(c => {
        try {
          const tags = typeof c.tags === 'string' ? JSON.parse(c.tags || '[]') : (Array.isArray(c.tags) ? c.tags : []);
          return Array.isArray(tags) && tags.some(t => {
            if (typeof t === 'string') return t.toUpperCase().includes(tag);
            if (typeof t === 'object' && t !== null) {
              return (t.name && t.name.toUpperCase().includes(tag)) || (t.tag && t.tag.toUpperCase().includes(tag));
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
        <Map
          defaultZoom={13}
          defaultCenter={{ lat: userLocation[0], lng: userLocation[1] }}
          mapId={getEnv('VITE_GOOGLE_MAPS_MAP_ID') || "DEMO_MAP_ID"}
          mapTypeId={mapTypeId}
          onMapTypeIdChanged={(e) => setMapTypeId(e.map.getMapTypeId())}
          onClick={(e) => {
            if (isAddingPod && e.detail.latLng) {
              setTempMarker([e.detail.latLng.lat, e.detail.latLng.lng]);
            } else if (e.detail.latLng && e.map) {
              const currentZoom = e.map.getZoom();
              if (currentZoom && currentZoom <= 14) {
                e.map.panTo(e.detail.latLng);
                e.map.setZoom(16);
              }
            }
          }}
          disableDefaultUI={true}
          gestureHandling="greedy"
          style={{ width: '100%', height: '100%' }}
        >
          <MapZoomListener />
          <MapPanner location={userLocation} isActive={navState.isActive} panTrigger={panTrigger} resetTrigger={resetTrigger} onPanComplete={() => setMapTypeId('roadmap')} />

          {fetchError && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl shadow-lg z-[3000] max-w-md text-center">
              <p className="font-bold">Error loading data</p>
              <p className="text-sm">{fetchError}</p>
              {fetchError.includes('credentials missing') && (
                <p className="text-xs mt-2 font-mono bg-red-50 p-2 rounded">
                  Make sure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in your Render environment variables.
                </p>
              )}
            </div>
          )}

          {userLocation && (
            <AdvancedMarker position={{ lat: userLocation[0], lng: userLocation[1] }}>
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
                draggable={!!user}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={(e) => {
                  setTimeout(() => setIsDragging(false), 50);
                  if (e.latLng) {
                    handlePodDragEnd(pod.id, e.latLng.lat(), e.latLng.lng());
                  }
                }}
                onClick={() => {
                  if (isDragging) return;
                  if (searchTag) {
                    navigate(`/pod/${pod.id}?highlightTag=${searchTag}`);
                  } else {
                    navigate(`/pod/${pod.id}`);
                  }
                }}
              >
                <div 
                  className="relative flex flex-col items-center group cursor-pointer z-10"
                  style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                >
                  <div className="absolute bottom-full mb-1 bg-stone-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-xl border border-stone-700 whitespace-nowrap text-sm font-bold text-white pointer-events-none hidden group-hover:block z-[100]">
                    {pod.name}
                  </div>
                  <div 
                    className={`bg-violet-600 flex items-center justify-center shadow-lg border-2 border-white text-white transition-all group-hover:scale-110 pointer-events-none ${isLevel1 ? 'w-4 h-4' : 'w-10 h-10'} ${hasOpenCart ? 'ring-4 ring-green-500/80' : ''}`}
                  >
                    {!isLevel1 && (
                      <span className="text-[10px] font-bold text-center leading-tight pointer-events-none whitespace-pre-wrap px-0.5">
                        {getTwoLineName(pod.name)}
                      </span>
                    )}
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}
          
          {tempMarker && (
            <AdvancedMarker 
              position={{ lat: tempMarker[0], lng: tempMarker[1] }}
              onClick={() => navigate(`/pod/new?lat=${tempMarker[0]}&lng=${tempMarker[1]}`)}
            >
              <div className="relative flex flex-col items-center cursor-pointer group z-10">
                <div className="absolute bottom-full mb-1 bg-stone-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-xl border border-stone-700 whitespace-nowrap text-sm font-bold text-white pointer-events-none hidden group-hover:block z-[100]">
                  New Pod
                </div>
                <div className="bg-emerald-600 w-10 h-10 shadow-lg border-2 border-white text-white transition-all group-hover:scale-110 pointer-events-none flex items-center justify-center">
                  <span className="text-[10px] font-bold whitespace-nowrap pointer-events-none">
                    New
                  </span>
                </div>
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
      
      <div className="absolute bottom-8 right-8 z-[1000] flex flex-col gap-4 items-end">
        {/* Navigation Active Overlay */}
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

        {/* Standard Bottom Right Panel */}
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
                onClick={() => navigate(`/pod/${navTarget.id}`)}
                className="flex-1 bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
              >
                <Info size={18} />
                Details
              </button>
            </div>

            {/* Google Maps Directions Panel */}
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
        ) : (
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                if (isZoomedIn) {
                  window.dispatchEvent(new Event('reset-map'));
                } else {
                  window.dispatchEvent(new Event('locate-me'));
                }
              }}
              className="flex sm:hidden items-center justify-center px-6 h-14 bg-white text-stone-800 rounded-full shadow-lg hover:bg-stone-50 transition-transform hover:scale-110 font-bold gap-2 border border-stone-200"
            >
              <Navigation size={20} className={isZoomedIn ? "text-emerald-600" : ""} />
              {isZoomedIn ? 'Zoom out' : 'Zoom in on me'}
            </button>
            {user && editMode && (
              <button
                onClick={() => setSearchParams({ mode: 'add' })}
                className="flex items-center justify-center px-6 h-14 bg-stone-900 text-white rounded-full shadow-lg hover:bg-stone-800 transition-transform hover:scale-110 sm:hidden font-bold gap-2"
                title="Add Pod"
              >
                <Plus size={20} /> Add Pod
              </button>
            )}
          </div>
        )}
      </div>

      {isAddingPod && !tempMarker && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-emerald-200 text-emerald-800 font-bold animate-bounce">
          Click on the map to drop a pin
        </div>
      )}
    </div>
  );
}

function PodPage() {
  const { user } = useAuth();
  const { editMode } = useEditMode();
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
      }
    } catch (err) {
      console.error(err);
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
  const [localFavorites, setLocalFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (user && carts.length > 0) {
      const userEmail = user.email?.toLowerCase();
      const favs = carts
        .filter(c => c.favorites?.includes(userEmail || ''))
        .map(c => c.id);
      setLocalFavorites(favs);
    }
  }, [carts, user]);

  const toggleFavorite = async (cartId: string) => {
    if (!user) {
      if (confirm("Please login to favorite carts. Go to login page?")) {
        navigate('/login');
      }
      return;
    }

    const isFav = localFavorites.includes(cartId);
    setLocalFavorites(prev => isFav ? prev.filter(id => id !== cartId) : [...prev, cartId]);

    try {
      const token = await user.getIdToken();
      await fetch(`/api/carts/${cartId}/favorite`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to toggle favorite", err);
      setLocalFavorites(prev => isFav ? [...prev, cartId] : prev.filter(id => id !== cartId));
    }
  };

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

  if (loading) return <div className="p-8 text-center">Loading pod details...</div>;
  if (!pod) return <div className="p-8 text-center">Pod not found</div>;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-yellow-50"
    >
      <div className="max-w-7xl mx-auto p-4 pb-24">
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
                  <p className="text-stone-500 text-sm">{selectedCartForMenu.cuisine}</p>
                </div>
                <button 
                  onClick={() => setSelectedCartForMenu(null)}
                  className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-500"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {(() => {
                  let menuGallery: string[] = [];
                  try {
                    menuGallery = typeof selectedCartForMenu.menuGallery === 'string' ? JSON.parse(selectedCartForMenu.menuGallery) : (Array.isArray(selectedCartForMenu.menuGallery) ? selectedCartForMenu.menuGallery : []);
                    if (!Array.isArray(menuGallery)) menuGallery = [];
                  } catch (e) {
                    menuGallery = [];
                  }
                  
                  if (menuGallery.length > 0) {
                    return (
                      <div className="flex flex-col gap-6">
                        {menuGallery.map((url, idx) => (
                          <img 
                            key={idx} 
                            src={url} 
                            alt={`Menu page ${idx + 1}`} 
                            className="w-full rounded-xl shadow-sm border border-stone-100"
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-center py-12">
                        <FileText size={48} className="mx-auto text-stone-300 mb-4" />
                        <p className="text-stone-500 text-lg">No menu photos available for this cart.</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[6000] flex items-center justify-center p-4"
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
                This will also delete all carts in this pod. This action cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={deletePod}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                >
                  Yes, Delete Pod
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

        {cartToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[6000] flex items-center justify-center p-4"
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

        {slideshowIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[5000] flex items-center justify-center"
            onClick={() => setSlideshowIndex(null)}
          >
            <button 
              className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition-colors z-[5001]"
              onClick={() => setSlideshowIndex(null)}
            >
              <X size={32} />
            </button>
            <button 
              className="absolute left-4 text-white p-4 hover:bg-white/20 rounded-full transition-colors z-[5001]"
              onClick={(e) => { e.stopPropagation(); setSlideshowIndex((prev) => (prev! - 1 + carts.length) % carts.length); }}
            >
              <ChevronLeft size={48} />
            </button>
            <button 
              className="absolute right-4 text-white p-4 hover:bg-white/20 rounded-full transition-colors z-[5001]"
              onClick={(e) => { e.stopPropagation(); setSlideshowIndex((prev) => (prev! + 1) % carts.length); }}
            >
              <ChevronRight size={48} />
            </button>
            
            <img 
              src={carts[slideshowIndex].imageUrl || `https://picsum.photos/seed/cart-${carts[slideshowIndex].id}/800/600`}
              alt={carts[slideshowIndex].name}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
            
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent text-white flex flex-col items-center z-[5001]">
              <h2 className="text-2xl sm:text-4xl font-bold">{carts[slideshowIndex].name}</h2>
              <p className="text-stone-300 mt-1 text-sm sm:text-lg max-w-2xl text-center">{carts[slideshowIndex].description}</p>
              
              <div className="flex gap-3 mt-4 justify-center">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(carts[slideshowIndex].id); }}
                  className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm sm:text-base ${localFavorites.includes(carts[slideshowIndex].id) ? 'bg-rose-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                >
                  <Heart size={18} fill={localFavorites.includes(carts[slideshowIndex].id) ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedCartForMenu(carts[slideshowIndex]); setSlideshowIndex(null); }}
                  className="bg-white text-black px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-200 transition-colors text-sm sm:text-base"
                >
                  <FileText size={18} /> Menu
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate(`/pod/${carts[slideshowIndex].podId}/map?highlight=${carts[slideshowIndex].id}`); setSlideshowIndex(null); }}
                  className="bg-emerald-600 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-colors text-sm sm:text-base"
                >
                  <MapPin size={18} /> Map
                </button>
                {editMode && (
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
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-stone-200 rounded-full transition-colors flex-shrink-0">
            <ChevronLeft size={24} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-stone-900 truncate">{pod.name}</h1>
            <p className="text-stone-500 font-medium truncate">
              {pod.address}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {editMode && user && (
            <div className="flex gap-2 mr-2">
              <button 
                onClick={() => navigate(`/pod/${pod.id}/cart/new`)}
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
          <HamburgerMenu 
            isPodPage={false} 
            podId={pod.id} 
            onDelete={() => setShowDeleteConfirm(true)} 
          />
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
                  <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-emerald-700 shadow-sm uppercase tracking-wider">
                    {cart.cuisine}
                  </span>
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
                            <span key={i} className="bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-white/20">
                              {typeof t === 'string' ? t.substring(0, 5).toUpperCase() : (t.tag || t.name?.substring(0, 5).toUpperCase())}
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
                        toggleFavorite(cart.id);
                      }}
                      className={`p-2 rounded-lg transition-colors ${localFavorites.includes(cart.id) ? 'text-rose-500 bg-rose-50' : 'text-stone-400 bg-stone-100 hover:bg-stone-200'}`}
                    >
                      <Heart size={16} fill={localFavorites.includes(cart.id) ? "currentColor" : "none"} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCartForMenu(cart);
                      }}
                      className="text-stone-600 hover:text-stone-900 font-bold text-sm flex items-center gap-1 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <FileText size={14} /> Menu
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/pod/${pod.id}/map?highlight=${cart.id}`);
                      }}
                      className="text-emerald-600 hover:text-emerald-700 font-bold text-sm flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <MapPin size={14} /> Map
                    </button>
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

function CartOwnerPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [email, setEmail] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !tenantId) return;
    setLoading(true);
    try {
      await fetch('/api/ownership_requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: id, email, tenantId })
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 md:p-8 max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-black text-stone-900">Cart Owner</h1>
      </div>
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
        {submitted ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-2xl font-bold text-stone-900 mb-2">Request Submitted</h2>
            <p className="text-stone-600">We will review your request and get back to you shortly.</p>
          </div>
        ) : (
          <>
            <p className="text-stone-600 text-lg leading-relaxed mb-8">
              Hi Cart Owner! If you would like to lock your cart down in my app, enter your email and a rental agreement number or tenant ID below. I will set your cart to only edit with your password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Rental Agreement Number / Tenant ID</label>
                <input
                  type="text"
                  required
                  value={tenantId}
                  onChange={e => setTenantId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. 123456789"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email || !tenantId}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </>
        )}
      </div>
    </motion.div>
  );
}

function CartPage() {
  const { user } = useAuth();
  const { editMode } = useEditMode();
  const { id } = useParams();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [pod, setPod] = useState<Pod | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isFavoriting, setIsFavoriting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/carts/${id}`);
        const data = await res.json();
        setCart(data);

        const podRes = await fetch(`/api/pods/${data.podId}`);
        const podData = await podRes.json();
        setPod(podData);
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
        navigate(`/pod/${cart.podId}/map`);
      }
    };
    window.addEventListener('go-to-pod-map', handleGoToPodMap);
    return () => window.removeEventListener('go-to-pod-map', handleGoToPodMap);
  }, [cart, navigate]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteCart = async () => {
    if (!cart || !user) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/carts/${cart.id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        navigate(`/pod/${cart.podId}`);
      } else {
        const error = await res.json();
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
  if (!cart) return <div className="p-8 text-center">Cart not found</div>;

  let gallery: string[] = [];
  let menuGallery: string[] = [];
  try {
    gallery = typeof cart.gallery === 'string' ? JSON.parse(cart.gallery) : (Array.isArray(cart.gallery) ? cart.gallery : []);
    if (!Array.isArray(gallery)) gallery = [];
  } catch (e) {
    console.error("Failed to parse gallery JSON", e);
    gallery = [];
  }
  try {
    menuGallery = typeof cart.menuGallery === 'string' ? JSON.parse(cart.menuGallery) : (Array.isArray(cart.menuGallery) ? cart.menuGallery : []);
    if (!Array.isArray(menuGallery)) menuGallery = [];
  } catch (e) {
    console.error("Failed to parse menuGallery JSON", e);
    menuGallery = [];
  }

  const canEdit = !cart.ownerEmail || 
    !user ||
    (user && user.email?.toLowerCase() === cart.ownerEmail) || 
    (user && user.email?.toLowerCase() === 'bryonparis@gmail.com');

  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (user && cart) {
      setIsFavorite(cart.favorites?.includes(user.email?.toLowerCase() || '') || false);
    }
  }, [cart, user]);

  const toggleFavorite = async () => {
    if (!user) {
      if (confirm("Please login to favorite carts. Go to login page?")) {
        navigate('/login');
      }
      return;
    }
    
    if (!cart) return;

    const newStatus = !isFavorite;
    setIsFavorite(newStatus);

    try {
      const token = await user.getIdToken();
      await fetch(`/api/carts/${cart.id}/favorite`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to toggle favorite", err);
      setIsFavorite(!newStatus);
    }
  };

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
                  onClick={deleteCart}
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
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex gap-2">
          <button 
            onClick={toggleFavorite}
            className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-rose-500 bg-rose-50 hover:bg-rose-100' : 'text-stone-400 hover:bg-stone-100'}`}
            title={isFavorite ? "Unfavorite" : "Favorite"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>
          {canEdit && editMode && (
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
              {user && (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }} 
                  className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600 z-50"
                  title="Delete Cart"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden mb-8 shadow-2xl">
        <img 
          src={cart.imageUrl || `https://picsum.photos/seed/cart-${cart.id}/1560/2080`} 
          alt={cart.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-widest">
                  {cart.cuisine}
                </span>
                {isCartOpen(cart.openTime, cart.closeTime) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full uppercase tracking-widest shadow-lg">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> Open
                  </span>
                )}
              </div>
              <h1 className="text-5xl font-black text-white mb-2">{cart.name}</h1>
              <div className="flex items-center gap-4 text-stone-200">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star size={20} fill="currentColor" />
                  <span className="font-bold text-lg">{cart.rating}</span>
                </div>
              </div>
            </div>
            {pod && (
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate(`/pod/${pod.id}/map?highlight=${cart.id}`)}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium border border-white/20 shadow-sm"
                >
                  <MapIcon size={18} />
                  View on Map
                </button>
                <button 
                  onClick={() => navigate(`/?navTo=${pod.id}`)}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium border border-white/20 shadow-sm"
                >
                  <Navigation size={18} />
                  Directions
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className="md:col-span-2 space-y-8">
          {gallery.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Camera size={24} className="text-emerald-600" /> Gallery
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {gallery.map((url: string, idx: number) => (
                  <div key={idx} className="aspect-[3/4] rounded-2xl overflow-hidden shadow-md hover:scale-[1.02] transition-transform cursor-pointer">
                    <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="space-y-8">
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

        <div className="space-y-6">
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText size={20} className="text-emerald-600" /> Menu
            </h2>
            {menuGallery.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {menuGallery.map((url: string, idx: number) => (
                  <div 
                    key={idx} 
                    className="rounded-xl overflow-hidden shadow-sm border border-stone-100 cursor-pointer hover:opacity-90 transition-opacity aspect-[3/4]"
                    onClick={() => setFullscreenImage(url)}
                  >
                    <img src={url} alt={`Menu ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-400 italic text-sm">No menu photos provided.</p>
            )}
          </section>

          {!cart.ownerEmail && (
            <button
              onClick={() => navigate(`/cart/${cart.id}/owner`)}
              className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-stone-800 transition-colors shadow-md"
            >
              Cart Owner
            </button>
          )}
        </div>
      </div>

      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[4000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenImage(null);
            }}
          >
            <X size={32} />
          </button>
          <img 
            src={fullscreenImage} 
            alt="Fullscreen Menu" 
            className="max-w-full max-h-full object-contain rounded-lg"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </motion.div>
  );
}

function PodForm() {
  const { user } = useAuth();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);
  
  const initialLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : 45.523;
  const initialLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : -122.676;

  const [formData, setFormData] = useState<Partial<Pod>>({
    name: '',
    description: '',
    latitude: initialLat,
    longitude: initialLng,
    address: '',
    imageUrl: ''
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetch(`/api/pods/${id}`).then(res => res.json()).then(setFormData);
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const token = await user.getIdToken();
      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit ? `/api/pods/${id}` : '/api/pods';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        navigate('/');
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to save pod');
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-200 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold">{isEdit ? 'Edit Pod' : 'Add New Pod'}</h1>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Pod Name</label>
          <input
            required
            type="text"
            value={formData.name || ''}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            placeholder="e.g. Hawthorne Asylum"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Address (Optional)</label>
          <input
            type="text"
            value={formData.address || ''}
            onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            placeholder="123 SE 10th Ave, Portland, OR"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Description (Optional)</label>
          <textarea
            rows={4}
            value={formData.description || ''}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            placeholder="Tell us about this pod..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Image URL (Optional)</label>
          <div className="flex flex-col gap-3">
            <div className="flex-1 relative">
              <Camera className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="url"
                value={formData.imageUrl || ''}
                onChange={e => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="https://..."
              />
            </div>
            <CameraInput capture={true} onCapture={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))} label="Capture Pod Photo" />
            <CameraInput capture={false} onCapture={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))} label="Upload Pod Photo" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-200 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Pod')}
        </button>
      </form>
    </div>
  );
}

function CartForm() {
  const { user } = useAuth();
  const { podId, id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const [formData, setFormData] = useState<Cart>({
    id: '',
    podId: podId || '',
    name: '',
    cuisine: '',
    description: '',
    imageUrl: '',
    gallery: '',
    menuGallery: '',
    instagramUrl: '',
    websiteUrl: '',
    rating: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [foodItems, setFoodItems] = useState<{name: string, tag: string}[]>([]);
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodTag, setNewFoodTag] = useState('');
  const [globalFoodItems, setGlobalFoodItems] = useState<{name: string, tag: string}[]>([]);

  useEffect(() => {
    fetch('/api/carts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const itemsMap = new Map<string, {name: string, tag: string}>();
          data.forEach((c: Cart) => {
            try {
              const cartTags = JSON.parse(c.tags || '[]');
              if (Array.isArray(cartTags)) {
                cartTags.forEach(item => {
                  if (typeof item === 'object' && item.name && item.tag) {
                    itemsMap.set(item.name.toLowerCase(), item);
                  } else if (typeof item === 'string') {
                    itemsMap.set(item.toLowerCase(), { name: item, tag: item });
                  }
                });
              }
            } catch (e) {}
          });
          setGlobalFoodItems(Array.from(itemsMap.values()));
        }
      });
  }, []);

  useEffect(() => {
    if (isEdit) {
      fetch(`/api/carts/${id}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch cart');
          return res.json();
        })
        .then(data => {
          if (data.ownerEmail && user && user.email?.toLowerCase() !== data.ownerEmail && user.email?.toLowerCase() !== 'bryonparis@gmail.com') {
            alert('Only the cart owner can edit this cart.');
            navigate(-1);
            return;
          }
          setFormData(data);
          try {
            const parsed = data.tags ? JSON.parse(data.tags) : [];
            if (Array.isArray(parsed)) {
              setFoodItems(parsed.map(item => typeof item === 'string' ? { name: item, tag: item } : item));
            } else {
              setFoodItems([]);
            }
          } catch (e) {
            setFoodItems([]);
          }
        })
        .catch(err => {
          console.error(err);
          alert("Error loading cart data");
        });
    } else if (podId) {
      setFormData(prev => ({ ...prev, podId: podId }));
    }
  }, [id, isEdit, podId, user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    const token = await user.getIdToken();
    
    const payload = {
      ...formData,
      tags: JSON.stringify(foodItems),
      podId: formData.podId
    };

    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `/api/carts/${id}` : '/api/carts';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        navigate(isEdit ? `/cart/${id}` : `/pod/${podId || formData.podId}`);
      } else {
        let errorMessage = 'Failed to save cart';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${res.status}`;
        }
        alert(`Error: ${errorMessage}`);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("A network error occurred. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  };

  const addFoodItem = (name: string, tag: string) => {
    const cleanName = name.trim();
    const cleanTag = tag.trim().toUpperCase().substring(0, 5);
    
    if (!cleanName) return;
    
    if (foodItems.length === 0 && !formData.cuisine) {
      setFormData(prev => ({ ...prev, cuisine: cleanName }));
    }
    
    setFoodItems(prev => [...prev, { name: cleanName, tag: cleanTag || cleanName.substring(0, 5).toUpperCase() }]);
    setNewFoodName('');
    setNewFoodTag('');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-200 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold">{isEdit ? 'Edit Cart' : 'Add New Cart'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
        {/* 1. Main Image Section */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Main Image</label>
          <div className="flex flex-col gap-3">
            {formData.imageUrl && (
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-stone-200">
                <img src={formData.imageUrl} alt="Main" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                  className="absolute top-2 right-2 p-1 bg-white/80 backdrop-blur-sm rounded-full text-stone-600 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {!formData.imageUrl && (
              <div className="flex flex-col sm:flex-row gap-3">
                <CameraInput capture={true} onCapture={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))} label={<span className="font-black text-2xl">MAIN PIC</span>} className="flex-1 py-6 border-2 border-dashed border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50" />
                <CameraInput capture={false} onCapture={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))} label={<span className="font-black text-2xl">MAIN PIC</span>} className="flex-1 py-6 border-2 border-dashed border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50" />
              </div>
            )}
          </div>
        </div>

        {/* 2. Menu Photo Section */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Menu Photos</label>
          <div className="flex flex-col gap-3">
            {(() => {
              let menus: string[] = [];
              try { menus = JSON.parse(formData.menuGallery || '[]'); } catch(e) {}
              if (!Array.isArray(menus)) menus = [];
              
              return (
                <>
                  {menus.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {menus.map((url, idx) => (
                        <div key={idx} className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-stone-200">
                          <img src={url} alt={`Menu ${idx + 1}`} className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => {
                              const newMenus = [...menus];
                              newMenus.splice(idx, 1);
                              setFormData(prev => ({ ...prev, menuGallery: JSON.stringify(newMenus) }));
                            }}
                            className="absolute top-1 right-1 p-1 bg-white/80 backdrop-blur-sm rounded-full text-stone-600 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <CameraInput 
                      capture={true}
                      onCapture={(url) => {
                        setFormData(prev => {
                          let current = [];
                          try { current = JSON.parse(prev.menuGallery || '[]'); } catch(e) {}
                          if (!Array.isArray(current)) current = [];
                          return { ...prev, menuGallery: JSON.stringify([...current, url]) };
                        });
                      }} 
                      label={<span className="font-black text-2xl">MENU PICS</span>} 
                      className="flex-1 py-6 border-2 border-dashed border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50" 
                    />
                    <CameraInput 
                      capture={false}
                      onCapture={(url) => {
                        setFormData(prev => {
                          let current = [];
                          try { current = JSON.parse(prev.menuGallery || '[]'); } catch(e) {}
                          if (!Array.isArray(current)) current = [];
                          return { ...prev, menuGallery: JSON.stringify([...current, url]) };
                        });
                      }} 
                      label={<span className="font-black text-2xl">MENU PICS</span>} 
                      className="flex-1 py-6 border-2 border-dashed border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50" 
                    />
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* 3. Cart Name & Cuisine */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Cart Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="e.g. Matt's BBQ"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Cuisine Type</label>
            <input
              type="text"
              value={formData.cuisine || ''}
              onChange={e => setFormData(prev => ({ ...prev, cuisine: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="e.g. Texas BBQ, Thai, Vegan"
            />
          </div>
        </div>

        {/* 4. Times */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Opening Time</label>
            <input
              type="time"
              value={formData.openTime || ''}
              onChange={e => setFormData(prev => ({ ...prev, openTime: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Closing Time</label>
            <input
              type="time"
              value={formData.closeTime || ''}
              onChange={e => setFormData(prev => ({ ...prev, closeTime: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* 5. Rating */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Rating (1-5)</label>
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, rating: num }))}
                className={`flex-1 py-3 rounded-xl border transition-all font-bold ${
                  formData.rating === num 
                    ? 'bg-amber-500 border-amber-500 text-white shadow-md' 
                    : 'bg-emerald-50 border-stone-200 text-stone-600 hover:border-emerald-300'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Food Tags Section (New) */}
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-stone-700">Food Tags</label>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {foodItems.map((item, idx) => (
              <span key={idx} className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 border border-emerald-200">
                <span className="font-mono bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[10px]">{item.tag}</span>
                {item.name}
                <button 
                  type="button"
                  onClick={() => setFoodItems(prev => prev.filter((_, i) => i !== idx))}
                  className="text-emerald-600 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>

          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Full Food Name</label>
                <input
                  type="text"
                  value={newFoodName}
                  onChange={e => setNewFoodName(e.target.value)}
                  placeholder="e.g. Brisket Sandwich"
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">5-Letter Tag</label>
                <input
                  type="text"
                  maxLength={5}
                  value={newFoodTag}
                  onChange={e => setNewFoodTag(e.target.value.toUpperCase())}
                  placeholder="BRSKT"
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => addFoodItem(newFoodName, newFoodTag)}
              className="w-full bg-stone-800 text-white py-3 rounded-xl font-bold hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Add Food Tag
            </button>
          </div>

          {globalFoodItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-stone-400 uppercase">Suggested from other carts</p>
              <div className="flex flex-wrap gap-2">
                {globalFoodItems.filter(gi => !foodItems.some(fi => fi.name.toLowerCase() === gi.name.toLowerCase())).slice(0, 10).map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFoodItems(prev => [...prev, item])}
                    className="px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-2"
                  >
                    <span className="font-mono text-stone-400">{item.tag}</span>
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xl shadow-emerald-100 mt-8"
        >
          {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Cart')}
        </button>
      </form>
    </div>
  );
}

function CenterPodButton({ pod, setPod }: { pod: Pod, setPod: (p: Pod) => void }) {
  const map = useMap();
  const { user } = useAuth();
  
  const handleCenterPodHere = async () => {
    if (!user || !pod || !map) return;
    const center = map.getCenter();
    if (!center) return;
    
    try {
      const token = await user.getIdToken();
      const updatedPod = { ...pod, latitude: center.lat(), longitude: center.lng() };
      setPod(updatedPod);
      
      await fetch(`/api/pods/${pod.id}`, {
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

  if (!user) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] pointer-events-auto">
      <button 
        onClick={handleCenterPodHere}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleCenterPodHere();
        }}
        style={{ touchAction: 'none' }}
        className="bg-stone-900/90 hover:bg-stone-800 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur-sm font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer"
      >
        <MapPin size={16} />
        Center Pod Here
      </button>
    </div>
  );
}

function PodMapPage() {
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
      
      // Fire API call in background
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
      
      const NUDGE_AMOUNT = 0.000005; // ~0.5 meters
      
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
      
      // Optimistic update
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
    // Place it slightly offset from the pod center so they don't all stack perfectly
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

  if (loading) return <div className="p-8 text-center">Loading map...</div>;
  if (!pod) return <div className="p-8 text-center">Pod not found</div>;

  const placedCarts = carts.filter(c => c.latitude !== undefined && c.longitude !== undefined);
  const unplacedCarts = carts.filter(c => c.latitude === undefined || c.longitude === undefined);

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="bg-white/90 backdrop-blur-md border-b border-stone-200 px-4 py-3 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => {
            navigate(`/pod/${id}`);
          }} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-stone-900 leading-tight">{pod.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HamburgerMenu 
            isPodPage={false} 
            podId={pod.id} 
            onDelete={() => setShowDeleteConfirm(true)} 
          />
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
          <Map
            defaultZoom={19}
            defaultCenter={{ lat: pod.latitude, lng: pod.longitude }}
            mapId={getEnv('VITE_GOOGLE_MAPS_MAP_ID') || "DEMO_MAP_ID"}
            disableDefaultUI={true}
            disableDoubleClickZoom={true}
            gestureHandling="greedy"
            mapTypeId="roadmap"
            style={{ width: '100%', height: '100%' }}
          >
            {placedCarts.map((cart) => {
              let hasHighlightTag = false;
              if (highlightTag) {
                try {
                  const tags = typeof cart.tags === 'string' ? JSON.parse(cart.tags || '[]') : (Array.isArray(cart.tags) ? cart.tags : []);
                  hasHighlightTag = Array.isArray(tags) && tags.some(t => {
                    if (typeof t === 'string') return t === highlightTag;
                    if (typeof t === 'object' && t !== null) return t.tag === highlightTag || t.name === highlightTag;
                    return false;
                  });
                } catch(e) {}
              }
              const isHighlighted = cart.id === highlightId || hasHighlightTag || cart.id === selectedCartId;
              const isOpen = isCartOpen(cart.openTime, cart.closeTime);
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
                        navigate(`/pod/${id}?cart=${cart.id}`);
                      }
                    }
                  }}
                  zIndex={isHighlighted || selectedCartId === cart.id ? 100 : 10}
                >
                  <div 
                    className={`relative flex flex-col items-center group cursor-pointer ${isHighlighted || selectedCartId === cart.id ? 'z-50' : 'z-10'}`}
                    style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                  >
                    <div className={`${pinColor} w-10 h-10 shadow-lg border-2 border-white text-white transition-all ${ringClass} ${selectedCartId === cart.id ? 'ring-4 ring-red-600 scale-110' : ''} group-hover:scale-110 pointer-events-none flex items-center justify-center`}>
                      <span className="text-[10px] font-bold whitespace-nowrap pointer-events-none">
                        {(() => {
                          try {
                            const tags = typeof cart.tags === 'string' ? JSON.parse(cart.tags || '[]') : (Array.isArray(cart.tags) ? cart.tags : []);
                            if (Array.isArray(tags) && tags.length > 0) {
                              const first = tags[0];
                              const tagStr = typeof first === 'string' ? first : (first.tag || first.name || '');
                              return tagStr.substring(0, 3);
                            }
                            return '';
                          } catch(e) {}
                          return getShortName(cart.name);
                        })()}
                      </span>
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}
          </Map>
          <CenterPodButton pod={pod} setPod={setPod} />
        </APIProvider>

        {selectedCartId && editMode && (
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
              <button onClick={() => navigate(`/pod/${id}?cart=${selectedCartId}`)} className="flex-1 bg-emerald-100 text-emerald-800 py-3 rounded-xl font-bold text-sm hover:bg-emerald-200 transition-colors">Details</button>
              <button onClick={() => setSelectedCartId(null)} className="flex-1 bg-stone-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors">Done</button>
            </div>
          </div>
        )}

        {!selectedCartId && unplacedCarts.length > 0 && editMode && (
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

function ModeratorPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [deletedPods, setDeletedPods] = useState<any[]>([]);
  const [deletedCarts, setDeletedCarts] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingDeleted, setLoadingDeleted] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        
        // Fetch logs
        fetch('/api/logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(data => {
          setLogs(data);
          setLoadingLogs(false);
        }).catch(err => {
          console.error("Failed to fetch logs:", err);
          setLoadingLogs(false);
        });

        // Fetch ownership requests
        fetch('/api/ownership_requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(data => {
          setRequests(data);
          setLoadingRequests(false);
        }).catch(err => {
          console.error("Failed to fetch requests:", err);
          setLoadingRequests(false);
        });

        // Fetch deleted pods
        fetch('/api/pods?includeDeleted=true').then(res => res.json()).then(data => {
          setDeletedPods(data.filter((p: any) => p.deletedAt));
        }).catch(err => console.error(err));

        // Fetch deleted carts
        fetch('/api/carts?includeDeleted=true').then(res => res.json()).then(data => {
          setDeletedCarts(data.filter((c: any) => c.deletedAt));
          setLoadingDeleted(false);
        }).catch(err => {
          console.error(err);
          setLoadingDeleted(false);
        });
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setLoadingLogs(false);
        setLoadingRequests(false);
        setLoadingDeleted(false);
      }
    };
    
    if (user?.email?.toLowerCase() === 'bryonparis@gmail.com') {
      fetchData();
    }
  }, [user]);

  const handleRequestStatus = async (id: string, status: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch(`/api/ownership_requests/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (err) {
      console.error("Failed to update request status:", err);
      alert("Failed to update status");
    }
  };

  const handleRestorePod = async (id: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch(`/api/pods/${id}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDeletedPods(prev => prev.filter(p => p.id !== id));
      // Also remove its carts from deletedCarts to avoid double restoring issues
      setDeletedCarts(prev => prev.filter(c => c.podId !== id));
    } catch (err) {
      console.error("Failed to restore pod:", err);
      alert("Failed to restore pod");
    }
  };

  const handleRestoreCart = async (id: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch(`/api/carts/${id}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDeletedCarts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error("Failed to restore cart:", err);
      alert("Failed to restore cart");
    }
  };
  
  if (!user || user.email?.toLowerCase() !== 'bryonparis@gmail.com') {
    return (
      <div className="p-8 text-center text-stone-600">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-stone-900 mb-6">Moderator Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ownership Requests Section (1/3) */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
            <h2 className="text-xl font-bold mb-4">Ownership Requests</h2>
            {loadingRequests ? (
              <p className="text-stone-500">Loading requests...</p>
            ) : requests.length === 0 ? (
              <p className="text-stone-500">No pending requests.</p>
            ) : (
              <div className="space-y-4">
                {requests.map(req => (
                  <div key={req.id} className="p-4 rounded-xl border border-stone-200 bg-stone-50">
                    <div className="mb-2">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
                        req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {req.status}
                      </span>
                      <div className="text-sm font-semibold text-stone-900 truncate">Cart ID: {req.cartId}</div>
                      <div className="text-sm text-stone-600 truncate">Email: {req.email}</div>
                      <div className="text-sm text-stone-600 truncate">Tenant ID: {req.tenantId}</div>
                      <div className="text-xs text-stone-400 mt-1">
                        {req.createdAt ? new Date(req.createdAt._seconds * 1000).toLocaleString() : 'Just now'}
                      </div>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button 
                          onClick={() => handleRequestStatus(req.id, 'approved')}
                          className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRequestStatus(req.id, 'rejected')}
                          className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
            <h2 className="text-xl font-bold mb-4 text-red-600">Deleted Items</h2>
            {loadingDeleted ? (
              <p className="text-stone-500">Loading deleted items...</p>
            ) : deletedPods.length === 0 && deletedCarts.length === 0 ? (
              <p className="text-stone-500">No deleted items.</p>
            ) : (
              <div className="space-y-4">
                {deletedPods.map(pod => (
                  <div key={pod.id} className="p-4 rounded-xl border border-red-200 bg-red-50">
                    <div className="mb-2">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-red-100 text-red-700">
                        Deleted Pod
                      </span>
                      <div className="text-sm font-semibold text-stone-900 truncate">{pod.name}</div>
                      <div className="text-xs text-stone-500 mt-1">
                        Deleted: {new Date(pod.deletedAt).toLocaleString()}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRestorePod(pod.id)}
                      className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors mt-2"
                    >
                      Restore
                    </button>
                  </div>
                ))}
                {deletedCarts.map(cart => (
                  <div key={cart.id} className="p-4 rounded-xl border border-orange-200 bg-orange-50">
                    <div className="mb-2">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-orange-100 text-orange-700">
                        Deleted Cart
                      </span>
                      <div className="text-sm font-semibold text-stone-900 truncate">{cart.name}</div>
                      <div className="text-xs text-stone-500 mt-1">
                        Deleted: {new Date(cart.deletedAt).toLocaleString()}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRestoreCart(cart.id)}
                      className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors mt-2"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Logs Section (2/3) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 h-full">
            <h2 className="text-xl font-bold mb-4">Edit Logs</h2>
            {loadingLogs ? (
              <p className="text-stone-500">Loading logs...</p>
            ) : logs.length === 0 ? (
              <p className="text-stone-500">No edits have been logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="py-3 px-4 font-semibold text-stone-600">Date</th>
                      <th className="py-3 px-4 font-semibold text-stone-600">User</th>
                      <th className="py-3 px-4 font-semibold text-stone-600">Action</th>
                      <th className="py-3 px-4 font-semibold text-stone-600">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="py-3 px-4 text-sm text-stone-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-stone-900">
                          {log.userEmail}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                            log.action.includes('Deleted') ? 'bg-red-100 text-red-700' :
                            log.action.includes('Created') ? 'bg-emerald-100 text-emerald-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-stone-700 max-w-xs">
                          <div className="font-medium mb-1">{log.details}</div>
                          {log.changes && (
                            <details className="mt-1 cursor-pointer">
                              <summary className="text-xs text-stone-500 hover:text-stone-800 font-medium">View Changes</summary>
                              <div className="mt-2 p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                                {log.changes.added && (
                                  <div className="text-emerald-700">
                                    <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-900">Added:</span><br/>
                                    {JSON.stringify(log.changes.added, null, 2)}
                                  </div>
                                )}
                                {log.changes.deleted && (
                                  <div className="text-red-700">
                                    <span className="font-bold uppercase tracking-wider text-[10px] text-red-900">Deleted:</span><br/>
                                    {JSON.stringify(log.changes.deleted, null, 2)}
                                  </div>
                                )}
                                {log.changes.old && log.changes.new && (
                                  <div className="text-blue-700">
                                    <span className="font-bold uppercase tracking-wider text-[10px] text-blue-900 mb-1 block">Updated Fields:</span>
                                    {Object.keys(log.changes.new).map(key => {
                                      if (JSON.stringify(log.changes.old[key]) !== JSON.stringify(log.changes.new[key])) {
                                        return (
                                          <div key={key} className="mb-2 bg-white p-2 rounded border border-blue-100">
                                            <span className="font-bold text-stone-800">{key}:</span><br/>
                                            <span className="text-red-500 line-through opacity-70">{JSON.stringify(log.changes.old[key]) || 'null'}</span>
                                            <br/>
                                            <span className="text-emerald-600 font-medium">{JSON.stringify(log.changes.new[key]) || 'null'}</span>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })}
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HamburgerMenu({ isPodPage = false, podId, onDelete }: { isPodPage?: boolean, podId?: string, onDelete?: () => void }) {
  const { user } = useAuth();
  const { editMode, setEditMode } = useEditMode();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isModerator = user?.email?.toLowerCase().trim() === 'bryonparis@gmail.com';
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleLocate = () => setIsZoomedIn(true);
    const handleReset = () => setIsZoomedIn(false);
    
    window.addEventListener('locate-me', handleLocate);
    window.addEventListener('reset-map', handleReset);
    
    return () => {
      window.removeEventListener('locate-me', handleLocate);
      window.removeEventListener('reset-map', handleReset);
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <div className="relative pointer-events-auto">
      <button 
        onClick={() => setMenuOpen(!menuOpen)}
        className={`p-2 rounded-xl shadow-lg border transition-colors ${isPodPage ? 'bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-white/10' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'}`}
      >
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col py-2 z-[3000]"
          >
            {isHome && (
              <button 
                onClick={() => {
                  if (isZoomedIn) {
                    window.dispatchEvent(new Event('reset-map'));
                  } else {
                    window.dispatchEvent(new Event('locate-me'));
                  }
                  setMenuOpen(false);
                }}
                className="px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-2 text-left"
              >
                <Navigation size={16} /> <span>{isZoomedIn ? 'Zoom back out' : 'Zoom in on me'}</span>
              </button>
            )}
            
            <Link to="/favorites" onClick={() => setMenuOpen(false)} className="w-full px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors flex items-center text-left">
              View All Favorites
            </Link>

            {isModerator && (
              <Link to="/moderator" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors text-left">Moderator</Link>
            )}

            {user && (
              <button 
                onClick={() => {
                  setEditMode(!editMode);
                  setMenuOpen(false);
                }}
                className={`px-4 py-3 text-sm font-bold transition-colors flex items-center gap-2 text-left ${editMode ? 'text-emerald-600 bg-emerald-50' : 'text-stone-700 hover:bg-stone-100'}`}
              >
                <Edit2 size={16} /> <span>{editMode ? 'Editing: ON' : 'Edit'}</span>
              </button>
            )}

            {podId && (
              <div className="border-t border-stone-100 mt-1 pt-1">
                <button 
                  onClick={() => {
                    navigate(`/pod/${podId}/map`);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-2 text-left"
                >
                  <MapIcon size={16} /> MAP
                </button>
                <button 
                  onClick={() => {
                    navigate(`/?navTo=${podId}`);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-2 text-left"
                >
                  <Navigation size={16} /> NAV
                </button>
              </div>
            )}

            {podId && user && editMode && (
              <div className="border-t border-stone-100 mt-1 pt-1">
                <button 
                  onClick={() => {
                    navigate(`/pod/${podId}/cart/new`);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-2 text-left"
                >
                  <Plus size={16} /> Add Cart
                </button>
                <button 
                  onClick={() => {
                    navigate(`/pod/${podId}/edit`);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-2 text-left"
                >
                  <Edit2 size={16} /> Edit Pod
                </button>
                <button 
                  onClick={() => {
                    onDelete?.();
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 text-left"
                >
                  <Trash2 size={16} /> Delete Pod
                </button>
              </div>
            )}

            {user ? (
              <>
                {isHome && editMode && (
                  <Link to="/?mode=add" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors text-left border-t border-stone-100">Add Pod</Link>
                )}
                <button onClick={handleLogout} className="px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left border-t border-stone-100">Logout</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors text-left border-t border-stone-100">Login</Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Header() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isHome = location.pathname === '/';
  const isPodMap = location.pathname.match(/^\/pod\/[^/]+\/map$/);
  const isPodPage = location.pathname.match(/^\/pod\/[^/]+$/) && location.pathname !== '/pod/new';
  
  const [carts, setCarts] = useState<Cart[]>([]);
  
  useEffect(() => {
    fetch('/api/carts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCarts(data);
      })
      .catch(console.error);
  }, []);

  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    carts.forEach(c => {
      try {
        const tags = typeof c.tags === 'string' ? JSON.parse(c.tags || '[]') : (Array.isArray(c.tags) ? c.tags : []);
        if (Array.isArray(tags)) {
          tags.forEach(t => {
            if (typeof t === 'string') tagsSet.add(t);
            else if (typeof t === 'object' && t !== null) {
              if (t.tag) tagsSet.add(t.tag);
              if (t.name) tagsSet.add(t.name);
            }
          });
        }
      } catch(e) {}
    });
    return Array.from(tagsSet).sort();
  }, [carts]);

  const searchTag = searchParams.get('tag') || '';
  const setSearchTag = (tag: string) => {
    if (tag) {
      searchParams.set('tag', tag);
    } else {
      searchParams.delete('tag');
    }
    setSearchParams(searchParams);
  };

  if (isPodPage || isPodMap) return null;

  return (
    <header className={`${isHome ? 'absolute top-0 left-0 right-0 bg-transparent border-none pointer-events-none' : 'bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0'} z-[2000] px-4 py-3 flex-shrink-0`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-emerald-600 p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg">
            <Utensils className="text-white" size={20} />
          </div>
          <span className="text-lg sm:text-xl font-black tracking-tighter text-stone-900 drop-shadow-md hidden sm:inline">FIND A FOODCART <span className="text-[10px] sm:text-xs text-emerald-600">v2</span></span>
          <span className="text-lg font-black tracking-tighter text-stone-900 drop-shadow-md sm:hidden">FAF <span className="text-[10px] text-emerald-600">v2</span></span>
        </Link>

        {isHome && (
          <div className="mx-4 flex-1 max-w-xs">
            {searchTag ? (
              <div className="bg-emerald-600 rounded-full shadow-lg border border-emerald-500 flex items-center justify-between px-4 py-2 text-white">
                <div className="flex items-center overflow-hidden">
                  <Search size={18} className="mr-2 opacity-80 flex-shrink-0" />
                  <span className="font-bold text-sm uppercase truncate">{searchTag}</span>
                </div>
                <button 
                  onClick={() => setSearchTag('')}
                  className="ml-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-bold transition-colors flex-shrink-0"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-full shadow-lg border border-stone-200 flex items-center px-4 py-2 relative">
                <Search size={18} className="text-stone-400 mr-2 flex-shrink-0" />
                <select
                  className="w-full bg-transparent outline-none text-sm font-semibold text-stone-700 uppercase appearance-none cursor-pointer"
                  value={searchTag}
                  onChange={e => setSearchTag(e.target.value)}
                >
                  <option value="">All Food Types</option>
                  {availableTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <svg className="h-4 w-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            )}
          </div>
        )}

        <HamburgerMenu />
      </div>
    </header>
  );
}

function PermissionsGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'pending' | 'done'>('pending');

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.warn("Camera permission denied or error:", err);
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => {
            setStatus('done');
          },
          () => {
            setStatus('done');
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        setStatus('done');
      }
    };

    requestPermissions();
  }, []);

  if (status === 'pending') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-stone-100 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        <p className="text-stone-600 font-medium">Requesting camera and location permissions...</p>
      </div>
    );
  }

  return <>{children}</>;
}

function FavoritesPage() {
  const { user } = useAuth();
  const [favoriteCarts, setFavoriteCarts] = useState<Cart[]>([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [selectedCartForMenu, setSelectedCartForMenu] = useState<Cart | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);
  const [localFavorites, setLocalFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadFavorites = () => {
      setLoading(true);
      fetch('/api/carts')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const userEmail = user.email?.toLowerCase();
            const carts = data.filter((c: Cart) => c.favorites?.includes(userEmail || ''));
            setFavoriteCarts(carts);
            setLocalFavorites(carts.map(c => c.id));
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    };
    loadFavorites();
  }, [user]);

  const toggleFavorite = async (cartId: string) => {
    if (!user) return;

    const isFav = localFavorites.includes(cartId);
    setLocalFavorites(prev => isFav ? prev.filter(id => id !== cartId) : [...prev, cartId]);

    try {
      const token = await user.getIdToken();
      await fetch(`/api/carts/${cartId}/favorite`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to toggle favorite", err);
      setLocalFavorites(prev => isFav ? [...prev, cartId] : prev.filter(id => id !== cartId));
    }
  };

  if (!user) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-emerald-100 p-4 rounded-full mb-4">
          <Heart size={48} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Login to view favorites</h2>
        <p className="text-stone-500 mb-6 max-w-md">
          Sign in to save your favorite food carts and access them from any device.
        </p>
        <button 
          onClick={() => navigate('/login')}
          className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
        >
          Login / Sign Up
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
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
                  <p className="text-stone-500 text-sm">{selectedCartForMenu.cuisine}</p>
                </div>
                <button 
                  onClick={() => setSelectedCartForMenu(null)}
                  className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-500"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {(() => {
                  let menuGallery: string[] = [];
                  try {
                    menuGallery = typeof selectedCartForMenu.menuGallery === 'string' ? JSON.parse(selectedCartForMenu.menuGallery) : (Array.isArray(selectedCartForMenu.menuGallery) ? selectedCartForMenu.menuGallery : []);
                    if (!Array.isArray(menuGallery)) menuGallery = [];
                  } catch (e) {
                    menuGallery = [];
                  }
                  
                  if (menuGallery.length > 0) {
                    return (
                      <div className="flex flex-col gap-6">
                        {menuGallery.map((url, idx) => (
                          <img 
                            key={idx} 
                            src={url} 
                            alt={`Menu page ${idx + 1}`} 
                            className="w-full rounded-xl shadow-sm border border-stone-100"
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-center py-12">
                        <FileText size={48} className="mx-auto text-stone-300 mb-4" />
                        <p className="text-stone-500 text-lg">No menu photos available for this cart.</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {slideshowIndex !== null && favoriteCarts[slideshowIndex] && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[5000] flex items-center justify-center"
            onClick={() => setSlideshowIndex(null)}
          >
            <button 
              className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition-colors z-[5001]"
              onClick={() => setSlideshowIndex(null)}
            >
              <X size={32} />
            </button>
            <button 
              className="absolute left-4 text-white p-4 hover:bg-white/20 rounded-full transition-colors z-[5001]"
              onClick={(e) => { e.stopPropagation(); setSlideshowIndex((prev) => (prev! - 1 + favoriteCarts.length) % favoriteCarts.length); }}
            >
              <ChevronLeft size={48} />
            </button>
            <button 
              className="absolute right-4 text-white p-4 hover:bg-white/20 rounded-full transition-colors z-[5001]"
              onClick={(e) => { e.stopPropagation(); setSlideshowIndex((prev) => (prev! + 1) % favoriteCarts.length); }}
            >
              <ChevronRight size={48} />
            </button>
            
            <img 
              src={favoriteCarts[slideshowIndex].imageUrl || `https://picsum.photos/seed/cart-${favoriteCarts[slideshowIndex].id}/800/600`}
              alt={favoriteCarts[slideshowIndex].name}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
            
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent text-white flex flex-col items-center z-[5001]">
              <h2 className="text-2xl sm:text-4xl font-bold">{favoriteCarts[slideshowIndex].name}</h2>
              <p className="text-stone-300 mt-1 text-sm sm:text-lg max-w-2xl text-center">{favoriteCarts[slideshowIndex].description}</p>
              
              <div className="flex gap-3 mt-4 justify-center">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(favoriteCarts[slideshowIndex].id); }}
                  className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm sm:text-base ${localFavorites.includes(favoriteCarts[slideshowIndex].id) ? 'bg-rose-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                >
                  <Heart size={18} fill={localFavorites.includes(favoriteCarts[slideshowIndex].id) ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedCartForMenu(favoriteCarts[slideshowIndex]); setSlideshowIndex(null); }}
                  className="bg-white text-black px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-200 transition-colors text-sm sm:text-base"
                >
                  <FileText size={18} /> Menu
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate(`/pod/${favoriteCarts[slideshowIndex].podId}/map?highlight=${favoriteCarts[slideshowIndex].id}`); setSlideshowIndex(null); }}
                  className="bg-emerald-600 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-colors text-sm sm:text-base"
                >
                  <MapPin size={18} /> Map
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-black text-stone-900">Favorites</h1>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-stone-500">Loading your favorites...</p>
        </div>
      ) : favoriteCarts.length === 0 ? (
        <div className="text-center text-stone-500 italic py-12">
          <Heart size={48} className="mx-auto text-stone-300 mb-4" />
          <p className="text-lg font-medium text-stone-900">No favorites yet</p>
          <p className="mb-6">Start exploring and heart the carts you love!</p>
          <button 
            onClick={() => navigate('/')}
            className="text-emerald-600 font-bold hover:underline"
          >
            Explore Map
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteCarts.map((cart, index) => (
            <div 
              key={cart.id} 
              onClick={() => setSlideshowIndex(index)}
              className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col cursor-pointer"
            >
              <div className="relative h-48 sm:h-56 overflow-hidden">
                <img 
                  src={cart.imageUrl || `https://picsum.photos/seed/cart-${cart.id}/800/600`} 
                  alt={cart.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                {(() => {
                  try {
                    const tags = JSON.parse(cart.tags || '[]');
                    if (Array.isArray(tags) && tags.length > 0) {
                      return (
                        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((t, i) => (
                            <span key={i} className="bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-white/20">
                              {typeof t === 'string' ? t.substring(0, 5).toUpperCase() : (t.tag || t.name?.substring(0, 5).toUpperCase())}
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
                <h3 className="text-xl font-bold text-stone-900 group-hover:text-emerald-600 transition-colors line-clamp-1">{cart.name}</h3>
                <p className="text-stone-500 text-sm line-clamp-2 mb-4 flex-1">{cart.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <PermissionsGate>
      <AuthProvider>
        <EditModeProvider>
          <Router>
            <div className="h-screen flex flex-col overflow-hidden">
              <Header />
              {/* Main Content */}
              <main className="flex-1 relative overflow-y-auto">
                <Routes>
                  <Route path="/" element={<MapView />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/pod/new" element={<PodForm />} />
                  <Route path="/pod/:id" element={<PodPage />} />
                  <Route path="/pod/:id/edit" element={<PodForm />} />
                  <Route path="/pod/:id/map" element={<PodMapPage />} />
                  <Route path="/pod/:podId/cart/new" element={<CartForm />} />
                  <Route path="/cart/:id/owner" element={<CartOwnerPage />} />
                  <Route path="/cart/:id/edit" element={<CartForm />} />
                  <Route path="/moderator" element={<ModeratorPage />} />
                  <Route path="/favorites" element={<FavoritesPage />} />
                </Routes>
              </main>

            </div>
          </Router>
        </EditModeProvider>
      </AuthProvider>
    </PermissionsGate>
  );
}
