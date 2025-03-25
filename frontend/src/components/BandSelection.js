// src/components/BandSelection.js
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { getToken } from '../utils/auth';
import './BandSelection.css';

const BandSelection = ({ onBandSelect }) => {
  const { user } = useContext(UserContext);
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewBandForm, setShowNewBandForm] = useState(false);
  const [newBandData, setNewBandData] = useState({
    name: '',
    description: ''
  });
  
  useEffect(() => {
    const fetchBands = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use your API utility function or directly fetch here
        const response = await fetch('http://127.0.0.1:5000/api/bands', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to load bands:', errorData);
          throw new Error(errorData.msg || `Server responded with status ${response.status}`);
        }
        
        const bandsData = await response.json();
        console.log('Fetched bands data:', bandsData);
        setBands(bandsData);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load bands:', err);
        setError('Failed to load your bands. Please try again. ' + err.message);
        setLoading(false);
      }
    };
    
    fetchBands();
  }, []);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewBandData({
      ...newBandData,
      [name]: value
    });
  };
  
  const handleCreateBand = async (e) => {
    e.preventDefault();
    
    if (!newBandData.name.trim()) {
      setError('Band name is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://127.0.0.1:5000/api/bands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(newBandData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to create band:', errorData);
        throw new Error(errorData.msg || `Server responded with status ${response.status}`);
      }
      
      const createdBand = await response.json();
      console.log('Created band:', createdBand);
      
      setBands([...bands, createdBand]);
      setNewBandData({ name: '', description: '' });
      setShowNewBandForm(false);
      setLoading(false);
    } catch (err) {
      console.error('Failed to create band:', err);
      setError('Failed to create band. Please try again. ' + err.message);
      setLoading(false);
    }
  };
  
  const handleSelectBand = (bandId) => {
    const selectedBand = bands.find(band => band.id === bandId);
    if (selectedBand) {
      localStorage.setItem('current_band_id', bandId);
      localStorage.setItem('current_band_name', selectedBand.name);
      localStorage.setItem('current_band_role', selectedBand.role);
      onBandSelect(selectedBand);
    }
  };
  
  if (loading && bands.length === 0) {
    return <div className="band-selection loading">Loading your bands...</div>;
  }
  
  return (
    <div className="band-selection">
      <h1>Select a Band</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      {bands.length > 0 ? (
        <div className="bands-list">
          {bands.map(band => (
            <div 
              key={band.id} 
              className="band-card"
              onClick={() => handleSelectBand(band.id)}
            >
              <h3>{band.name}</h3>
              {band.description && <p>{band.description}</p>}
              <div className={`band-role ${band.role === 'admin' ? 'admin' : ''}`}>
                {band.role === 'admin' ? 'Admin' : 'Member'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-bands">
          {!loading && !showNewBandForm && (
            <p>You don't have any bands yet. Create one to get started!</p>
          )}
        </div>
      )}
      
      {showNewBandForm ? (
        <div className="new-band-form">
          <h2>Create New Band</h2>
          <form onSubmit={handleCreateBand}>
            <div className="form-group">
              <label htmlFor="name">Band Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={newBandData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description (Optional)</label>
              <textarea
                id="description"
                name="description"
                value={newBandData.description}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-button"
                onClick={() => setShowNewBandForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="create-button" disabled={loading}>
                {loading ? 'Creating...' : 'Create Band'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button 
          className="create-band-button"
          onClick={() => setShowNewBandForm(true)}
        >
          Create New Band
        </button>
      )}
    </div>
  );
};

export default BandSelection;