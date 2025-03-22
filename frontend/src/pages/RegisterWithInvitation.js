// src/pages/RegisterWithInvitation.js
import React, { useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import { registerWithInvitation, setToken } from '../utils/auth';
import './RegisterWithInvitation.css';

const RegisterWithInvitation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    try {
        setLoading(true);
        setError(null);
        
        // Remove confirmPassword before sending
        const { confirmPassword, ...userData } = formData;
        
        // Register with invitation token
        const data = await registerWithInvitation(token, userData);
        
        // Store token
        setToken(data.access_token);
        
        // Save user info in context with more data
        setUser({
          id: data.user_id,
          isAdmin: data.is_admin,
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name
        });
        
        // Store user info in localStorage with more complete data
        localStorage.setItem('user_info', JSON.stringify({
          id: data.user_id,
          isAdmin: data.is_admin,
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name
        }));
        
        // Dispatch a custom event to notify app of authentication change
        window.dispatchEvent(new Event('auth-changed'));
        
        // Navigate to dashboard
        navigate('/');
        
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. The invitation might be invalid or expired.');
      setLoading(false);
    }
  };
  
  return (
    <div className="register-container">
      <div className="register-form">
        <h1>Band Rehearsal Scheduler</h1>
        <h2>Create Your Account</h2>
        <p className="invitation-message">You've been invited to join the Band Rehearsal Scheduler!</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name</label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={formData.first_name}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterWithInvitation;