import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { EditModeProvider } from './EditModeContext';
import { TutorialProvider } from './TutorialContext';
import { TutorialOverlay } from './TutorialOverlay';
import { Header, PermissionsGate } from './components/Layout';

// Lazy load pages
const Login = lazy(() => import('./Login'));
const MapView = lazy(() => import('./pages/MapView'));
const PodPage = lazy(() => import('./pages/PodPage'));
const PodMapPage = lazy(() => import('./pages/PodMapPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const PodForm = lazy(() => import('./pages/PodForm'));
const CartForm = lazy(() => import('./pages/CartForm'));
const CartListPage = lazy(() => import('./pages/CartListPage'));
const CartOwnerPage = lazy(() => import('./pages/CartOwnerPage'));
const ModeratorPage = lazy(() => import('./pages/ModeratorPage'));

function LoadingSpinner() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-stone-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-screen flex flex-col bg-stone-50 overflow-hidden">
      <Header />
      <main className="flex-1 relative overflow-y-auto">
        <TutorialOverlay />
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<MapView />} />
            <Route path="/login" element={<Login />} />
            <Route path="/pod/new" element={user ? <PodForm /> : <Navigate to="/login" />} />
            <Route path="/pod/:id" element={<PodPage />} />
            <Route path="/pod/:id/map" element={<PodMapPage />} />
            <Route path="/pod/:id/edit" element={user ? <PodForm /> : <Navigate to="/login" />} />
            <Route path="/pod/:podId/cart/new" element={user ? <CartForm /> : <Navigate to="/login" />} />
            <Route path="/cart/:id" element={<CartPage />} />
            <Route path="/cart/:cartId/edit" element={user ? <CartForm /> : <Navigate to="/login" />} />
            <Route path="/cart/:id/claim" element={user ? <CartOwnerPage /> : <Navigate to="/login" />} />
            <Route path="/carts" element={<CartListPage />} />
            <Route path="/moderator" element={user?.email?.toLowerCase() === 'bryonparis@gmail.com' ? <ModeratorPage /> : <Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <EditModeProvider>
        <Router>
          <TutorialProvider>
            <PermissionsGate>
              <AppRoutes />
            </PermissionsGate>
          </TutorialProvider>
        </Router>
      </EditModeProvider>
    </AuthProvider>
  );
}
