import React, { useState, useEffect } from 'react';
import { Camera, File, Mic, Navigation } from 'lucide-react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Pod } from '../types';

export function CameraInput({ onCapture, label, className, capture = true }: { onCapture: (url: string) => void, label?: React.ReactNode, className?: string, capture?: boolean }) {
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

export function FileInput({ onCapture, label, className }: { onCapture: (url: string) => void, label?: React.ReactNode, className?: string }) {
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await fileToDataUrl(file);
        onCapture(url);
      } catch (err) {
        console.error("Error uploading file:", err);
      }
    }
  };

  return (
    <label className={`cursor-pointer flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors text-emerald-700 font-medium ${className}`}>
      <File size={18} />
      <span>{label || 'Upload File'}</span>
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </label>
  );
}

export function VoiceInput({ onResult, className }: { onResult: (text: string) => void, className?: string }) {
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.start();
  };

  return (
    <button
      type="button"
      onClick={startListening}
      className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-stone-100 text-stone-400'} ${className}`}
      title="Voice Input"
    >
      <Mic size={18} />
    </button>
  );
}

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
  }, [directionsService, directionsRenderer, origin[0], origin[1], destination[0], destination[1]]);

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
  }, [panTrigger]);

  useEffect(() => {
    if (resetTrigger && resetTrigger > 0 && map) {
      map.setZoom(13);
      map.setMapTypeId('roadmap');
    }
  }, [resetTrigger]);

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

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 840;
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
