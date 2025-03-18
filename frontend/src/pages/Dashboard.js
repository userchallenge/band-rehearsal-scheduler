// src/pages/Dashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import { getRehearsals, getResponses, updateResponse, deleteRehearsal } from '../utils/api';
import ScheduleTable from '../components/ScheduleTable';
import RehearsalForm from '../components/RehearsalForm';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(UserContext);
  const [rehearsals, setRehearsals] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // State for edit/delete functionality
  const [editingRehearsalId, setEditingRehearsalId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState({ id: null, isRecurring: false });
  
  useEffect(() => {
    console.log("Dashboard user data:", user);
    
    const fetchData = async () => {
      // Only fetch data if user is logged in
      if (!user) return;
      
      try {
        setLoading(true);
        const rehearsalsData = await getRehearsals();
        const responsesData = await getResponses();
        
        setRehearsals(rehearsalsData);
        setResponses(responsesData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  const handleResponseChange = async (responseId, attending) => {
    try {
      await updateResponse(responseId, { attending });
      
      // Update responses in state
      setResponses(prevResponses => 
        prevResponses.map(response => 
          response.id === responseId 
            ? { ...response, attending } 
            : response
        )
      );
      
      setSuccess('Your response has been updated');
      setTimeout(() => setSuccess(null), 3000); // Clear success message after 3 seconds
    } catch (err) {
      setError('Failed to update your response. Please try again.');
      setTimeout(() => setError(null), 5000); // Clear error message after 5 seconds
    }
  };

  // Handle edit rehearsal
  const handleEditRehearsal = (rehearsalId) => {
    // Only allow admin users to edit rehearsals
    if (!user || !user.isAdmin) {
      setError('Only administrators can edit rehearsals');
      return;
    }
    
    setEditingRehearsalId(rehearsalId);
  };

  // Handle delete rehearsal
  const handleDeleteRehearsal = (rehearsalId, isRecurring) => {
    // Only allow admin users to delete rehearsals
    if (!user || !user.isAdmin) {
      setError('Only administrators can delete rehearsals');
      return;
    }
    
    setDeleteInfo({ id: rehearsalId, isRecurring });
    setShowDeleteConfirm(true);
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingRehearsalId(null);
  };
  
  // Handle rehearsal update success
  const handleRehearsalUpdated = () => {
    // Refresh data after update
    const fetchData = async () => {
      try {
        const rehearsalsData = await getRehearsals();
        setRehearsals(rehearsalsData);
        setSuccess('Rehearsal updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError('Failed to refresh rehearsal data');
      }
    };
    
    fetchData();
    setEditingRehearsalId(null);
  };
  
  // Execute delete rehearsal
  const executeDelete = async () => {
    try {
      await deleteRehearsal(deleteInfo.id, deleteInfo.isRecurring);
      
      // Remove the deleted rehearsal(s) from state
      const updatedRehearsals = deleteInfo.isRecurring
        ? rehearsals.filter(r => r.recurring_id !== rehearsals.find(r => r.id === deleteInfo.id)?.recurring_id)
        : rehearsals.filter(r => r.id !== deleteInfo.id);
      
      setRehearsals(updatedRehearsals);
      setSuccess(deleteInfo.isRecurring 
        ? 'All recurring rehearsals deleted successfully' 
        : 'Rehearsal deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete rehearsal. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setShowDeleteConfirm(false);
      setDeleteInfo({ id: null, isRecurring: false });
    }
  };
  
  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteInfo({ id: null, isRecurring: false });
  };
  
  // Show loading if we're still loading data or if user data isn't available yet
  if (loading || !user) {
    return <div className="dashboard loading">Loading...</div>;
  }
  
  return (
    <div className="dashboard">
      <h1>Band Rehearsal Schedule</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {/* Edit Rehearsal Form */}
      {editingRehearsalId && (
        <div className="form-container">
          <RehearsalForm
            rehearsalId={editingRehearsalId}
            onCancel={handleCancelEdit}
            onSuccess={handleRehearsalUpdated}
          />
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h3>Confirm Deletion</h3>
            <p>
              {deleteInfo.isRecurring 
                ? 'Are you sure you want to delete all instances of this recurring rehearsal?' 
                : 'Are you sure you want to delete this rehearsal?'}
            </p>
            <p>This action cannot be undone.</p>
            <div className="dialog-actions">
              <button className="cancel-button" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="delete-button" onClick={executeDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="dashboard-content">
        {/* Schedule Table */}
        <div className="schedule-container">
          {rehearsals.length > 0 && responses.length > 0 ? (
            <ScheduleTable
              rehearsals={rehearsals}
              responses={responses}
              onResponseChange={handleResponseChange}
              onEditRehearsal={handleEditRehearsal}
              onDeleteRehearsal={handleDeleteRehearsal}
            />
          ) : (
            <p>No upcoming rehearsals scheduled.</p>
          )}
        </div>
        
        {/* Admin panel link */}
        {user && user.isAdmin && (
          <div className="admin-links">
            <h3>Admin Functions</h3>
            <p>As an admin, you can manage users and rehearsals.</p>
            <div className="button-container">
              <Link to="/admin" className="admin-button">
                Open Admin Panel
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;