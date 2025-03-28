// src/utils/auth.js
import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'band_app_token';

export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getUserFromToken = (token) => {
  try {
    const decoded = jwtDecode(token);
    return {
      id: decoded.sub,
      isAdmin: decoded.is_admin,
      isSuperAdmin: decoded.is_super_admin,
      bands: decoded.bands || []
    };
  } catch (error) {
    return null;
  }
};

export const loginUser = async (username, password) => {
  const BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';
  const loginUrl = `${BASE_URL}/auth/login`;
  
  console.log('Sending login request to:', loginUrl);
  
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    credentials: 'include', // Include cookies if your API uses them
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Login failed:', errorData);
    throw new Error(errorData.msg || 'Login failed');
  }

  return response.json();
};