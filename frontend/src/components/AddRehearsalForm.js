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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Helper to get the next day of week from a start date
  const getNextDayOfWeek = (startDate, dayOfWeek) => {
    const dayMapping = {
      'monday': 1, 'tuesday': 2, 'wednesday': 3, 
      'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 0
    };
    
    const date = new Date(startDate);
    const targetDay = dayMapping[dayOfWeek];
    const currentDay = date.getDay();
    
    // Calculate days to add
    const daysToAdd = (targetDay + 7 - currentDay) % 7;
    
    // If daysToAdd is 0, that means we're already on the correct day,
    // so we'll use the start date as is
    if (daysToAdd > 0) {
      date.setDate(date.getDate() + daysToAdd);
    }
    
    return date;
  };
  
  const generateDates = () => {
    if (!startDate) return [];
    
    const dates = [];
    const start = new Date(startDate);
    
    // If recurring, generate multiple dates
    if (isRecurring) {
      // Find the first occurrence of the selected day of week on or after the start date
      let currentDate = getNextDayOfWeek(start, dayOfWeek);
      
      // Calculate end date based on duration (in months)
      const endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + duration);
      
      // Generate dates until end date
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        
        // Move to the next occurrence based on recurrence type
        if (recurrenceType === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (recurrenceType === 'biweekly') {
          currentDate.setDate(currentDate.getDate() + 14);
        }
      }
    } else {
      // Single date
      dates.push(start);
    }
    
    return dates;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    
    const dates = generateDates();
    
    if (dates.length === 0) {
      setError('Please select a valid start date');
      setLoading(false);
      return;
    }
    
    try {
      // Process each date in sequence
      for (const date of dates) {
        const formattedDate = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        await createRehearsal(formattedDate);
      }
      
      setSuccess(`Successfully created ${dates.length} rehearsal${dates.length > 1 ? 's' : ''}`);
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