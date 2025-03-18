// src/components/RehearsalForm.js
import React, { useState, useEffect } from 'react';
import { 
  createRehearsal, 
  getRehearsalById,
  updateRehearsal
} from '../utils/api';
import './RehearsalForm.css';

const RehearsalForm = ({ rehearsalId = null, onSuccess, onCancel }) => {
  const isEditing = !!rehearsalId;
  
  const [formData, setFormData] = useState({
    date: '',
    start_time: '19:00',  // Default to 7:00 PM
    end_time: '20:00',    // Default to 8:00 PM
    title: '',
    is_recurring: false,
    recurrence_type: 'weekly',
    duration_months: 3,
    day_of_week: 'tuesday',  // Default to Tuesday
    update_all_recurring: true
  });
  
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);
  
  useEffect(() => {
    // If editing, fetch rehearsal data
    if (rehearsalId) {
      const fetchRehearsalData = async () => {
        try {
          const data = await getRehearsalById(rehearsalId);
          
          setFormData({
            ...formData,
            date: data.date,
            start_time: data.start_time || '19:00',
            end_time: data.end_time || '20:00',
            title: data.title || '',
            is_recurring: !!data.recurring_id,
            update_all_recurring: true
          });
          
          setIsRecurring(!!data.recurring_id);
          setLoading(false);
        } catch (err) {
          setError('Failed to load rehearsal data');
          setLoading(false);
        }
      };
      
      fetchRehearsalData();
    }
  }, [rehearsalId]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    if (name === 'is_recurring') {
      setIsRecurring(checked);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    
    try {
      if (isEditing) {
        // Update existing rehearsal
        await updateRehearsal(rehearsalId, formData);
      } else {
        // Create new rehearsal(s)
        await createRehearsal(formData);
      }
      
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to save rehearsal');
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div className="loading">Loading rehearsal data...</div>;
  }
  
  return (
    <form className="rehearsal-form" onSubmit={handleSubmit}>
      <h3>{isEditing ? 'Edit Rehearsal' : 'Create Rehearsal'}</h3>
      
      {error && <div className="form-error">{error}</div>}
      
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
      
      {!isEditing && (
        <div className="form-checkbox">
          <input
            id="is_recurring"
            type="checkbox"
            name="is_recurring"
            checked={formData.is_recurring}
            onChange={handleChange}
          />
          <label htmlFor="is_recurring">Make this a recurring appointment</label>
        </div>
      )}
      
      {(isRecurring && !isEditing) && (
        <>
          <div className="form-group">
            <label htmlFor="day_of_week">Day of Week</label>
            <select
              id="day_of_week"
              name="day_of_week"
              value={formData.day_of_week}
              onChange={handleChange}
            >
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="recurrence_type">Frequency</label>
            <select
              id="recurrence_type"
              name="recurrence_type"
              value={formData.recurrence_type}
              onChange={handleChange}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every Two Weeks</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="duration_months">Duration</label>
            <select
              id="duration_months"
              name="duration_months"
              value={formData.duration_months}
              onChange={handleChange}
            >
              <option value="1">1 month</option>
              <option value="2">2 months</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
            </select>
          </div>
        </>
      )}
      
      {(isEditing && isRecurring) && (
        <div className="form-checkbox">
          <input
            id="update_all_recurring"
            type="checkbox"
            name="update_all_recurring"
            checked={formData.update_all_recurring}
            onChange={handleChange}
          />
          <label htmlFor="update_all_recurring">
            Update all appointments in this series
          </label>
          <div className="field-hint">
            Changes will apply to all recurring appointments in this series
          </div>
        </div>
      )}
      
      <div className="form-actions">
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="save-button" disabled={saving}>
          {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default RehearsalForm;