// src/pages/AdminPanel.js
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { getUsers, createUser, getRehearsals } from '../utils/api';
import AddRehearsalForm from '../components/AddRehearsalForm';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user } = useContext(UserContext);
  const [users, setUsers] = useState([]);
  const [rehearsals, setRehearsals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // New user form state
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_admin: false
  });
  
  useEffect(() => {
    // Redirect if not admin
    if (user && !user.isAdmin) {
      window.location.href = '/';
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersData, rehearsalsData] = await Promise.all([
          getUsers(),
          getRehearsals()
        ]);
        
        setUsers(usersData);
        setRehearsals(rehearsalsData.sort((a, b) => new Date(a.date) - new Date(b.date)));
        setLoading(false);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  const handleNewUserChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewUser({
      ...newUser,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      const createdUser = await createUser(newUser);
      setUsers([...users, createdUser]);
      setNewUser({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        is_admin: false
      });
      setShowNewUserForm(false);
      setSuccess('User created successfully.');
    } catch (err) {
      console.error('Failed to create user:', err);
      setError('Failed to create user. Please try again.');
    }
  };
  
  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const refreshData = async () => {
    try {
      const rehearsalsData = await getRehearsals();
      setRehearsals(rehearsalsData.sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };
  
  if (loading) {
    return <div className="admin-panel loading">Loading...</div>;
  }
  
  if (user && !user.isAdmin) {
    return <div className="admin-panel">Access denied. Admin privileges required.</div>;
  }
  
  return (
    <div className="admin-panel">
      <h1>Admin Panel</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="admin-grid">
        <div className="admin-section">
          <div className="section-header">
            <h2>Users Management</h2>
            <button 
              className="add-button"
              onClick={() => setShowNewUserForm(!showNewUserForm)}
            >
              {showNewUserForm ? 'Cancel' : 'Add User'}
            </button>
          </div>
          
          {showNewUserForm && (
            <form className="form" onSubmit={handleCreateUser}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={newUser.username}
                  onChange={handleNewUserChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleNewUserChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={newUser.password}
                  onChange={handleNewUserChange}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="first_name">First Name</label>
                  <input
                    id="first_name"
                    type="text"
                    name="first_name"
                    value={newUser.first_name}
                    onChange={handleNewUserChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="last_name">Last Name</label>
                  <input
                    id="last_name"
                    type="text"
                    name="last_name"
                    value={newUser.last_name}
                    onChange={handleNewUserChange}
                  />
                </div>
              </div>
              
              <div className="form-checkbox">
                <input
                  id="is_admin"
                  type="checkbox"
                  name="is_admin"
                  checked={newUser.is_admin}
                  onChange={handleNewUserChange}
                />
                <label htmlFor="is_admin">Admin Privileges</label>
              </div>
              
              <button type="submit" className="submit-button">Create User</button>
            </form>
          )}
          
          <div className="users-list">
            <h3>Current Users</h3>
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{`${user.first_name || ''} ${user.last_name || ''}`}</td>
                    <td>{user.is_admin ? 'Admin' : 'Member'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="admin-section">
          <div className="section-header">
            <h2>Rehearsal Management</h2>
            {/* Removed the Manage Rehearsals and Send Summary Email buttons */}
          </div>
          
          <AddRehearsalForm onSuccess={refreshData} />
          
          <div className="rehearsals-list">
            <h3>Upcoming Rehearsals</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Responses</th>
                </tr>
              </thead>
              <tbody>
                {rehearsals.map(rehearsal => (
                  <tr key={rehearsal.id}>
                    <td>{formatDate(rehearsal.date)}</td>
                    <td>{rehearsal.responses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="help-section">
            <h3>Quick Help</h3>
            <ul>
              <li><strong>Add Rehearsal</strong>: Create a new rehearsal date or recurring schedule.</li>
              <li><strong>Auto Management</strong>: Past rehearsals are automatically removed and new ones added when users log in.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;