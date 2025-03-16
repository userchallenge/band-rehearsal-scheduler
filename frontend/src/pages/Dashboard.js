// src/pages/Dashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { getRehearsals, getResponses, updateResponse, checkTokenStatus, directTestRehearsals } from '../utils/api';
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
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
              borderRadius: '4px'
            }}
          >
            Check Token
          </button>
          
          <button 
            onClick={async () => {
              try {
                const result = await directTestRehearsals();
                if (result.status === 200) {
                  alert(`Success! Received ${result.data.length} rehearsals.`);
                } else if (result.status) {
                  alert(`Request failed with status: ${result.status}\n${JSON.stringify(result.data || {}, null, 2)}`);
                } else {
                  alert(`Error: ${result.error}`);
                }
              } catch (err) {
                alert('Test failed: ' + err.message);
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
          
          <button 
            onClick={async () => {
              try {
                const token = localStorage.getItem('band_app_token');
                const response = await fetch('http://127.0.0.1:5000/api/debug-jwt', {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                const data = await response.json();
                console.log('JWT debug:', data);
                alert(`JWT Debug:\n${JSON.stringify(data, null, 2)}`);
              } catch (err) {
                alert('JWT debug failed: ' + err.message);
              }
            }}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#ff5722', 
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            Debug JWT
          </button>
          
          <button 
            onClick={async () => {
              try {
                const response = await fetch('http://127.0.0.1:5000/api/rehearsals-no-auth');
                const data = await response.json();
                console.log('No-auth rehearsals:', data);
                alert(`Success! Received ${data.length} rehearsals without authentication.`);
              } catch (err) {
                alert('No-auth test failed: ' + err.message);
              }
            }}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#9c27b0', 
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            Test Without Auth
          </button>
          
          <button 
            onClick={async () => {
              try {
                const token = localStorage.getItem('band_app_token');
                const response = await fetch('http://127.0.0.1:5000/api/rehearsals-simple', {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                
                if (response.ok) {
                  const data = await response.json();
                  alert(`Success! Received ${data.length} rehearsals.`);
                } else {
                  const error = await response.json();
                  alert(`Request failed: ${response.status}\n${JSON.stringify(error, null, 2)}`);
                }
              } catch (err) {
                alert('Test failed: ' + err.message);
              }
            }}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#e91e63', 
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            Simple Endpoint Test
          </button>
        </div>
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