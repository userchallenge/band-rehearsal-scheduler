// src/components/Navbar.js
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import { removeToken } from '../utils/auth';
import './Navbar.css';

const Navbar = () => {
  const { user, currentBand, setCurrentBand, setUser } = useContext(UserContext);
  
  const handleLogout = () => {
    // Clear data first
    removeToken();
    localStorage.removeItem('user_info');
    localStorage.removeItem('current_band_id');
    localStorage.removeItem('current_band_name');
    localStorage.removeItem('current_band_role');
    
    // Update context state
    setUser(null);
    setCurrentBand(null);
    
    // Then force a complete navigation (which reloads the app state)
    window.location.href = '/login';
  };
  
  const handleSwitchBand = () => {
    // Call setCurrentBand with null to clear band selection
    setCurrentBand(null);
  };
  
  // Add a null check to prevent rendering errors
  if (!user) {
    return null;
  }
  
  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/">Band Rehearsal Scheduler</Link>
      </div>
      
      {currentBand && (
        <div className="current-band">
          <span className="band-name">{currentBand.name}</span>
          <button 
            className="switch-band-button" 
            onClick={handleSwitchBand}
            type="button"
          >
            Switch Band
          </button>
        </div>
      )}
      
      <ul className="nav-links">
        <li>
          <Link to="/">Dashboard</Link>
        </li>
        {currentBand && (currentBand.role === 'admin' || user.isSuperAdmin) && (
          <li>
            <Link to="/admin">Band Admin</Link>
          </li>
        )}
        {user.isSuperAdmin && (
          <li>
            <Link to="/super-admin">Super Admin</Link>
          </li>
        )}
      </ul>
      <div className="logout">
        <button onClick={handleLogout}>Log Out</button>
      </div>
    </nav>
  );
};

export default Navbar;