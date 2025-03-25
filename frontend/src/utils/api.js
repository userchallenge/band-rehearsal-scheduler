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



export const updateResponse = (responseId, data, bandId) => {
  if (!bandId) {
    console.error('Band ID is required to update response');
    return Promise.reject(new Error('Band ID is required'));
  }
  
  return request(`responses/${responseId}?band_id=${bandId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

// export const updateResponse = (responseId, data) => {
//   return request(`responses/${responseId}`, {
//     method: 'PUT',
//     body: JSON.stringify(data)
//   });
// };

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

// Invitations
export const createInvitation = (email) => {
  return request('invitations', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
};

export const getInvitations = () => {
  return request('invitations');
};

export const deleteInvitation = (invitationId) => {
  return request(`invitations/${invitationId}`, {
    method: 'DELETE'
  });
};

export const registerWithInvitation = (token, userData) => {
  return request(`register/${token}`, {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};



// Make sure the getUserById function is properly exported in your utils/api.js file
// If you already have this function, make sure it's working correctly



// If you need to create a new user profile function, add this:
export const getUserProfile = () => {
  return request('users/profile');
};

// Create a new response for a user
export const createResponse = async (userId, rehearsalId, attending = true) => {
  return request('responses', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      rehearsal_id: rehearsalId,
      attending: attending
    })
  });
};

// Add these functions to src/utils/api.js

// Band management
export const getBands = () => {
  return request('bands');
};

export const createBand = (bandData) => {
  return request('bands', {
    method: 'POST',
    body: JSON.stringify(bandData)
  });
};

export const addBandMember = (bandId, userData) => {
  return request(`bands/${bandId}/members`, {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};

export const getBandMembers = (bandId) => {
  return request(`bands/${bandId}/members`);
};

export const removeBandMember = (bandId, userId) => {
  return request(`bands/${bandId}/members/${userId}`, {
    method: 'DELETE'
  });
};

// Update existing functions to include band_id parameter
export const getRehearsals = (bandId) => {
  if (!bandId) {
    console.error('Band ID is required to get rehearsals');
    return Promise.reject(new Error('Band ID is required'));
  }
  return request(`rehearsals?band_id=${bandId}`);
};

export const getRehearsalById = (id, bandId) => {
  if (!bandId) {
    console.error('Band ID is required to get rehearsal');
    return Promise.reject(new Error('Band ID is required'));
  }
  return request(`rehearsals/${id}?band_id=${bandId}`);
};

export const createRehearsal = (rehearsalData, bandId) => {
  if (!bandId) {
    console.error('Band ID is required to create rehearsal');
    return Promise.reject(new Error('Band ID is required'));
  }
  
  const data = { ...rehearsalData, band_id: bandId };
  return request('rehearsals', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateRehearsal = (id, data, bandId) => {
  if (!bandId) {
    console.error('Band ID is required to update rehearsal');
    return Promise.reject(new Error('Band ID is required'));
  }
  
  const updatedData = { ...data, band_id: bandId };
  return request(`rehearsals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updatedData)
  });
};

export const deleteRehearsal = (id, deleteAllRecurring = false, bandId) => {
  if (!bandId) {
    console.error('Band ID is required to delete rehearsal');
    return Promise.reject(new Error('Band ID is required'));
  }
  
  return request(`rehearsals/${id}?delete_all_recurring=${deleteAllRecurring}&band_id=${bandId}`, {
    method: 'DELETE'
  });
};

export const manageRehearsals = (bandId) => {
  if (!bandId) {
    console.error('Band ID is required to manage rehearsals');
    return Promise.reject(new Error('Band ID is required'));
  }
  
  return request(`rehearsals/manage?band_id=${bandId}`, {
    method: 'POST'
  });
};

// export const getResponses = (rehearsalId = null, bandId) => {
//   if (!bandId) {
//     console.error('Band ID is required to get responses');
//     return Promise.reject(new Error('Band ID is required'));
//   }
  
//   const url = rehearsalId 
//     ? `responses?rehearsal_id=${rehearsalId}&band_id=${bandId}` 
//     : `responses?band_id=${bandId}`;
  
//   return request(url);

// };

export const getResponses = (rehearsalId = null, bandId) => {
  if (!bandId) {
    console.error('Band ID is required to get responses');
    return Promise.reject(new Error('Band ID is required'));
  }
  
  const url = rehearsalId 
    ? `responses?rehearsal_id=${rehearsalId}&band_id=${bandId}` 
    : `responses?band_id=${bandId}`;
  
  return request(url);
};