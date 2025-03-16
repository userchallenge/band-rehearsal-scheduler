// src/pages/Login.js - Updated with better debugging
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import { loginUser, setToken } from '../utils/auth';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted');
    setDebugInfo('Attempting login...');
    
    setError('');
    setLoading(true);
    
    try {
      console.log('Attempting login with username:', username);
      setDebugInfo(`Logging in as ${username}...`);
      
      // Test API connectivity first
      try {
        const testResponse = await fetch('http://127.0.0.1:5000/api/test');
        const testData = await testResponse.json();
        console.log('API test successful:', testData);
        setDebugInfo(prev => prev + '\nAPI test successful');
      } catch (testErr) {
        console.error('API test failed:', testErr);
        setDebugInfo(prev => prev + '\nAPI test failed: ' + testErr.message);
      }
      
      // Proceed with actual login
      const data = await loginUser(username, password);
      console.log('Login successful, data:', data);
      setDebugInfo(prev => prev + '\nLogin successful. Token received.');
      
      if (!data.access_token) {
        console.error('No access token in response!', data);
        setError('Authentication error: No token received');
        setDebugInfo(prev => prev + '\nERROR: No token in response!');
        return;
      }
      
      // Store token explicitly
      localStorage.setItem('band_app_token', data.access_token);
      console.log('Token stored in localStorage');
      setDebugInfo(prev => prev + '\nToken stored in localStorage.');
      
      // Verify token was stored
      const storedToken = localStorage.getItem('band_app_token');
      console.log('Verified stored token:', storedToken ? `${storedToken.substring(0, 15)}...` : 'none');
      setDebugInfo(prev => prev + '\nVerified token in storage: ' + (storedToken ? 'Yes' : 'No'));
      
      // This is just a compatibility call for your existing code
      setToken(data.access_token);
      
      // Set user context
      setUser({
        id: data.user_id,
        isAdmin: data.is_admin
      });
      
      console.log('Navigating to dashboard...');
      setDebugInfo(prev => prev + '\nNavigating to dashboard...');
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setDebugInfo(prev => prev + '\nERROR: ' + err.message);
      setError('Login failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="login-container">
      <div className="login-form">
        <h1>Band Rehearsal Scheduler</h1>
        <h2>Log In</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        {/* Debug info section */}
        {debugInfo && (
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
            <h3>Debug Info:</h3>
            <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto' }}>{debugInfo}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;