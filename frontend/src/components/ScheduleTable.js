// src/components/ScheduleTable.js
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import './ScheduleTable.css';

const ScheduleTable = ({ rehearsals, responses, onResponseChange, onEditRehearsal, onDeleteRehearsal }) => {
  const { user } = useContext(UserContext);
  const [users, setUsers] = useState([]);
  const [userResponses, setUserResponses] = useState({});
  
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
      
      // Group responses by user_id and rehearsal_id for easier lookup
      const responseMap = {};
      responses.forEach(r => {
        if (!responseMap[r.user_id]) {
          responseMap[r.user_id] = {};
        }
        responseMap[r.user_id][r.rehearsal_id] = r;
      });
      setUserResponses(responseMap);
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
  
  // Format date to display day and month
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    // Format as "dd MMM" (e.g., "12 Mar")
    return date.toLocaleDateString('sv-SE', { day: '2-digit', month: 'short' });
  };
  
  // Format time period
  const formatTime = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    return `${startTime} - ${endTime}`;
  };
  
  // Get user's response for a specific rehearsal
  const getUserResponse = (userId, rehearsalId) => {
    return userResponses[userId]?.[rehearsalId] || null;
  };
  
  // Handle clicking on a response cell
  const handleCellClick = (userId, rehearsalId, currentResponse) => {
    // Only allow users to modify their own responses
    if (!user || String(user.id) !== String(userId)) return;
    
    console.log('Cell clicked:', {userId, rehearsalId, response: currentResponse});
    
    if (currentResponse) {
      // If response exists, toggle it
      onResponseChange(currentResponse.id, !currentResponse.attending);
    } else {
      // If no response exists, this shouldn't happen, but log for debugging
      console.error('No response found for user', userId, 'and rehearsal', rehearsalId);
    }
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
                <div className="date-header-content">
                  <div>{formatDate(rehearsal.date)}</div>
                  <div className="rehearsal-time">{formatTime(rehearsal.start_time, rehearsal.end_time)}</div>
                  {rehearsal.title && <div className="rehearsal-title">{rehearsal.title}</div>}
                  
                  {user && user.isAdmin && (
                    <div className="rehearsal-actions">
                      <button 
                        className="edit-button" 
                        onClick={() => onEditRehearsal && onEditRehearsal(rehearsal.id)}
                        title="Edit rehearsal"
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-button" 
                        onClick={() => onDeleteRehearsal && onDeleteRehearsal(rehearsal.id, !!rehearsal.recurring_id)}
                        title="Delete rehearsal"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(tableUser => {
            const userIdStr = String(tableUser.id);
            const currentUserIdStr = user ? String(user.id) : '';
            const isCurrentUser = userIdStr === currentUserIdStr;
            
            return (
              <tr key={tableUser.id} className={isCurrentUser ? 'current-user-row' : ''}>
                <td className="name-cell">{tableUser.username}</td>
                
                {upcomingRehearsals.map(rehearsal => {
                  const response = getUserResponse(tableUser.id, rehearsal.id);
                  
                  // If there's no response for this user and rehearsal, show a dash
                  if (!response) {
                    return (
                      <td 
                        key={rehearsal.id}
                        className={`response-cell ${isCurrentUser ? 'current-user-cell' : ''}`}
                        onClick={() => console.log('No response available for this cell')}
                      >
                        -
                      </td>
                    );
                  }
                  
                  const cellClass = `response-cell ${response.attending ? 'attending' : 'not-attending'} ${isCurrentUser ? 'current-user-cell' : ''}`;
                  
                  return (
                    <td 
                      key={rehearsal.id}
                      className={cellClass}
                      onClick={() => handleCellClick(tableUser.id, rehearsal.id, response)}
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