// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import Navbar from './components/Navbar';
import { getToken } from './utils/auth';
import { manageRehearsals } from './utils/api';
import './App.css';

function App() {
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


  // useEffect(() => {
  //   // This effect runs when the component mounts
  //   const checkAuth = () => {
  //     try {
  //       const token = getToken();
  //       console.log("Checking auth:", token ? "Token found" : "No token");
  //       setIsAuthenticated(!!token);
  //     } catch (err) {
  //       console.error("Error checking auth:", err);
  //       setIsAuthenticated(false);
  //     }
  //   };
    
  //   // Check immediately
  //   checkAuth();
    
    // If authenticated, try to manage rehearsals automatically
    const autoManageRehearsals = async () => {
      const token = getToken();
      if (token) {
        try {
          await manageRehearsals();
          console.log('Rehearsals automatically updated on app load');
        } catch (err) {
          console.error('Error in auto rehearsal management:', err);
          // Don't block app loading if this fails
        }
      }
    };
    
    autoManageRehearsals();
    
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
  }, []);
  
  if (!isInitialized) {
    return <div>Loading...</div>;
  }
  
  return (
    <UserProvider>
      <Router>
        <div className="app">
          {isAuthenticated && <Navbar />}
          <main className="main-content">
            <Routes>
              <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
              <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
              <Route path="/admin" element={isAuthenticated ? <AdminPanel /> : <Navigate to="/login" />} />
              <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
            </Routes>
          </main>
        </div>
      </Router>
    </UserProvider>
  );
}

export default App;