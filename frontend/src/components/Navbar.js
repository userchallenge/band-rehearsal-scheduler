// src/components/Navbar.js
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import { removeToken } from '../utils/auth';
import './Navbar.css';

const Navbar = () => {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  
  const handleLogout = () => {
    removeToken();
    setUser(null);
    navigate('/login');
  };
  
  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/">Band Rehearsal Scheduler</Link>
      </div>
      <ul className="nav-links">
        <li>
          <Link to="/">Dashboard</Link>
        </li>
        <li>
          <Link to="/schedule">Schedule</Link>
        </li>
        {user && user.isAdmin && (
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