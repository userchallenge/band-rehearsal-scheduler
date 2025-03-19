// src/components/AddRehearsalForm.js
import React, { useState } from 'react';
import { createRehearsal } from '../utils/api';
import './AddRehearsalForm.css';

const AddRehearsalForm = ({ onSuccess }) => {
  const [startDate, setStartDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [recurrenceType, setRecurrenceType] = useState('weekly');
  const [duration, setDuration] = useState(3);
  const [dayOfWeek, setDayOfWeek] = useState('tuesday'); // Default to Tuesday rehearsals
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('20:00');
  const [title, setTitle] = useState('Band Rehearsal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    
    try {
      if (!startDate) {
        throw new Error('Please select a valid start date');
      }
      
      // Create properly formatted data object
      const rehearsalData = {
        date: startDate,
        start_time: startTime,
        end_time: endTime,
        title: title,
        is_recurring: isRecurring,
        recurrence_type: recurrenceType,
        duration_months: parseInt(duration),
        day_of_week: dayOfWeek
      };
      
      console.log('Sending rehearsal data:', rehearsalData);
      
      // Send the data to create the rehearsal
      const result = await createRehearsal(rehearsalData);
      
      console.log('Create rehearsal result:', result);
      
      // Reset form and show success message
      setSuccess(`Successfully created rehearsal(s)`);
      setStartDate('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error creating rehearsals:', err);
      setError(err.message || 'Failed to create rehearsals');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="add-rehearsal-form">
      <h3>Create Rehearsal Schedule</h3>
      
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="start-date">Start Date</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="title">Title (Optional)</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Band Rehearsal"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="start-time">Start Time</label>
            <input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="end-time">End Time</label>
            <input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>
        
        <div className="form-checkbox">
          <input
            id="is-recurring"
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />
          <label htmlFor="is-recurring">Create recurring schedule</label>
        </div>
        
        {isRecurring && (
          <>
            <div className="form-group">
              <label htmlFor="day-of-week">Rehearsal Day</label>
              <select
                id="day-of-week"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
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
              <label htmlFor="recurrence-type">Frequency</label>
              <select
                id="recurrence-type"
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value)}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every Two Weeks</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="duration">Duration (months)</label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
              >
                <option value="1">1 month</option>
                <option value="2">2 months</option>
                <option value="3">3 months</option>
                <option value="4">4 months</option>
                <option value="6">6 months</option>
              </select>
            </div>
          </>
        )}
        
        <button type="submit" disabled={loading || !startDate}>
          {loading ? 'Creating...' : isRecurring ? 'Create Schedule' : 'Add Rehearsal'}
        </button>
      </form>
    </div>
  );
};

export default AddRehearsalForm;