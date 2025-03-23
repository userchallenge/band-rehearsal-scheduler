// src/components/EditRehearsalModal.js
import React, { useState, useEffect } from 'react';
import { getRehearsalById, updateRehearsal } from '../utils/api';
import './ModalStyles.css';

const EditRehearsalModal = ({ rehearsalId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    start_time: '',
    end_time: '',
    title: '',
    update_all_recurring: true
  });
  const [isRecurring, setIsRecurring] = useState(false);
  
  useEffect(() => {
    const fetchRehearsalData = async () => {
      try {
        const data = await getRehearsalById(rehearsalId);
        
        setFormData({
          date: data.date,
          start_time: data.start_time || '19:00',
          end_time: data.end_time || '20:00',
          title: data.title || '',
          update_all_recurring: true
        });
        
        setIsRecurring(!!data.recurring_id);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load rehearsal data:', err);
        setError('Failed to load rehearsal data. Please try again.');
        setLoading(false);
      }
    };
    
    fetchRehearsalData();
  }, [rehearsalId]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    
    try {
      await updateRehearsal(rehearsalId, formData);
      setSaving(false);
      onSuccess();
    } catch (err) {
      console.error('Error updating rehearsal:', err);
      setError(err.message || 'Failed to update rehearsal. Please try again.');
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <h2>Edit Rehearsal</h2>
          <div className="modal-loading">Loading rehearsal data...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Edit Rehearsal</h2>
        
        {error && <div className="modal-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title (Optional)</label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Band Rehearsal, Studio Session"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_time">Start Time</label>
              <input
                id="start_time"
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="end_time">End Time</label>
              <input
                id="end_time"
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          {isRecurring && (
            <div className="form-checkbox">
              <input
                id="update_all_recurring"
                type="checkbox"
                name="update_all_recurring"
                checked={formData.update_all_recurring}
                onChange={handleChange}
              />
              <label htmlFor="update_all_recurring">
                Update all rehearsals in this series
              </label>
              <div className="field-hint">
                Changes will apply to all recurring rehearsals in this series
              </div>
            </div>
          )}
          
          <div className="modal-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-button"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRehearsalModal;