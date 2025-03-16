// src/components/UserEditForm.js
import React, { useState, useEffect } from 'react';
import { getUserById, updateUser } from '../utils/api';
import './UserEditForm.css';

const UserEditForm = ({ userId, onCancel, onSuccess }) => {
  const [user, setUser] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_admin: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const userData = await getUserById(userId);
        // Don't include password in form data - it will be set only if user enters a new one
        setUser({
          username: userData.username,
          email: userData.email,
          password: '',
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          is_admin: userData.is_admin || false
        });
      } catch (err) {
        setError('Failed to load user data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [userId]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUser({
      ...user,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    
    try {
      // Only include password if it's not empty
      const updateData = { ...user };
      if (!updateData.password) {
        delete updateData.password;
      }
      
      await updateUser(userId, updateData);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to update user. Please try again.');
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div className="loading">Loading user data...</div>;
  }
  
  return (
    <form className="user-edit-form" onSubmit={handleSubmit}>
      <h3>Edit User</h3>
      
      {error && <div className="form-error">{error}</div>}
      
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          name="username"
          value={user.username}
          onChange={handleChange}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          name="email"
          value={user.email}
          onChange={handleChange}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="password">
          Password <span className="optional">(leave empty to keep current)</span>
        </label>
        <input
          id="password"
          type="password"
          name="password"
          value={user.password}
          onChange={handleChange}
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="first_name">First Name</label>
          <input
            id="first_name"
            type="text"
            name="first_name"
            value={user.first_name}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="last_name">Last Name</label>
          <input
            id="last_name"
            type="text"
            name="last_name"
            value={user.last_name}
            onChange={handleChange}
          />
        </div>
      </div>
      
      <div className="form-checkbox">
        <input
          id="is_admin"
          type="checkbox"
          name="is_admin"
          checked={user.is_admin}
          onChange={handleChange}
        />
        <label htmlFor="is_admin">Admin Privileges</label>
      </div>
      
      <div className="form-actions">
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="save-button" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default UserEditForm;