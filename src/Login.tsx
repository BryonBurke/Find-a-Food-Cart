import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
      setError('');
    } catch (err: any) {
      setError(err.message);
      setMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset email sent! Check your inbox.');
      } else if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-3xl shadow-sm border border-stone-100">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {mode === 'login' ? 'Log In' : mode === 'signup' ? 'Sign Up' : 'Reset Password'}
      </h2>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm">{error}</div>}
      {message && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl mb-4 text-sm">{message}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-emerald-500 outline-none"
            required
          />
        </div>
        {mode !== 'forgot' && (
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            />
          </div>
        )}
        {mode === 'login' && (
          <div className="text-right">
            <button 
              type="button" 
              onClick={() => {
                setMode('forgot');
                setError('');
                setMessage('');
              }} 
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Forgot password?
            </button>
          </div>
        )}
        <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
          {mode === 'login' ? 'Log In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Email'}
        </button>
      </form>
      <div className="mt-4 text-center flex flex-col gap-2">
        {mode === 'forgot' ? (
          <button onClick={() => setMode('login')} className="text-sm text-emerald-600 hover:underline">
            Back to Log In
          </button>
        ) : (
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-sm text-emerald-600 hover:underline">
            {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
          </button>
        )}
      </div>
    </div>
  );
}
