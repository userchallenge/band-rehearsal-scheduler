// src/components/ScheduleTable.js
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import './ScheduleTable.css';

const ScheduleTable = ({ rehearsals, responses, onResponseChange }) => {
  const { user } = useContext(UserContext);
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    // Extract unique users from responses
    if (responses.length > 0) {
      const uniqueUsers = Array.from(
        new Set(responses.map(r => r.user_id))
      ).map(userId => {
        const userResponse = responses.find(r => r.user_id === userId);
        return {
          id: userId,
          username: userResponse.username
        };
      });
      
      setUsers(uniqueUsers);
    }
  }, [responses]);
  
  // Filter to only show upcoming rehearsals
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get upcoming rehearsals, sort by date, limit to 10
  const upcomingRehearsals = rehearsals
    .filter(r => new Date(r.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 10);
  
  // Format date to display only day and month
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    // Format as "dd MMM" (e.g., "12 Mar")
    return date.toLocaleDateString('sv-SE', { day: '2-digit', month: 'short' });
  };
  
  // Get user's response for a specific rehearsal
  const getUserResponse = (userId, rehearsalId) => {
    return responses.find(r => r.user_id === userId && r.rehearsal_id === rehearsalId);
  };
  
  // Handle clicking on a response cell
  const handleCellClick = (response) => {
    if (!response || user.id !== response.user_id) return;
    
    onResponseChange(response.id, !response.attending);
  };
  
  if (users.length === 0 || upcomingRehearsals.length === 0) {
    return <div>No upcoming rehearsals found</div>;
  }
  
  return (
    <div className="schedule-table-container">
      <table className="schedule-table">
        <thead>
          <tr>
            <th className="name-header">Namn</th>
            {upcomingRehearsals.map(rehearsal => (
              <th key={rehearsal.id} className="date-header">
                {formatDate(rehearsal.date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(tableUser => {
            const isCurrentUser = tableUser.id === user?.id;
            
            return (
              <tr key={tableUser.id} className={isCurrentUser ? 'current-user-row' : ''}>
                <td className="name-cell">{tableUser.username}</td>
                
                {upcomingRehearsals.map(rehearsal => {
                  const response = getUserResponse(tableUser.id, rehearsal.id);
                  if (!response) return <td key={rehearsal.id}>-</td>;
                  
                  const cellClass = `response-cell ${response.attending ? 'attending' : 'not-attending'} ${isCurrentUser ? 'current-user-cell' : ''}`;
                  
                  return (
                    <td 
                      key={rehearsal.id}
                      className={cellClass}
                      onClick={() => handleCellClick(response)}
                      title={isCurrentUser ? 'Click to change your response' : ''}
                    >
                      {response.attending ? 'Ja' : 'Nej'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleTable;