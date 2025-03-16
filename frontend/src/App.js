// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RehearsalSchedule from './pages/RehearsalSchedule';
import AdminPanel from './pages/AdminPanel';
import Navbar from './components/Navbar';
import { getToken } from './utils/auth';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    // Check if user is authenticated
    const token = getToken();
    console.log("App.js - Auth check:", token ? "Token found" : "No token found");
    setIsAuthenticated(!!token);
    setIsInitialized(true);
  }, []);
  
  // Add a useEffect to listen for localStorage changes
  useEffect(() => {
    const checkAuth = () => {
      const token = getToken();
      setIsAuthenticated(!!token);
    };
    
    // Check authentication status every 500ms
    const interval = setInterval(checkAuth, 500);
    
    // Listen for storage events (in case token is set in another tab)
    window.addEventListener('storage', checkAuth);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkAuth);
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
              <Route path="/schedule" element={isAuthenticated ? <RehearsalSchedule /> : <Navigate to="/login" />} />
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