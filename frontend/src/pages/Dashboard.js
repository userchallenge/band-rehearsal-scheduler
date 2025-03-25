// src/pages/Dashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import { getRehearsals, getResponses, updateResponse } from '../utils/api';
import ScheduleTable from '../components/ScheduleTable';
import './Dashboard.css';

const Dashboard = () => {
  const { user, currentBand } = useContext(UserContext);
  const [rehearsals, setRehearsals] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResponseId, setSelectedResponseId] = useState(null);
  const [comment, setComment] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  
  useEffect(() => {
    console.log("Dashboard user data:", user);
    console.log("Current band:", currentBand);
    
    const fetchData = async () => {
      // Only fetch data if user is logged in and a band is selected
      if (!user || !currentBand) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const bandId = currentBand.id;
        
        // Use Promise.all to fetch both datasets in parallel
        const [rehearsalsData, responsesData] = await Promise.all([
          getRehearsals(bandId),
          getResponses(null, bandId)
        ]);
        
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
  }, [user, currentBand]);
  
  const handleResponseChange = async (responseId, attending) => {
    if (!currentBand) return;
    
    try {
      await updateResponse(responseId, { attending }, currentBand.id);
      
      // Update responses in state
      setResponses(prevResponses => 
        prevResponses.map(response => 
          response.id === responseId 
            ? { ...response, attending } 
            : response
        )
      );
    } catch (err) {
      setError('Failed to update your response. Please try again.');
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
    if (!selectedResponseId || !currentBand) return;
    
    try {
      await updateResponse(selectedResponseId, { comment }, currentBand.id);
      
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
  
  // Show loading if we're still loading data or if user data isn't available yet
  if (loading) {
    return <div className="dashboard loading">Loading...</div>;
  }
  
  // If no band is selected, this should never happen since App.js handles routing
  // But we'll add it as a fallback
  if (!currentBand) {
    return <div className="dashboard">Please select a band to continue.</div>;
  }
  
  return (
    <div className="dashboard">
      <h1>{currentBand.name} - Rehearsal Schedule</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="dashboard-content">
        {/* Schedule Table */}
        <div className="schedule-container">
          {rehearsals.length > 0 && responses.length > 0 ? (
            <ScheduleTable
              rehearsals={rehearsals}
              responses={responses}
              onResponseChange={handleResponseChange}
            />
          ) : (
            <p>No upcoming rehearsals scheduled.</p>
          )}
        </div>
        
        {/* User Responses Section */}
        {responses.length > 0 && (
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
        )}
        
        {/* Admin panel link */}
        {user && (currentBand.role === 'admin' || user.isSuperAdmin) && (
          <div className="admin-links">
            <h3>Admin Functions</h3>
            <p>As an admin, you can manage users and rehearsals.</p>
            <div className="button-container">
              <Link to="/admin" className="admin-button">
                Open Admin Panel
              </Link>
            </div>
          </div>
        )}
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

export default Dashboard;