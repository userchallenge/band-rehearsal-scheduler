// src/components/InvitationManagement.js
import React, { useState, useEffect } from 'react';
import { createInvitation, getInvitations, deleteInvitation } from '../utils/api';
import './InvitationManagement.css';

const InvitationManagement = () => {
  const [invitations, setInvitations] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCopyLink, setShowCopyLink] = useState(null);
  
  useEffect(() => {
    fetchInvitations();
  }, []);
  
  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const data = await getInvitations();
      setInvitations(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
      setError('Failed to load invitations. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const newInvitation = await createInvitation(email);
      setInvitations([newInvitation, ...invitations]);
      setEmail('');
      setSuccess('Invitation created successfully');
      setShowCopyLink(newInvitation.token);
    } catch (err) {
      console.error('Failed to create invitation:', err);
      setError(err.message || 'Failed to create invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await deleteInvitation(id);
      setInvitations(invitations.filter(inv => inv.id !== id));
      setSuccess('Invitation deleted successfully');
    } catch (err) {
      console.error('Failed to delete invitation:', err);
      setError('Failed to delete invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = (token) => {
    const inviteUrl = `${window.location.origin}/register/${token}`;
    navigator.clipboard.writeText(inviteUrl)
      .then(() => {
        setSuccess('Invitation link copied to clipboard');
        setTimeout(() => setShowCopyLink(null), 3000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        setError('Failed to copy to clipboard');
      });
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  if (loading && invitations.length === 0) {
    return <div className="loading">Loading invitations...</div>;
  }
  
  return (
    <div className="invitation-management">
      <h2>Manage Invitations</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form className="invitation-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Invite by Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
            required
          />
        </div>
        
        <button type="submit" className="invite-button" disabled={loading}>
          {loading ? 'Sending...' : 'Send Invitation'}
        </button>
      </form>
      
      {showCopyLink && (
        <div className="copy-link-card">
          <p>Share this invitation link with the user:</p>
          <div className="invitation-link">
            <code>{`${window.location.origin}/register/${showCopyLink}`}</code>
            <button 
              className="copy-button"
              onClick={() => copyToClipboard(showCopyLink)}
            >
              Copy
            </button>
          </div>
          <p className="note">Note: For a production app, you should send this via email instead of copying manually.</p>
        </div>
      )}
      
      <h3>Active Invitations</h3>
      
      {invitations.length === 0 ? (
        <p>No active invitations found.</p>
      ) : (
        <table className="invitations-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map(invitation => (
              <tr key={invitation.id} className={invitation.is_expired ? 'expired' : ''}>
                <td>{invitation.email}</td>
                <td>{formatDate(invitation.created_at)}</td>
                <td>{formatDate(invitation.expires_at)}</td>
                <td>{invitation.is_expired ? 'Expired' : 'Active'}</td>
                <td>
                  <button 
                    className="delete-button"
                    onClick={() => handleDelete(invitation.id)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                  {!invitation.is_expired && (
                    <button 
                      className="copy-button"
                      onClick={() => setShowCopyLink(invitation.token)}
                    >
                      Copy Link
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default InvitationManagement;