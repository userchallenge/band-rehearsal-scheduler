// src/pages/SuperAdminPanel.js
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { getBands, getUsers, createUser, deleteUser } from '../utils/api';
import UserEditForm from '../components/UserEditForm';
import './SuperAdminPanel.css';

const SuperAdminPanel = () => {
  const { user } = useContext(UserContext);
  const [bands, setBands] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // User form state
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_admin: false,
    is_super_admin: false
  });
  
  // Edit user state
  const [editingUserId, setEditingUserId] = useState(null);
  
  // Confirm delete dialog
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState(null);
  
  useEffect(() => {
    // Redirect if not super admin
    if (user && !user.is_super_admin) {
      window.location.href = '/';
      return;
    }
    
    fetchData();
  }, [user]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const [bandsData, usersData] = await Promise.all([
        getBands(),
        getUsers() // This should now fetch all users regardless of band
      ]);
      
      setBands(bandsData);
      setUsers(usersData);
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
        is_admin: false,
        is_super_admin: false
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
  
  if (loading) {
    return <div className="super-admin-panel loading">Loading...</div>;
  }
  
  if (user && !user.is_super_admin) {
    return <div className="super-admin-panel">Access denied. Super admin privileges required.</div>;
  }
  
  return (
    <div className="super-admin-panel">
      <h1>Super Admin Panel</h1>
      
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
              
              <div className="form-checkbox">
                <input
                  id="is_super_admin"
                  type="checkbox"
                  name="is_super_admin"
                  checked={newUser.is_super_admin}
                  onChange={handleNewUserChange}
                />
                <label htmlFor="is_super_admin">Super Admin Privileges</label>
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
              isSuperAdmin={true}
            />
          )}
          
          {/* Users List */}
          <div className="users-list">
            <h3>All Users</h3>
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Super Admin</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{`${u.first_name || ''} ${u.last_name || ''}`}</td>
                    <td>{u.is_super_admin ? 'Yes' : 'No'}</td>
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
        </div>
        
        <div className="admin-section">
          <div className="section-header">
            <h2>Bands Management</h2>
          </div>
          
          <div className="bands-list">
            <h3>All Bands</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Created By</th>
                  <th>Members</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bands.map(band => (
                  <tr key={band.id}>
                    <td>{band.name}</td>
                    <td>{band.description || '-'}</td>
                    <td>{band.creator_name || 'Unknown'}</td>
                    <td>{band.member_count || 0}</td>
                    <td className="action-cell">
                      <button 
                        className="view-button" 
                        onClick={() => window.location.href = `/bands/${band.id}`}
                        title="View band"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="help-section">
            <h3>Super Admin Functions</h3>
            <p>As a super admin, you have access to all users and bands in the system.</p>
            <ul>
              <li>Create and manage users with global privileges</li>
              <li>View and manage all bands</li>
              <li>Access system-wide statistics and reports</li>
            </ul>
          </div>
        </div>
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
  );
};

export default SuperAdminPanel;