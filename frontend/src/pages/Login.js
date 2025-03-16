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
    console.log('Form submitted'); // Debug log
    alert('Login button clicked'); // Simple alert to confirm click
    
    setError('');
    setLoading(true);
    
    try {
      console.log('Attempting login with username:', username);
      
      // Test API connectivity first
      try {
        const testResponse = await fetch('http://127.0.0.1:5000/api/test');
        const testData = await testResponse.json();
        console.log('API test successful:', testData);
      } catch (testErr) {
        console.error('API test failed:', testErr);
      }
      
      // Proceed with actual login
      const data = await loginUser(username, password);
      console.log('Login successful, data:', data);
      
      setToken(data.access_token);
      setUser({
        id: data.user_id,
        isAdmin: data.is_admin
      });
      
      console.log('Navigating to dashboard...');
      navigate('/');
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