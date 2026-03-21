import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { EditModeProvider } from './EditModeContext';
import { TutorialProvider } from './TutorialContext';
import { TutorialOverlay } from './TutorialOverlay';
import Login from './Login';
import MapView from './pages/MapView';
import PodPage from './pages/PodPage';
import PodMapPage from './pages/PodMapPage';
import CartPage from './pages/CartPage';
import PodForm from './pages/PodForm';
import CartForm from './pages/CartForm';
import CartListPage from './pages/CartListPage';
import CartOwnerPage from './pages/CartOwnerPage';
import ModeratorPage from './pages/ModeratorPage';
import { Header, PermissionsGate } from './components/Layout';

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-stone-50 overflow-hidden">
      <Header />
      <main className="flex-1 relative overflow-y-auto">
        <TutorialOverlay />
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
