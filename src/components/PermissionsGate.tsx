import React, { useState, useEffect } from 'react';
import { Shield, MapPin, Camera, Mic } from 'lucide-react';

export function PermissionsGate({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<{
    geolocation: PermissionState | null;
    camera: PermissionState | null;
    microphone: PermissionState | null;
  }>({
    geolocation: null,
    camera: null,
    microphone: null
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const geo = await navigator.permissions.query({ name: 'geolocation' as any });
        const cam = await navigator.permissions.query({ name: 'camera' as any });
        const mic = await navigator.permissions.query({ name: 'microphone' as any });

        setPermissions({
          geolocation: geo.state,
          camera: cam.state,
          microphone: mic.state
        });

        geo.onchange = () => setPermissions(prev => ({ ...prev, geolocation: geo.state }));
        cam.onchange = () => setPermissions(prev => ({ ...prev, camera: cam.state }));
        mic.onchange = () => setPermissions(prev => ({ ...prev, microphone: mic.state }));
      } catch (err) {
        console.error("Permissions query not supported", err);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, []);

  if (loading) return null;

  const needsPermissions = permissions.geolocation === 'prompt' || permissions.camera === 'prompt' || permissions.microphone === 'prompt';

  if (needsPermissions) {
    return (
      <div className="fixed inset-0 bg-stone-900 z-[9999] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-emerald-500/20">
            <Shield size={40} />
          </div>
          <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Permissions Required</h1>
          <p className="text-stone-400 text-lg mb-12 leading-relaxed">
            To provide the best experience, PodMap needs access to your location, camera, and microphone.
          </p>
          
          <div className="grid grid-cols-3 gap-4 mb-12">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <MapPin className="mx-auto mb-2 text-emerald-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Location</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <Camera className="mx-auto mb-2 text-emerald-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Camera</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <Mic className="mx-auto mb-2 text-emerald-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Audio</p>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-white text-stone-900 py-4 rounded-2xl font-black text-lg hover:bg-stone-100 transition-all active:scale-[0.98]"
          >
            GRANT ACCESS
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
