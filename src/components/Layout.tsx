import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft, Utensils, Search, Menu, X,
  Map as MapIcon, List, Edit2, Trash2, Info, 
  ExternalLink, LogOut, ShieldCheck, Star, Plus,
  Navigation, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { useEditMode } from '../EditModeContext';
import { useTutorial } from '../TutorialContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Cart } from '../types';

export function HamburgerMenu({ isPodPage = false, podId, onDelete }: { isPodPage?: boolean, podId?: string, onDelete?: () => void }) {
  const { user } = useAuth();
  const { editMode, toggleEditMode } = useEditMode();
  const { startTutorial, step, nextStep } = useTutorial();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && step === 'OPEN_MENU') {
      nextStep('OPEN_MENU', 'CLICK_ADD_POD');
    }
  }, [isOpen, step, nextStep]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
    setIsOpen(false);
  };

  const isModerator = user?.email?.toLowerCase() === 'bryonparis@gmail.com';

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-600"
      >
        <Menu size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-stone-100 z-[3001] overflow-hidden"
          >
            <div className="p-4 border-b border-stone-50 bg-stone-50/50">
              <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Account</div>
              <div className="text-sm font-bold text-stone-900 truncate">{user?.email || 'Guest User'}</div>
            </div>

            <div className="p-2">
              <Link 
                to="/carts" 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-emerald-50 text-stone-700 hover:text-emerald-700 transition-colors"
              >
                <Navigation size={20} />
                <span className="font-bold text-sm">Cart List</span>
              </Link>

              {user && (
                <button 
                  onClick={() => { toggleEditMode(); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${editMode ? 'bg-amber-100 text-amber-700' : 'hover:bg-amber-50 text-stone-700 hover:text-amber-700'}`}
                >
                  <Edit2 size={20} />
                  <span className="font-bold text-sm">{editMode ? 'Disable Edit Mode' : 'Enable Edit Mode'}</span>
                </button>
              )}

              {user && (
                <button 
                  onClick={() => { 
                    navigate('/?mode=add'); 
                    setIsOpen(false); 
                    nextStep('CLICK_ADD_POD', 'CLICK_MAP');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-emerald-50 text-stone-700 hover:text-emerald-700 transition-colors"
                >
                  <Plus size={20} />
                  <span className="font-bold text-sm">Add Pod</span>
                </button>
              )}

              <button 
                onClick={() => { startTutorial(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-emerald-50 text-stone-700 hover:text-emerald-700 transition-colors"
              >
                <Play size={20} />
                <span className="font-bold text-sm">Add Cart Tutorial</span>
              </button>

              {isModerator && (
                <Link 
                  to="/moderator" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-blue-50 text-stone-700 hover:text-blue-700 transition-colors"
                >
                  <ShieldCheck size={20} />
                  <span className="font-bold text-sm">Moderator Panel</span>
                </Link>
              )}

              {isPodPage && editMode && (
                <button 
                  onClick={() => { onDelete?.(); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-rose-50 text-rose-600 transition-colors"
                >
                  <Trash2 size={20} />
                  <span className="font-bold text-sm">Delete Pod</span>
                </button>
              )}

              <div className="my-2 border-t border-stone-50" />

              {user ? (
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-stone-100 text-stone-500 transition-colors"
                >
                  <LogOut size={20} />
                  <span className="font-bold text-sm">Sign Out</span>
                </button>
              ) : (
                <Link 
                  to="/login" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                >
                  <LogOut size={20} />
                  <span className="font-bold text-sm">Sign In</span>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isHome = location.pathname === '/';
  const podIdMatch = location.pathname.match(/^\/pod\/([^/]+)/);
  const podId = podIdMatch && podIdMatch[1] !== 'new' ? podIdMatch[1] : undefined;
  
  const [availableTags, setAvailableTags] = useState<{name: string, tag: string}[]>([]);
  
  useEffect(() => {
    const loadTags = () => {
      fetch('/api/tags')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAvailableTags(data);
        })
        .catch(console.error);
    };
    loadTags();
    window.addEventListener('carts-updated', loadTags);
    return () => window.removeEventListener('carts-updated', loadTags);
  }, []);

  const searchTag = searchParams.get('tag') || '';
  const setSearchTag = (tag: string) => {
    if (tag) {
      searchParams.set('tag', tag);
    } else {
      searchParams.delete('tag');
    }
    setSearchParams(searchParams);
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-[2000] px-4 py-3 flex-shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-4">
          {location.pathname !== '/' && (
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-600">
              <ChevronLeft size={24} />
            </button>
          )}
          <Link 
            to="/" 
            className="flex items-center gap-2 group"
            onClick={() => window.dispatchEvent(new Event('reset-map'))}
          >
            <div className="bg-emerald-600 p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg">
              <Utensils className="text-white" size={20} />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tighter text-stone-900 drop-shadow-md hidden sm:inline">GET FOODCART <span className="text-[10px] sm:text-xs text-emerald-600">v2</span></span>
            <span className="text-lg font-black tracking-tighter text-stone-900 drop-shadow-md sm:hidden">GFC <span className="text-[10px] text-emerald-600">v2</span></span>
          </Link>
        </div>

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
                  {availableTags.map(t => (
                    <option key={t.tag} value={t.tag}>{t.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <svg className="h-4 w-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            )}
          </div>
        )}

        <HamburgerMenu podId={podId} />
      </div>
    </header>
  );
}

export function PermissionsGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'pending' | 'done'>('pending');

  useEffect(() => {
    if (!user) {
      setStatus('done');
      return;
    }

    setStatus('pending');
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      if (isMounted) setStatus('done');
    }, 8000); // Global 8s timeout for permissions

    const requestPermissions = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          // Try video first
          try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoStream.getTracks().forEach(track => track.stop());
          } catch (vErr) {
            console.warn("Camera permission denied:", vErr);
          }
          
          // Then try audio
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStream.getTracks().forEach(track => track.stop());
          } catch (aErr) {
            console.warn("Microphone permission denied:", aErr);
          }
        }
      } catch (err) {
        console.warn("Permissions request error:", err);
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => {
            clearTimeout(timeoutId);
            if (isMounted) setStatus('done');
          },
          () => {
            clearTimeout(timeoutId);
            if (isMounted) setStatus('done');
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        clearTimeout(timeoutId);
        if (isMounted) setStatus('done');
      }
    };

    requestPermissions();
    return () => { isMounted = false; clearTimeout(timeoutId); };
  }, [user]);

  if (status === 'pending') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-stone-100 gap-6 p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        <div className="space-y-2">
          <p className="text-stone-900 font-bold text-lg">Setting up your experience...</p>
          <p className="text-stone-500 text-sm max-w-xs">We're requesting camera and location permissions to help you find and document food carts.</p>
          <p className="text-emerald-600 text-xs mt-4 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
            <strong>Tip:</strong> If permissions are blocked, try opening the app in a <strong>new tab</strong> using the button in the top right menu.
          </p>
        </div>
        <button 
          onClick={() => setStatus('done')}
          className="mt-4 text-emerald-600 font-bold hover:underline"
        >
          Skip for now
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
