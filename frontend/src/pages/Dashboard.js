// src/pages/Dashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import { getRehearsals, getResponses, updateResponse, getUserById, createResponse } from '../utils/api';
import ScheduleTable from '../components/ScheduleTable';
import './Dashboard.css';

const Dashboard = () => {
  const { user, setUser } = useContext(UserContext);
  const [userDetails, setUserDetails] = useState(null);
  const [rehearsals, setRehearsals] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch complete user data if needed
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (user && user.id && !userDetails) {
        try {
          const userData = await getUserById(user.id);
          setUserDetails(userData);
        } catch (err) {
          console.error("Error fetching user details:", err);
        }
      }
    };
    
    fetchUserDetails();
  }, [user, userDetails]);
  
  useEffect(() => {
    console.log("Dashboard user data:", user);
    
    const fetchData = async () => {
      // Only fetch data if user is logged in
      if (!user) return;
      
      try {
        setLoading(true);
        const rehearsalsData = await getRehearsals();
        const responsesData = await getResponses();
        
        setRehearsals(rehearsalsData);
        setResponses(responsesData);
        
        // Check if this user has responses for all rehearsals
        const userResponses = responsesData.filter(r => String(r.user_id) === String(user.id));
        const missingRehearsals = [];
        
        rehearsalsData.forEach(rehearsal => {
          const hasResponse = userResponses.some(r => r.rehearsal_id === rehearsal.id);
          if (!hasResponse) {
            missingRehearsals.push(rehearsal.id);
          }
        });
        
        // Create responses for any missing rehearsals
        if (missingRehearsals.length > 0) {
          console.log("User is missing responses for rehearsals:", missingRehearsals);
          
          // Create responses for each missing rehearsal
          for (const rehearsalId of missingRehearsals) {
            try {
              const newResponse = await createResponse(user.id, rehearsalId, true);
              responsesData.push(newResponse);
            } catch (err) {
              console.error(`Failed to create response for rehearsal ${rehearsalId}:`, err);
            }
          }
          
          // Update the responses state with the new responses
          setResponses([...responsesData]);
        }
        
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
      console.error("Error updating response:", err);
      setError('Failed to update your response. Please try again.');
    }
  };
  
  // Show loading if we're still loading data or if user data isn't available yet
  if (loading || !user) {
    return <div className="dashboard loading">Loading...</div>;
  }
  
  // Get user's display name
  const getUserDisplayName = () => {
    if (userDetails && (userDetails.first_name || userDetails.last_name)) {
      return `${userDetails.first_name || ''} ${userDetails.last_name || ''}`.trim();
    }
    return user?.username || 'bandmedlem';
  };
  
  return (
    <div className="dashboard">
      <h1>Band Rehearsal Schedule</h1>
      
      <div className="welcome-message">
        <p>Welcome, {getUserDisplayName()}! Here's the upcoming rehearsal schedule.</p>
      </div>
      
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