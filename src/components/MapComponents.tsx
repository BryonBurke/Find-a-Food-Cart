import React, { useState, useEffect } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import { Pod, Cart } from '../types';
import { useAuth } from '../AuthContext';

export function Directions({ 
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
  }, [directionsService, directionsRenderer, origin, destination, onRouteFetched]);

  return null;
}

export function MapZoomListener() {
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

export function MapPanner({ location, isActive, panTrigger, resetTrigger, onPanComplete }: { location: [number, number] | null, isActive: boolean, panTrigger?: number, resetTrigger?: number, onPanComplete?: () => void }) {
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
  }, [panTrigger, location, map, onPanComplete]);

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

  useEffect(() => {
    if (map && searchTag && pods.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      pods.forEach(pod => {
        bounds.extend({ lat: pod.latitude, lng: pod.longitude });
      });
      
      map.fitBounds(bounds, 50);
      
      if (pods.length === 1) {
        google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          if (map.getZoom()! > 16) map.setZoom(16);
        });
      }
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

  useEffect(() => {
    if (!map || !core || !carts || carts.length === 0) return;

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
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [map, core, carts, pod]);

  return null;
}
