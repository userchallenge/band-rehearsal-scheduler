// src/pages/Login.js
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
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const data = await loginUser(username, password);
      setToken(data.access_token);
      setUser({
        id: data.user_id,
        isAdmin: data.is_admin
      });
      navigate('/');
    } catch (err) {
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

const handleSubmit = async (e) => {
  e.preventDefault();
  console.log('Login form submitted');
  setError('');
  setLoading(true);
  
  try {
    console.log('Attempting to login with:', username);
    const data = await loginUser(username, password);
    console.log('Login successful, received data:', data);
    setToken(data.access_token);
    setUser({
      id: data.user_id,
      isAdmin: data.is_admin
    });
    console.log('User state updated, navigating to dashboard');
    navigate('/');
  } catch (err) {
    console.error('Login error:', err);
    setError('Invalid username or password');
  } finally {
    setLoading(false);
  }
};

export default Login;