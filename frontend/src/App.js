// src/App.js
import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, UserContext } from './contexts/UserContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import BandSelection from './components/BandSelection';
import Navbar from './components/Navbar';
import SuperAdminPanel from './pages/SuperAdminPanel';
import { getToken } from './utils/auth';
import { manageRehearsals } from './utils/api';
import './App.css';

// Inner app component that has access to UserContext
const AppContent = () => {
  const { user, currentBand, setCurrentBand, loading } = useContext(UserContext);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    // This effect runs when the component mounts
    const checkAuth = () => {
      try {
        const token = getToken();
        const authenticated = !!token;
        setIsAuthenticated(authenticated);
        
        // If not authenticated, ensure we're on the login page
        if (!authenticated && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } catch (err) {
        console.error("Error checking auth:", err);
        setIsAuthenticated(false);
      }
    };
    
    // Check immediately
    checkAuth();
    
    // If authenticated and band is selected, try to manage rehearsals automatically
    const autoManageRehearsals = async () => {
      const token = getToken();
      if (token && currentBand) {
        try {
          await manageRehearsals(currentBand.id);
          console.log('Rehearsals automatically updated on app load');
        } catch (err) {
          console.error('Error in auto rehearsal management:', err);
          // Don't block app loading if this fails
        }
      }
    };
    
    if (user && currentBand) {
      autoManageRehearsals();
    }
    
    // Set up a listener for storage events (if token changes in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'band_app_token') {
        checkAuth();
      }
    };
    
    // Listen for auth-changed events
    const handleAuthChanged = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-changed', handleAuthChanged);
    
    setIsInitialized(true);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleAuthChanged);
    };
  }, [user, currentBand]);
  
  const handleBandSelect = async (band) => {
    console.log("Band selected:", band);
    if (band) {
      setCurrentBand(band);
      
      // Now that we have a band, we can manage rehearsals
      try {
        await manageRehearsals(band.id);
        console.log(`Rehearsals automatically updated for band: ${band.name}`);
      } catch (err) {
        console.error('Error in rehearsal management after band selection:', err);
        // Don't block navigation if this fails
      }
    }
  };
  
  if (!isInitialized || loading) {
    return <div className="loading-container">Loading...</div>;
  }
  
  return (
    <div className="app">
      {isAuthenticated && <Navbar />}
      <main className="main-content">
        {!isAuthenticated ? (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        ) : !currentBand ? (
          <BandSelection onBandSelect={handleBandSelect} />
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route 
              path="/admin" 
              element={(currentBand?.role === 'admin' || user?.isSuperAdmin) ? 
                <AdminPanel /> : <Navigate to="/" />
              } 
            />
            <Route 
              path="/super-admin" 
              element={user?.isSuperAdmin ? <SuperAdminPanel /> : <Navigate to="/" />} 
            />
            <Route 
              path="/select-band" 
              element={<BandSelection onBandSelect={handleBandSelect} />} 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </main>
    </div>
  );
};

// Main App component

// NEXT: Kan inte se admin-panelen när jag är inloggad som admin, 
// "Failed to load data. Please try again later." - istf att antingen se dashboard e dyl.
function App() {
  return (
    <UserProvider>
      <Router>
        <AppContent />
      </Router>
    </UserProvider>
  );
}

export default App;