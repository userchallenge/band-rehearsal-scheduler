// src/utils/api.js
import { getToken, removeToken } from './auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';

// Helper function to make API requests
const request = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include'
  };

  // Ensure endpoint doesn't start with a slash if API_URL ends with one
  const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  console.log('Making API request to:', url);
  
  try {
    const response = await fetch(url, config);

    // Handle authentication errors
    if (response.status === 401) {
      console.error('Authentication error');
      removeToken();
      window.location.href = '/login';
      throw new Error('Authentication error');
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API request failed:', response.status, errorData);
      throw new Error(errorData.msg || `API request failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Request error:', error);
    throw error;
  }
};

// Rehearsals
export const getRehearsals = () => {
  return request('rehearsals');
};

export const createRehearsal = (date) => {
  return request('rehearsals', {
    method: 'POST',
    body: JSON.stringify({ date })
  });
};

export const manageRehearsals = () => {
  return request('rehearsals/manage', {
    method: 'POST'
  });
};

// Responses
export const getResponses = (rehearsalId = null) => {
  const url = rehearsalId ? `responses?rehearsal_id=${rehearsalId}` : 'responses';
  return request(url);
};

export const updateResponse = (responseId, data) => {
  return request(`responses/${responseId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

// Users
export const getUsers = () => {
  return request('users');
};

export const createUser = (userData) => {
  return request('users', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};

// Email
export const sendEmail = () => {
  return request('email/send', {
    method: 'POST'
  });
};

export const debugToken = async () => {
  const token = getToken();
  console.log('Current token:', token);
  
  try {
    const response = await fetch(`${API_URL}/debug-token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    
    const data = await response.json();
    console.log('Token debug response:', data);
    return data;
  } catch (error) {
    console.error('Token debug error:', error);
    throw error;
  }
};