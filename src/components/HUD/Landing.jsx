import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Shield, Globe, Users, ChevronRight, Maximize } from 'lucide-react';
import gsap from 'gsap';

export const Landing = () => {
  const [name, setName] = useState('');
  const joinMatch = useGameStore(state => state.joinMatch);

  useEffect(() => {
    // Modern entry animations
    gsap.fromTo('.landing-header h1', 
      { y: -30, opacity: 0, scale: 0.9 }, 
      { y: 0, opacity: 1, scale: 1, duration: 1, ease: 'power3.out' }
    );
    gsap.fromTo('.landing-header p', 
      { y: -20, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 1, delay: 0.2, ease: 'power3.out' }
    );
    gsap.fromTo('.landing-card', 
      { y: 40, opacity: 0, rotationX: 10 }, 
      { y: 0, opacity: 1, rotationX: 0, duration: 1, delay: 0.4, ease: 'back.out(1.2)', transformPerspective: 1000 }
    );
    gsap.fromTo('.instructions-box', 
      { x: -50, opacity: 0 }, 
      { x: 0, opacity: 1, duration: 1, delay: 0.6, ease: 'power3.out' }
    );
    gsap.fromTo('.soft-prompt', 
      { y: 20, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 1, delay: 0.8, ease: 'power3.out' }
    );
  }, []);

  const handleJoin = () => {
    if (!name.trim()) {
      gsap.to('.name-input', { x: 10, repeat: 5, yoyo: true, duration: 0.05 });
      return;
    }
    joinMatch(name);
  };

  return (
    <div className="landing-overlay" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <div className="landing-content" style={{ display: 'flex', gap: '3rem', alignItems: 'center', justifyContent: 'center', maxWidth: '1000px', width: '100%' }}>
        
        {/* Left Side: Game Instructions */}
        <div className="instructions-box" style={{ background: 'rgba(5, 10, 16, 0.6)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(88, 166, 255, 0.2)', maxWidth: '350px', backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', marginTop: '6rem' }}>
          <h3 style={{ color: 'var(--accent-blue)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
            <Shield size={24} /> HOW TO PLAY
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '14px', lineHeight: '1.5' }}>
            <li><strong style={{color: 'var(--accent-yellow)'}}>1. Enter Name:</strong> Join the global battlefield as a rogue commander.</li>
            <li><strong style={{color: 'var(--accent-green)'}}>2. Prep Phase (2m):</strong> Buy defenses, queue R&D, and analyze opponents via Intel.</li>
            <li><strong style={{color: 'var(--accent-red)'}}>3. War Phase (1m):</strong> Drag attack weapons from your dock onto enemy nations to deal damage.</li>
            <li><strong style={{color: '#ffb86c'}}>4. Intelligence:</strong> Answer strategy quizzes for CP multipliers.</li>
            <li><strong style={{color: '#bd93f9'}}>5. Survival:</strong> The last standing nation wins. Auto-defenses counter matching attacks!</li>
          </ul>
        </div>
        
        {/* Right Side: Main Entry Form */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, maxWidth: '400px' }}>
          <div className="landing-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Globe className="logo-icon" size={56} style={{ color: 'var(--accent-blue)', filter: 'drop-shadow(0 0 10px rgba(88,166,255,0.5))' }} />
            <h1 style={{ fontSize: '3rem', margin: '10px 0', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '900', textShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>COUNTRY<span style={{ color: 'var(--accent-blue)' }}>SIDE</span></h1>
            <p style={{ color: 'var(--text-muted)', letterSpacing: '1px' }}>Global Strategy. Last Nation Standing.</p>
          </div>

          <div className="landing-card" style={{ background: 'var(--panel-bg)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--panel-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)' }}>
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>OPERATIVE NAME</label>
              <input 
                type="text" 
                className="name-input"
                placeholder="Enter Command Name..." 
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={15}
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: 'white', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div className="mode-selection">
              <button className="mode-btn public" onClick={() => handleJoin('public')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'linear-gradient(to right, rgba(88,166,255,0.1), rgba(88,166,255,0.05))', border: '1px solid rgba(88,166,255,0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', transition: 'all 0.3s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Users size={24} color="var(--accent-blue)"/>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Enter Session</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Join a global match (6 Players)</div>
                  </div>
                </div>
                <ChevronRight size={20} className="arrow" />
              </button>
            </div>
            
            <div className="soft-prompt" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Maximize size={16} />
              <span>For the best strategic experience, press <strong style={{ color: 'var(--text-main)' }}>F11</strong> to play in Fullscreen.</span>
            </div>
          </div>
        </div>

      </div>

      <div className="landing-footer" style={{ marginTop: '3rem', position: 'relative' }}>
        <div className="server-status" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div className="status-dot" style={{ width: '8px', height: '8px', background: 'var(--accent-green)', borderRadius: '50%', boxShadow: '0 0 8px var(--accent-green)' }}></div>
          <span>Global Command Servers Online</span>
        </div>
      </div>
    </div>
  );
};

