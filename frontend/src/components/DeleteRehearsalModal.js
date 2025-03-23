// src/components/DeleteRehearsalModal.js
import React, { useState } from 'react';
import { deleteRehearsal } from '../utils/api';
import './ModalStyles.css';

const DeleteRehearsalModal = ({ rehearsal, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteAllRecurring, setDeleteAllRecurring] = useState(false);
  
  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await deleteRehearsal(rehearsal.id, deleteAllRecurring);
      
      setLoading(false);
      onSuccess();
    } catch (err) {
      console.error('Error deleting rehearsal:', err);
      setError('Failed to delete rehearsal. Please try again.');
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Delete Rehearsal</h2>
        
        {error && <div className="modal-error">{error}</div>}
        
        <p>Are you sure you want to delete the rehearsal on:</p>
        <p className="modal-highlight">{formatDate(rehearsal.date)}</p>
        
        {rehearsal.title && (
          <p className="modal-subtitle">Title: {rehearsal.title}</p>
        )}
        
        {rehearsal.recurring_id && (
          <div className="modal-checkbox">
            <input
              id="delete-all-recurring"
              type="checkbox"
              checked={deleteAllRecurring}
              onChange={(e) => setDeleteAllRecurring(e.target.checked)}
            />
            <label htmlFor="delete-all-recurring">
              Delete all rehearsals in this recurring series
            </label>
          </div>
        )}
        
        <div className="modal-warning">
          This action cannot be undone.
        </div>
        
        <div className="modal-actions">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="delete-button"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteRehearsalModal;