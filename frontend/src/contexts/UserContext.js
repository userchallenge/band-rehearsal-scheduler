// src/contexts/UserContext.js
import React, { createContext, useState, useEffect } from 'react';
import { getToken, getUserFromToken } from '../utils/auth';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [currentBand, setCurrentBand] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadUser = async () => {
      const token = getToken();
      console.log("Token in UserContext:", token ? "Token found" : "No token");
      
      if (token) {
        try {
          const userData = getUserFromToken(token);
          console.log("User data from token:", userData);
          setUser(userData);
          
          // Check for stored band selection
          const storedBandId = localStorage.getItem('current_band_id');
          const storedBandName = localStorage.getItem('current_band_name');
          const storedBandRole = localStorage.getItem('current_band_role');
          
          if (storedBandId) {
            setCurrentBand({
              id: parseInt(storedBandId),
              name: storedBandName,
              role: storedBandRole
            });
          }
        } catch (err) {
          console.error("Error parsing user data from token:", err);
        }
      }
      setLoading(false);
    };
    
    loadUser();
  }, []);
  
  const setUserAndBand = (userData) => {
    setUser(userData);
    
    // Clear current band when changing user
    setCurrentBand(null);
    localStorage.removeItem('current_band_id');
    localStorage.removeItem('current_band_name');
    localStorage.removeItem('current_band_role');
  };
  
  const selectBand = (band) => {
    if (band) {
      // Selecting a specific band
      setCurrentBand(band);
      localStorage.setItem('current_band_id', band.id);
      localStorage.setItem('current_band_name', band.name);
      localStorage.setItem('current_band_role', band.role);
    } else {
      // Clearing band selection
      setCurrentBand(null);
      localStorage.removeItem('current_band_id');
      localStorage.removeItem('current_band_name');
      localStorage.removeItem('current_band_role');
    }
  };
  
  return (
    <UserContext.Provider value={{ 
      user, 
      setUser: setUserAndBand, 
      currentBand, 
      setCurrentBand: selectBand, 
      loading 
    }}>
      {children}
    </UserContext.Provider>
  );
};