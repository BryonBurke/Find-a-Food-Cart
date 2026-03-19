import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin, Plus, Navigation } from 'lucide-react';
import { Pod } from '../types';
import { useAuth } from '../AuthContext';
import { useEditMode } from '../EditModeContext';

export function PodList() {
  const { user } = useAuth();
  const { editMode } = useEditMode();
  const [pods, setPods] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPods = async () => {
      try {
        const res = await fetch('/api/pods');
        const data = await res.json();
        setPods(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPods();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading pods...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tight">Food Pods</h2>
          <p className="text-stone-500 font-bold uppercase tracking-widest text-xs mt-1">Discover Portland's Best</p>
        </div>
        {editMode && (
          <Link 
            to="/pod/new"
            className="bg-stone-900 text-white px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-stone-800 transition-all shadow-lg shadow-stone-200 active:scale-95"
          >
            <Plus size={18} />
            New Pod
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {pods.map((pod, index) => (
          <motion.div 
            key={pod.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link 
              to={`/pod/${pod.id}`}
              className="group block bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-stone-200 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img 
                  src={pod.imageUrl || `https://picsum.photos/seed/${pod.id}/800/600`} 
                  alt={pod.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                
                <div className="absolute top-6 right-6">
                  <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2">
                    <MapPin size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-stone-900 uppercase tracking-widest">Portland, OR</span>
                  </div>
                </div>

                <div className="absolute bottom-8 left-8 right-8">
                  <h3 className="text-2xl font-black text-white mb-2 tracking-tight group-hover:translate-x-2 transition-transform duration-500">{pod.name}</h3>
                  <div className="flex items-center gap-4 text-white/80 text-xs font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5">
                      <Navigation size={12} className="text-emerald-400" />
                      {pod.address.split(',')[0]}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <p className="text-stone-500 text-sm leading-relaxed line-clamp-2 mb-6">{pod.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-stone-100 overflow-hidden shadow-sm">
                        <img src={`https://i.pravatar.cc/100?img=${i + index * 3}`} alt="User" />
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-full border-4 border-white bg-stone-900 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                      +12
                    </div>
                  </div>
                  <span className="text-emerald-600 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-2 transition-transform">Explore Pod →</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
