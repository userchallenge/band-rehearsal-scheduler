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
      isAdmin: decoded.is_admin
    };
  } catch (error) {
    return null;
  }
};

export const loginUser = async (username, password) => {
  const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
};