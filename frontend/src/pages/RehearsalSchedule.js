// src/pages/RehearsalSchedule.js
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { getRehearsals, getResponses, updateResponse } from '../utils/api';
import './RehearsalSchedule.css';

const RehearsalSchedule = () => {
  const { user } = useContext(UserContext);
  const [rehearsals, setRehearsals] = useState([]);
  const [responses, setResponses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResponseId, setSelectedResponseId] = useState(null);
  const [comment, setComment] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const rehearsalsData = await getRehearsals();
        const responsesData = await getResponses();
        
        // Extract unique users from responses
        const uniqueUsers = Array.from(
          new Set(responsesData.map(r => r.user_id))
        ).map(userId => {
          const userResponse = responsesData.find(r => r.user_id === userId);
          return {
            id: userId,
            username: userResponse.username
          };
        });
        
        setRehearsals(rehearsalsData.sort((a, b) => new Date(a.date) - new Date(b.date)));
        setResponses(responsesData);
        setUsers(uniqueUsers);
        setLoading(false);
      } catch (err) {
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
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
    } catch (err) {
      setError('Failed to update response. Please try again.');
    }
  };
  
  const handleCommentClick = (responseId, currentComment) => {
    setSelectedResponseId(responseId);
    setComment(currentComment || '');
    setShowCommentModal(true);
  };
  
  const handleSaveComment = async () => {
    if (!selectedResponseId) return;
    
    try {
      await updateResponse(selectedResponseId, { comment });
      
      // Update responses in state
      setResponses(prevResponses => 
        prevResponses.map(response => 
          response.id === selectedResponseId 
            ? { ...response, comment } 
            : response
        )
      );
      
      setShowCommentModal(false);
      setSelectedResponseId(null);
      setComment('');
    } catch (err) {
      setError('Failed to save comment. Please try again.');
    }
  };
  
  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Get user's response for a specific rehearsal
  const getUserResponse = (userId, rehearsalId) => {
    return responses.find(r => r.user_id === userId && r.rehearsal_id === rehearsalId) || null;
  };
  
  if (loading) {
    return <div className="schedule loading">Loading...</div>;
  }
  
  return (
    <div className="schedule">
      <h1>Rehearsal Schedule</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      {rehearsals.length === 0 ? (
        <p>No rehearsals scheduled.</p>
      ) : (
        <div className="schedule-table-container">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Date</th>
                {users.map(tableUser => (
                  <th key={tableUser.id} className={tableUser.id === user?.id ? 'current-user' : ''}>
                    {tableUser.username}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rehearsals.map(rehearsal => (
                <tr key={rehearsal.id}>
                  <td className="date-cell">{formatDate(rehearsal.date)}</td>
                  
                  {users.map(tableUser => {
                    const response = getUserResponse(tableUser.id, rehearsal.id);
                    
                    if (!response) return <td key={tableUser.id}>-</td>;
                    
                    const isCurrentUser = tableUser.id === user?.id;
                    const hasComment = response.comment && response.comment.trim() !== '';
                    
                    return (
                      <td key={tableUser.id} className={`response-cell ${response.attending ? 'attending' : 'not-attending'}`}>
                        {isCurrentUser ? (
                          <div className="response-controls">
                            <div className="button-group">
                              <button 
                                className={`response-button ${response.attending ? 'active' : ''}`}
                                onClick={() => handleResponseChange(response.id, true)}
                              >
                                Ja
                              </button>
                              <button 
                                className={`response-button ${!response.attending ? 'active' : ''}`}
                                onClick={() => handleResponseChange(response.id, false)}
                              >
                                Nej
                              </button>
                            </div>
                            <button 
                              className="comment-button"
                              onClick={() => handleCommentClick(response.id, response.comment)}
                            >
                              {hasComment ? 'Edit Comment' : 'Add Comment'}
                            </button>
                          </div>
                        ) : (
                          <div className="response-status">
                            {response.attending ? 'Ja' : 'Nej'}
                            {hasComment && (
                              <div className="comment-indicator" title={response.comment}>
                                💬
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {showCommentModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Add Comment</h2>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter your comment here..."
              rows={4}
            />
            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setShowCommentModal(false)}>
                Cancel
              </button>
              <button className="save-button" onClick={handleSaveComment}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RehearsalSchedule;