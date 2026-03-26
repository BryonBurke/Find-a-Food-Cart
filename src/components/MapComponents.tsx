import React, { useState, useEffect } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import { Pod, Cart } from '../types';
import { useAuth } from '../AuthContext';
import { getDistance } from '../utils';

export function Directions({ 
  origin, 
  destination, 
  avoidHighways = false,
  routeIndex = 0,
  onRouteFetched,
  onRoutesAvailable
}: { 
  origin: [number, number], 
  destination: [number, number],
  avoidHighways?: boolean,
  routeIndex?: number,
  onRouteFetched: (route: google.maps.DirectionsRoute) => void,
  onRoutesAvailable?: (routes: google.maps.DirectionsRoute[]) => void
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
      preserveViewport: true,
      polylineOptions: {
        strokeColor: '#10b981',
        strokeOpacity: 0.8,
        strokeWeight: 6,
      }
    }));
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !map) return;

    directionsRenderer.setMap(map);
    directionsRenderer.setRouteIndex(routeIndex);

    directionsService.route({
      origin: { lat: origin[0], lng: origin[1] },
      destination: { lat: destination[0], lng: destination[1] },
      travelMode: google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: true,
      avoidHighways: avoidHighways,
    }).then(response => {
      directionsRenderer.setDirections(response);
      
      const panel = document.getElementById('directions-panel');
      if (panel) {
        directionsRenderer.setPanel(panel);
      }

      if (onRoutesAvailable) {
        onRoutesAvailable(response.routes);
      }

      const route = response.routes[routeIndex];
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
  }, [directionsService, directionsRenderer, map, origin, destination, avoidHighways, routeIndex, onRouteFetched, onRoutesAvailable]);

  return null;
}

export function MapZoomListener() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const initialZoom = map.getZoom();
    if (initialZoom !== undefined) {
      window.dispatchEvent(new CustomEvent('map-zoom-changed', { detail: initialZoom }));
    }
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

export function MapPanner({ location, isActive, panTrigger, resetTrigger, onPanComplete }: { location: { lat: number, lng: number, heading: number | null } | null, isActive: boolean, panTrigger?: number, resetTrigger?: number, onPanComplete?: () => void }) {
  const map = useMap();
  const lastProcessedPan = React.useRef<number>(0);
  const lastPannedLoc = React.useRef<{ lat: number, lng: number } | null>(null);
  const isNavStarting = React.useRef(false);

  useEffect(() => {
    if (isActive) {
      isNavStarting.current = true;
    } else {
      isNavStarting.current = false;
      lastPannedLoc.current = null;
    }
  }, [isActive]);

  useEffect(() => {
    if (!map || !location) return;

    const handleInitialNav = () => {
      map.setZoom(18);
      map.setCenter({ lat: location.lat, lng: location.lng });
      isNavStarting.current = false;
      lastPannedLoc.current = { lat: location.lat, lng: location.lng };
    };

    const handlePanTrigger = () => {
      map.panTo({ lat: location.lat, lng: location.lng });
      map.setZoom(18);
      map.setMapTypeId('roadmap');
      lastProcessedPan.current = panTrigger!;
      if (onPanComplete) onPanComplete();
    };

    if (isActive && isNavStarting.current) {
      handleInitialNav();
    } else if (panTrigger && panTrigger > lastProcessedPan.current) {
      handlePanTrigger();
    } else if (isActive) {
      const dist = getDistance(lastPannedLoc.current?.lat || 0, lastPannedLoc.current?.lng || 0, location.lat, location.lng);
      if (dist > 2) {
        map.panTo({ lat: location.lat, lng: location.lng });
        lastPannedLoc.current = { lat: location.lat, lng: location.lng };
      }
    }
  }, [location, isActive, panTrigger, map, onPanComplete]);

  useEffect(() => {
    if (resetTrigger && resetTrigger > 0 && map) {
      map.setZoom(13);
      map.setMapTypeId('roadmap');
    }
  }, [resetTrigger, map]);

  return null;
}

export function MapFitter({ pods, searchTag }: { pods: Pod[], searchTag: string }) {
  const map = useMap();
  const lastSearchTag = React.useRef<string>('');

  useEffect(() => {
    if (map && searchTag && pods.length > 0 && searchTag !== lastSearchTag.current) {
      const bounds = new google.maps.LatLngBounds();
      pods.forEach(pod => {
        bounds.extend({ lat: pod.latitude, lng: pod.longitude });
      });
      
      map.fitBounds(bounds, 50);
      lastSearchTag.current = searchTag;
      
      if (pods.length === 1) {
        google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          if (map.getZoom()! > 16) map.setZoom(16);
        });
      }
    } else if (!searchTag) {
      lastSearchTag.current = '';
    }
  }, [map, searchTag, pods]);

  return null;
}

export function CenterPodButton({ pod, setPod }: { pod: Pod, setPod: (p: Pod) => void }) {
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

export function MapBoundsHandler({ carts, pod }: { carts: Cart[], pod: Pod }) {
  const map = useMap();
  const core = useMapsLibrary('core');
  const hasFitted = React.useRef(false);
  const lastPodId = React.useRef<string | null>(null);

  useEffect(() => {
    if (!map || !core || !carts || carts.length === 0) return;

    // Reset if pod changes
    if (lastPodId.current !== pod.id) {
      hasFitted.current = false;
      lastPodId.current = pod.id;
    }

    if (hasFitted.current) return;

    const bounds = new core.LatLngBounds();
    bounds.extend({ lat: pod.latitude, lng: pod.longitude });
    
    let hasPlacedCarts = false;
    carts.forEach(cart => {
      if (cart.latitude !== undefined && cart.latitude !== null && 
          cart.longitude !== undefined && cart.longitude !== null) {
        bounds.extend({ lat: cart.latitude, lng: cart.longitude });
        hasPlacedCarts = true;
      }
    });

    if (hasPlacedCarts) {
      const timer = setTimeout(() => {
        map.fitBounds(bounds, { top: 80, bottom: 80, left: 40, right: 40 });
        hasFitted.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [map, core, carts, pod]);

  return null;
}
