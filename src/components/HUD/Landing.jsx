import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Shield, Globe, Users, Lock, ChevronRight } from 'lucide-react';
import gsap from 'gsap';

export const Landing = () => {
  const [name, setName] = useState('');
  const joinMatch = useGameStore(state => state.joinMatch);

  const handleJoin = (type) => {
    if (!name.trim()) {
      gsap.to('.name-input', { x: 10, repeat: 5, yoyo: true, duration: 0.05 });
      return;
    }
    joinMatch(name);
  };

  return (
    <div className="landing-overlay">
      <div className="landing-content">
        <div className="landing-header">
          <Globe className="logo-icon" size={48} />
          <h1>GEOWAR<span>SURVIVOR</span></h1>
          <p>Global Strategy. Last Nation Standing.</p>
        </div>

        <div className="landing-card">
          <div className="input-group">
            <label>OPERATIVE NAME</label>
            <input 
              type="text" 
              className="name-input"
              placeholder="Enter Command Name..." 
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={15}
            />
          </div>

          <div className="mode-selection">
            <button className="mode-btn public" onClick={() => handleJoin('public')}>
              <div className="btn-icon"><Users size={24}/></div>
              <div className="btn-text">
                <span className="mode-title">Public Match</span>
                <span className="mode-desc">Join a global session (6 Players)</span>
              </div>
              <ChevronRight size={20} className="arrow" />
            </button>


          </div>
        </div>

        <div className="landing-footer">
          <div className="server-status">
            <div className="status-dot"></div>
            <span>Global Command Servers Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};
