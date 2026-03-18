import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { Utensils } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-stone-50">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 bg-stone-900 rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-stone-200 rotate-12">
          <Utensils size={48} />
        </div>
        <h1 className="text-5xl font-black text-stone-900 mb-4 tracking-tight">Welcome Back</h1>
        <p className="text-stone-500 text-lg mb-12 leading-relaxed">
          Sign in to save your favorite food carts, request ownership, and help keep the map up to date.
        </p>
        
        <button 
          onClick={handleGoogleSignIn}
          className="w-full bg-white text-stone-900 py-5 rounded-3xl font-black text-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-4 border border-stone-100 active:scale-[0.98]"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
          CONTINUE WITH GOOGLE
        </button>

        <p className="mt-12 text-stone-400 text-sm font-bold uppercase tracking-widest">
          Secure authentication by Firebase
        </p>
      </div>
    </div>
  );
}
