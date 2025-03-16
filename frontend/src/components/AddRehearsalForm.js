// src/components/AddRehearsalForm.js
import React, { useState } from 'react';
import { createRehearsal } from '../utils/api';
import './AddRehearsalForm.css';

const AddRehearsalForm = ({ onSuccess }) => {
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    
    try {
      await createRehearsal(date);
      setSuccess('Rehearsal created successfully');
      setDate('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error creating rehearsal:', err);
      setError(err.message || 'Failed to create rehearsal');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="add-rehearsal-form">
      <h3>Add New Rehearsal</h3>
      
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="rehearsal-date">Date</label>
          <input
            id="rehearsal-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" disabled={loading || !date}>
          {loading ? 'Creating...' : 'Add Rehearsal'}
        </button>
      </form>
    </div>
  );
};

export default AddRehearsalForm;