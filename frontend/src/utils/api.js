// src/utils/api.js
import { getToken} from './auth';

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
    // Format exactly as "Bearer <token>" - ensure no extra spaces or characters
    headers['Authorization'] = `Bearer ${token}`;
    console.log('[API] Setting Authorization header');
  } else {
    console.log('[API] No token available for request to:', endpoint);
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
      // Don't remove token for debugging purposes
      // removeToken();
      // window.location.href = '/login';
      throw new Error('Authentication error - token may be invalid or expired');
    }

    // Handle unprocessable entity (usually token format issues)
    if (response.status === 422) {
      console.error('[API] Token validation failed (422)');
      throw new Error('Token validation failed - check format and expiration');
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[API] Request failed:', response.status, errorData);
      throw new Error(errorData.msg || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[API] Request error:', error.message);
    throw error;
  }
};

// Rehearsals
export const getRehearsals = () => {
  return request('rehearsals');
};

export const getRehearsalById = (id) => {
  return request(`rehearsals/${id}`);
};

export const createRehearsal = (rehearsalData) => {
  console.log('API createRehearsal called with data:', rehearsalData);
  
  // Make sure we're passing a proper object
  if (!rehearsalData || typeof rehearsalData !== 'object') {
    console.error('Invalid rehearsal data type:', typeof rehearsalData);
    throw new Error('Invalid rehearsal data format');
  }
  
  return request('rehearsals', {
    method: 'POST',
    body: JSON.stringify(rehearsalData),
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

export const updateRehearsal = (id, data) => {
  return request(`rehearsals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const deleteRehearsal = (id, deleteAllRecurring = false) => {
  return request(`rehearsals/${id}?delete_all_recurring=${deleteAllRecurring}`, {
    method: 'DELETE'
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

export const getUserById = (userId) => {
  return request(`users/${userId}`);
};

export const createUser = (userData) => {
  return request('users', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};

export const updateUser = (userId, userData) => {
  return request(`users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });
};

export const deleteUser = (userId) => {
  return request(`users/${userId}`, {
    method: 'DELETE'
  });
};

// Email
export const sendEmail = () => {
  return request('email/send', {
    method: 'POST'
  });
};

// Debug utility
export const checkTokenStatus = () => {
  const token = localStorage.getItem('band_app_token');
  const hasToken = !!token;
  const tokenPreview = hasToken ? `${token.substring(0, 15)}...` : 'No token found';
  
  console.log('[DEBUG] Token check:', { hasToken, tokenPreview });
  return { hasToken, tokenPreview };
};