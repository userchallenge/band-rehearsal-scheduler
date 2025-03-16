// src/pages/Login.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import { loginUser, setToken } from '../utils/auth';
import { manageRehearsals } from '../utils/api';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Login form submitted');
    
    setError('');
    setLoading(true);
    
    try {
      console.log('Attempting login with username:', username);
      
      const data = await loginUser(username, password);
      console.log('Login successful, received data:', data);
      
      // Store token
      setToken(data.access_token);
      
      // Save user info in context
      console.log('Setting user context with:', { id: data.user_id, isAdmin: data.is_admin });
      setUser({
        id: data.user_id,
        isAdmin: data.is_admin
      });
      
      // Store user info in localStorage as backup
      localStorage.setItem('user_info', JSON.stringify({
        id: data.user_id,
        isAdmin: data.is_admin
      }));
      
      // Manage rehearsals automatically for any user login
      try {
        await manageRehearsals();
        console.log('Rehearsals automatically updated on login');
      } catch (rehearsalErr) {
        console.error('Failed to automatically update rehearsals:', rehearsalErr);
        // Don't block login if this fails
      }
      
      console.log('Navigating to dashboard...');
      
      // Add a small delay to ensure context is updated
      setTimeout(() => {
        navigate('/');
      }, 100);
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid username or password');
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
      </div>
    </div>
  );
};

export default Login;