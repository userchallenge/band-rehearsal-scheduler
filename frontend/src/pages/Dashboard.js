// src/pages/Dashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { getRehearsals, getResponses, updateResponse } from '../utils/api';
import './Dashboard.css';

// Debug Button Component
const DebugButton = () => {
  const { user } = useContext(UserContext); // Get user from UserContext
  
  const debugInfo = () => {
    // Get token
    const token = localStorage.getItem('band_app_token');
    const hasToken = !!token;
    
    // Get user info from localStorage
    const storedUserInfo = localStorage.getItem('user_info');
    let parsedUserInfo = null;
    try {
      parsedUserInfo = JSON.parse(storedUserInfo);
    } catch (e) {
      console.error('Error parsing stored user info:', e);
    }
    
    const info = {
      tokenPresent: hasToken,
      tokenPreview: hasToken ? `${token.substring(0, 15)}...` : 'None',
      userContext: user,
      storedUserInfo: parsedUserInfo
    };
    
    console.log('Debug Info:', info);
    alert(
      `Debug Info:
      Token Present: ${info.tokenPresent}
      Token Preview: ${info.tokenPreview}
      User Context: ${JSON.stringify(user)}
      Stored User Info: ${JSON.stringify(parsedUserInfo)}
      `
    );
  };
  
  return (
    <button 
      onClick={debugInfo}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '10px 15px',
        backgroundColor: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        zIndex: 1000
      }}
    >
      Debug
    </button>
  );
};

const Dashboard = () => {
  const { user } = useContext(UserContext);
  const [rehearsals, setRehearsals] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Add console log to check user data
    console.log("Dashboard user data:", user);
    
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
  }, [user]); // Add user to dependency array
  
  // Get the next upcoming rehearsal
  const upcomingRehearsal = rehearsals.length > 0 
    ? rehearsals.sort((a, b) => new Date(a.date) - new Date(b.date))[0]
    : null;
  
  // Get user's response for the upcoming rehearsal
  const userResponse = upcomingRehearsal && responses.length > 0
    ? responses.find(r => r.rehearsal_id === upcomingRehearsal.id && r.user_id === user?.id)
    : null;
  
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
      setError('Failed to update your response. Please try again.');
    }
  };
  
  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  if (loading) {
    return <div className="dashboard loading">Loading...</div>;
  }
  
  return (
    <div className="dashboard">
      <h1>Welcome to Band Rehearsal Scheduler</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="dashboard-content">
        <div className="upcoming-rehearsal">
          <h2>Next Rehearsal</h2>
          {upcomingRehearsal ? (
            <div className="rehearsal-card">
              <div className="rehearsal-date">
                {formatDate(upcomingRehearsal.date)}
              </div>
              
              {userResponse && (
                <div className="response-actions">
                  <p>Your attendance:</p>
                  <div className="button-group">
                    <button 
                      className={`response-button ${userResponse.attending ? 'active' : ''}`}
                      onClick={() => handleResponseChange(userResponse.id, true)}
                    >
                      Ja
                    </button>
                    <button 
                      className={`response-button ${!userResponse.attending ? 'active' : ''}`}
                      onClick={() => handleResponseChange(userResponse.id, false)}
                    >
                      Nej
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>No upcoming rehearsals scheduled.</p>
          )}
        </div>
        
        <div className="quick-links">
          <h2>Quick Links</h2>
          <ul>
            <li>
              <a href="/schedule">View Complete Schedule</a>
            </li>
            {user && user.isAdmin && (
              <li>
                <a href="/admin">Admin Panel</a>
              </li>
            )}
          </ul>
        </div>
      </div>
      
      {/* Add the Debug Button here */}
      <DebugButton />
    </div>
  );
};

export default Dashboard;