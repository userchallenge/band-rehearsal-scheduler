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
    localStorage.removeItem('user_info');
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