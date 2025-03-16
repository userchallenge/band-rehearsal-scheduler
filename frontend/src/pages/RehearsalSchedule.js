// src/pages/RehearsalSchedule.js
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { getRehearsals, getResponses, updateResponse } from '../utils/api';
import ScheduleTable from '../components/ScheduleTable';
import './RehearsalSchedule.css';

const RehearsalSchedule = () => {
  const { user } = useContext(UserContext);
  const [rehearsals, setRehearsals] = useState([]);
  const [responses, setResponses] = useState([]);
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
        
        setRehearsals(rehearsalsData);
        setResponses(responsesData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
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
  
  const handleCommentClick = (responseId) => {
    // Find the response to get the current comment
    const response = responses.find(r => r.id === responseId);
    if (!response) return;
    
    setSelectedResponseId(responseId);
    setComment(response.comment || '');
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
  
  // Get the user's responses for displaying in the comment section
  const getUserResponses = () => {
    if (!user) return [];
    return responses.filter(r => r.user_id === user.id);
  };
  
  if (loading) {
    return <div className="schedule loading">Loading...</div>;
  }
  
  return (
    <div className="schedule">
      <h1>Rehearsal Schedule</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="schedule-tabs">
        <button className="tab-button active">Table View</button>
      </div>
      
      <div className="schedule-view">
        <ScheduleTable 
          rehearsals={rehearsals} 
          responses={responses}
          onResponseChange={handleResponseChange}
        />
      </div>
      
      <div className="user-responses">
        <h2>Your Responses</h2>
        <p>Click on any of your responses in the table to toggle between "Ja" and "Nej".</p>
        
        <button 
          className="add-comment-button"
          onClick={() => {
            const userResponses = getUserResponses();
            if (userResponses.length > 0) {
              // Pick the first response for now, could make this more sophisticated
              handleCommentClick(userResponses[0].id);
            }
          }}
        >
          Add/Edit Comment
        </button>
      </div>
      
      {/* Comment Modal */}
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