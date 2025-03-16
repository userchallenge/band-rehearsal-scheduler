// src/components/Navbar.js
import React, { useContext } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import { removeToken } from '../utils/auth';
import './Navbar.css';

const Navbar = () => {
  const { user, setUser } = useContext(UserContext);
  // const navigate = useNavigate();
  
  const handleLogout = () => {
    // Clear data first
    removeToken();
    localStorage.removeItem('user_info');
    setUser(null);
    
    // Then force a complete navigation (which reloads the app state)
    window.location.href = '/login';

    setTimeout(() => {
      removeToken();
      localStorage.removeItem('user_info');
      setUser(null);
    }, 10);
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
      <ul className="nav-links">
        <li>
          <Link to="/">Dashboard</Link>
        </li>
        {user && user.isAdmin === true && (
          <li>
            <Link to="/admin">Admin</Link>
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