// src/pages/Dashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import { getRehearsals, getResponses, updateResponse } from '../utils/api';
import ScheduleTable from '../components/ScheduleTable';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(UserContext);
  const [rehearsals, setRehearsals] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
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
  }, [user]);
  
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
  
  if (loading) {
    return <div className="dashboard loading">Loading...</div>;
  }
  
  return (
    <div className="dashboard">
      <h1>Band Rehearsal Schedule</h1>
      
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
        
        {/* Admin panel link */}
        {user && user.isAdmin && (
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
    </div>
  );
};

export default Dashboard;