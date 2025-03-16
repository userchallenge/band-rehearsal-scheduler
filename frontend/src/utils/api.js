// src/utils/api.js - Updated to ensure proper token format
import { getToken, removeToken } from './auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';

// Helper function to make API requests
const request = async (endpoint, options = {}) => {
  const token = getToken();
  console.log('[API] Using token (first 15 chars):', token ? token.substring(0, 15) + '...' : 'no token');
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers
  };

  if (token) {
    // Format exactly as "Bearer <token>" - ensure no extra spaces or characters
    headers['Authorization'] = `Bearer ${token}`;
    console.log('[API] Authorization header set:', headers['Authorization'].substring(0, 20) + '...');
  } else {
    console.log('[API] No token available for request');
  }

  const config = {
    ...options,
    headers,
    credentials: 'include'
  };

  // Ensure endpoint doesn't start with a slash if API_URL ends with one
  const url = endpoint.startsWith('/')
    ? `${API_URL}${endpoint}`
    : `${API_URL}/${endpoint}`;
  
  console.log(`[API] ${options.method || 'GET'} request to:`, url);
  
  try {
    const response = await fetch(url, config);
    console.log(`[API] Response status:`, response.status);

    // Handle authentication errors
    if (response.status === 401) {
      console.error('[API] Authentication error (401)');
      removeToken();
      window.location.href = '/login';
      throw new Error('Authentication error - token may be invalid or expired');
    }

    // Handle unprocessable entity (usually token format issues)
    if (response.status === 422) {
      console.error('[API] Token validation failed (422)');
      // Don't remove token here, it might just be a format issue
      throw new Error('Token validation failed - check format and expiration');
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[API] Request failed:', response.status, errorData);
      throw new Error(errorData.msg || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('[API] Response data:', data);
    return data;
  } catch (error) {
    console.error('[API] Request error:', error.message);
    throw error;
  }
};

// Existing API functions...
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

export const getUsers = () => {
  return request('users');
};

export const createUser = (userData) => {
  return request('users', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};

export const sendEmail = () => {
  return request('email/send', {
    method: 'POST'
  });
};

// Debug utilities
export const checkTokenStatus = () => {
  const token = localStorage.getItem('band_app_token');
  const hasToken = !!token;
  const tokenPreview = hasToken ? `${token.substring(0, 15)}...` : 'No token found';
  
  console.log('[DEBUG] Token check:', { hasToken, tokenPreview });
  return { hasToken, tokenPreview };
};

export const directTestRehearsals = async () => {
  try {
    const token = localStorage.getItem('band_app_token');
    console.log('[DEBUG] Direct test using token:', token ? `${token.substring(0, 15)}...` : 'none');
    
    const response = await fetch(`${API_URL}/rehearsals`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('[DEBUG] Direct test response status:', response.status);
    
    try {
      const data = await response.json();
      console.log('[DEBUG] Direct test response data:', data);
      return { status: response.status, data };
    } catch (jsonError) {
      console.error('[DEBUG] Failed to parse JSON response:', jsonError);
      return { status: response.status, error: 'Failed to parse response' };
    }
  } catch (error) {
    console.error('[DEBUG] Direct test error:', error);
    return { error: error.message };
  }
};