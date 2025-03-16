// src/pages/Dashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { getRehearsals, getResponses, updateResponse, checkTokenStatus } from '../utils/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(UserContext);
  const [rehearsals, setRehearsals] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
      
      {/* Debug Section */}
      <div style={{ 
        margin: '20px 0', 
        padding: '15px', 
        backgroundColor: '#f5f5f5', 
        border: '1px solid #ddd',
        borderRadius: '4px'
      }}>
        <h3>Debug Tools</h3>
        <button 
          onClick={() => {
            const status = checkTokenStatus();
            alert(`Token status: ${status.hasToken ? 'Found' : 'Missing'}\n${status.tokenPreview}`);
          }}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#2196f3', 
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px'
          }}
        >
          Check Token
        </button>
        
        <button 
          onClick={() => {
            try {
              const token = localStorage.getItem('band_app_token');
              fetch('http://127.0.0.1:5000/api/rehearsals', {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
              .then(res => {
                alert(`Rehearsals request status: ${res.status} ${res.statusText}`);
                return res.json().catch(() => ({ error: 'Failed to parse JSON' }));
              })
              .then(data => console.log('Response data:', data))
              .catch(err => alert('Fetch error: ' + err.message));
            } catch (err) {
              alert('Error: ' + err.message);
            }
          }}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#4caf50', 
            color: 'white',
            border: 'none',
            borderRadius: '4px' 
          }}
        >
          Test Rehearsals API
        </button>
      </div>
      
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
    </div>
  );
};

export default Dashboard;