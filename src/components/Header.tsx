import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../AuthContext';
import { useEditMode } from '../EditModeContext';
import { UserIcon } from './Icons';
import { LogOut, Shield, ShieldOff, Menu, Heart, Map as MapIcon, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Header() {
  const { user } = useAuth();
  const { editMode, setEditMode } = useEditMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
      setIsMenuOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="bg-white border-b border-stone-200 h-16 flex-shrink-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center text-white group-hover:rotate-12 transition-transform">
            <Utensils size={20} />
          </div>
          <span className="text-xl font-black text-stone-900 tracking-tight">POD<span className="text-emerald-600">MAP</span></span>
        </Link>

        <div className="flex items-center gap-4">
          <Link 
            to="/favorites" 
            className={`p-2 rounded-xl transition-colors ${location.pathname === '/favorites' ? 'text-emerald-600 bg-emerald-50' : 'text-stone-500 hover:bg-stone-100'}`}
          >
            <Heart size={24} />
          </Link>
          
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors overflow-hidden border-2 border-transparent hover:border-stone-200"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={20} />
                )}
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-stone-100 p-2 z-50"
                    >
                      <div className="p-4 border-b border-stone-50 mb-2">
                        <p className="font-black text-stone-900 truncate">{user.displayName || 'User'}</p>
                        <p className="text-xs text-stone-400 truncate">{user.email}</p>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setEditMode(!editMode);
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 text-stone-600 font-bold text-sm transition-colors"
                      >
                        {editMode ? <ShieldOff size={18} className="text-red-500" /> : <Shield size={18} className="text-emerald-500" />}
                        {editMode ? 'Disable Edit Mode' : 'Enable Edit Mode'}
                      </button>

                      <button 
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-600 font-bold text-sm transition-colors"
                      >
                        <LogOut size={18} />
                        Sign Out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link to="/login" className="bg-stone-900 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-stone-800 transition-all shadow-lg shadow-stone-200">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
