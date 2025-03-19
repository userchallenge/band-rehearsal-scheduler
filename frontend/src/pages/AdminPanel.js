// src/pages/AdminPanel.js
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { getUsers, createUser, getRehearsals, deleteUser } from '../utils/api';
import AddRehearsalForm from '../components/AddRehearsalForm';
import UserEditForm from '../components/UserEditForm';
import RehearsalForm from '../components/RehearsalForm';
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
  
  // Edit user state
  const [editingUserId, setEditingUserId] = useState(null);
  
  // Confirm delete dialog
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState(null);
  
  useEffect(() => {
    // Redirect if not admin
    if (user && !user.isAdmin) {
      window.location.href = '/';
      return;
    }

    fetchData();
  }, [user]);
  
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
  
  const handleEditUser = (userId) => {
    setEditingUserId(userId);
    // Hide success/error messages when opening edit form
    setSuccess(null);
    setError(null);
  };
  
  const handleCancelEdit = () => {
    setEditingUserId(null);
  };
  
  const handleUserUpdated = () => {
    fetchData(); // Refresh data
    setEditingUserId(null); // Close edit form
    setSuccess('User updated successfully.');
  };
  
  const handleConfirmDelete = (userId) => {
    setDeleteConfirmUserId(userId);
  };
  
  const handleCancelDelete = () => {
    setDeleteConfirmUserId(null);
  };
  
  const handleDeleteUser = async (userId) => {
    try {
      await deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      setDeleteConfirmUserId(null);
      setSuccess('User deleted successfully.');
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('Failed to delete user. Please try again.');
      setDeleteConfirmUserId(null);
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
              onClick={() => {
                setShowNewUserForm(!showNewUserForm);
                setEditingUserId(null); // Close edit form if open
              }}
            >
              {showNewUserForm ? 'Cancel' : 'Add User'}
            </button>
          </div>
          
          {/* New User Form */}
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
          
          {/* Edit User Form */}
          {editingUserId && (
            <UserEditForm 
              userId={editingUserId}
              onCancel={handleCancelEdit}
              onSuccess={handleUserUpdated}
            />
          )}
          
          {/* Users List */}
          <div className="users-list">
            <h3>Current Users</h3>
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{`${u.first_name || ''} ${u.last_name || ''}`}</td>
                    <td>{u.is_admin ? 'Admin' : 'Member'}</td>
                    <td className="action-cell">
                      <button 
                        className="edit-button" 
                        onClick={() => handleEditUser(u.id)}
                        title="Edit user"
                      >
                        Edit
                      </button>
                      
                      {user.id !== u.id && (
                        <button 
                          className="delete-button" 
                          onClick={() => handleConfirmDelete(u.id)}
                          title="Delete user"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Delete Confirmation Dialog */}
          {deleteConfirmUserId && (
            <div className="confirm-dialog-overlay">
              <div className="confirm-dialog">
                <h3>Confirm Deletion</h3>
                <p>Are you sure you want to delete this user? This action cannot be undone.</p>
                <div className="dialog-actions">
                  <button 
                    className="cancel-button"
                    onClick={handleCancelDelete}
                  >
                    Cancel
                  </button>
                  <button 
                    className="delete-button"
                    onClick={() => handleDeleteUser(deleteConfirmUserId)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="admin-section">
          <div className="section-header">
            <h2>Rehearsal Management</h2>
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