// src/components/ScheduleTable.js - Updated to better handle user permissions
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import './ScheduleTable.css';

const ScheduleTable = ({ rehearsals, responses, onResponseChange, onEditRehearsal, onDeleteRehearsal, currentUser }) => {
  const { user } = useContext(UserContext);
  const [users, setUsers] = useState([]);
  const [showTooltip, setShowTooltip] = useState(null);
  
  // Use either the passed-in currentUser or the user from context
  const activeUser = currentUser || user;
  
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
    return responses.find(r => r.user_id === userId && r.rehearsal_id === rehearsalId);
  };
  
  // Handle clicking on a response cell
  const handleCellClick = (response) => {
    // Don't do anything if no response or user doesn't match
    if (!response || !activeUser) return;
    
    // Only allow users to update their own responses, or admins to update any response
    if (activeUser.id === response.user_id || activeUser.isAdmin) {
      console.log(`Updating response ${response.id} from ${response.attending} to ${!response.attending}`);
      onResponseChange(response.id, !response.attending);
    } else {
      console.log("Cannot update response - user doesn't have permission");
    }
  };
  
  const handleTooltipShow = (content, event) => {
    if (!content) return;
    
    setShowTooltip({
      content,
      x: event.clientX,
      y: event.clientY
    });
  };
  
  const handleTooltipHide = () => {
    setShowTooltip(null);
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
                  
                  {activeUser && activeUser.isAdmin && onEditRehearsal && onDeleteRehearsal && (
                    <div className="rehearsal-actions">
                      <button 
                        className="edit-button" 
                        onClick={() => onEditRehearsal(rehearsal.id)}
                        title="Edit rehearsal"
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-button" 
                        onClick={() => onDeleteRehearsal(rehearsal.id, !!rehearsal.recurring_id)}
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
            const isCurrentUser = tableUser.id === activeUser?.id;
            
            return (
              <tr key={tableUser.id} className={isCurrentUser ? 'current-user-row' : ''}>
                <td className="name-cell">{tableUser.username}</td>
                
                {upcomingRehearsals.map(rehearsal => {
                  const response = getUserResponse(tableUser.id, rehearsal.id);
                  if (!response) return <td key={rehearsal.id}>-</td>;
                  
                  const canEdit = isCurrentUser || (activeUser && activeUser.isAdmin);
                  const cellClass = `response-cell ${response.attending ? 'attending' : 'not-attending'} ${canEdit ? 'current-user-cell' : ''}`;
                  
                  const tooltipContent = canEdit 
                    ? 'Click to change response' 
                    : response.attending 
                        ? 'User is attending' 
                        : 'User is not attending';
                  
                  return (
                    <td 
                      key={rehearsal.id}
                      className={cellClass}
                      onClick={() => handleCellClick(response)}
                      onMouseEnter={(e) => handleTooltipShow(tooltipContent, e)}
                      onMouseLeave={handleTooltipHide}
                      title={tooltipContent}
                    >
                      {response.attending ? 'Ja' : 'Nej'}
                      {response.comment && (
                        <span className="comment-indicator" title={response.comment}>📝</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {showTooltip && (
        <div 
          className="tooltip" 
          style={{ 
            position: 'fixed', 
            top: showTooltip.y + 10 + 'px', 
            left: showTooltip.x + 10 + 'px' 
          }}
        >
          {showTooltip.content}
        </div>
      )}
    </div>
  );
};

export default ScheduleTable;