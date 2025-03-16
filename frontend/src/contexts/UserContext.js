// src/contexts/UserContext.js
import React, { createContext, useState, useEffect } from 'react';
import { getToken, getUserFromToken } from '../utils/auth';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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
        } catch (err) {
          console.error("Error parsing user data from token:", err);
        }
      }
      setLoading(false);
    };
    
    loadUser();
  }, []);
  
  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};