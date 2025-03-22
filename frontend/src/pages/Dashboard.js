// src/pages/Dashboard.js - Updated with better user data loading
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import { getRehearsals, getResponses, updateResponse, getUserById } from '../utils/api';
import ScheduleTable from '../components/ScheduleTable';
import './Dashboard.css';

const Dashboard = () => {
  const { user, setUser } = useContext(UserContext);
  const [rehearsals, setRehearsals] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  
  useEffect(() => {
    console.log("Dashboard mounted with user data:", user);
    
    const loadUserData = async () => {
      if (!user || !user.id) return;
      
      try {
        // Load complete user profile data
        const userData = await getUserById(user.id);
        console.log("Loaded user details:", userData);
        
        // Update user context with more complete data
        setUser(prevUser => ({
          ...prevUser,
          username: userData.username,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name
        }));
        
        // Store locally for components that need it
        setUserDetails(userData);
        
        // Also update localStorage for page refreshes
        const storedUserInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        localStorage.setItem('user_info', JSON.stringify({
          ...storedUserInfo,
          username: userData.username,
          first_name: userData.first_name,
          last_name: userData.last_name
        }));
      } catch (err) {
        console.error("Error fetching user details:", err);
        // Non-critical error, don't set error state
      }
    };
    
    const fetchData = async () => {
      // Only fetch data if user is logged in
      if (!user) return;
      
      try {
        setLoading(true);
        const [rehearsalsData, responsesData] = await Promise.all([
          getRehearsals(),
          getResponses()
        ]);
        
        setRehearsals(rehearsalsData);
        setResponses(responsesData);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    // Load user data first, then fetch rehearsals and responses
    loadUserData().then(fetchData);
  }, [user, setUser]); // Only re-run if user object changes
  
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
  
  // Display a welcome message with user's name if available
  const renderWelcomeMessage = () => {
    if (!user) return null;
    
    const firstName = user.first_name || userDetails?.first_name || '';
    const lastName = user.last_name || userDetails?.last_name || '';
    const displayName = firstName 
      ? `${firstName} ${lastName}`.trim()
      : user.username || userDetails?.username || 'Band Member';
    
    return (
      <div className="welcome-message">
        <h2>Welcome, {displayName}!</h2>
        <p>Here's your band rehearsal schedule. Mark your availability by clicking on your responses in the table.</p>
      </div>
    );
  };
  
  // Show loading if we're still loading data or if user data isn't available yet
  if (loading || !user) {
    return <div className="dashboard loading">Loading...</div>;
  }
  
  return (
    <div className="dashboard">
      <h1>Band Rehearsal Schedule</h1>
      
      {renderWelcomeMessage()}
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="dashboard-content">
        {/* Schedule Table */}
        <div className="schedule-container">
          {rehearsals.length > 0 && responses.length > 0 ? (
            <ScheduleTable
              rehearsals={rehearsals}
              responses={responses}
              onResponseChange={handleResponseChange}
              currentUser={user}
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