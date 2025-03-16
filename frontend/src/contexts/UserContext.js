import React, { createContext, useState, useEffect } from 'react';
import { getToken, getUserFromToken } from '../utils/auth';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadUser = async () => {
      const token = getToken();
      if (token) {
        const userData = getUserFromToken(token);
        setUser(userData);
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