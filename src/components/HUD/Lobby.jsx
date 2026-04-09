import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CheckCircle, XCircle, Shield, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import gsap from 'gsap';

export const Lobby = () => {
  const { gameState, isReady, toggleReady } = useGameStore();
  const players = Object.values(gameState.players);
  const readyCount = players.filter(p => p.isReady).length;

  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const lobbyRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const hasShattered = useRef(false);
  const hasCountdownSoundPlayed = useRef(false);

  useEffect(() => {
    const audio = new Audio('/lobbby.wav');
    audio.loop = true;
    audio.volume = isMuted ? 0 : 0.3;
    audio.play().catch(e => console.warn('Audio disabled by browser:', e));
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : 0.3;
    }
  }, [isMuted]);

  useEffect(() => {
    if (gameState.lobbyState === 'starting' && gameState.matchStartTime) {
      const interval = setInterval(() => {
        const remaining = Math.ceil((gameState.matchStartTime - Date.now()) / 1000);
        setTimeLeft(remaining > 0 ? remaining : 0);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [gameState.lobbyState, gameState.matchStartTime]);

  useEffect(() => {
    if (gameState.lobbyState === 'starting' && !hasCountdownSoundPlayed.current) {
      hasCountdownSoundPlayed.current = true;
      const countdownAudio = new Audio('/5_sec_countdown.wav');
      countdownAudio.volume = isMuted ? 0 : 0.6;
      countdownAudio.play().catch(e => console.warn('Countdown audio play failed', e));
    } else if (gameState.lobbyState === 'waiting') {
      hasCountdownSoundPlayed.current = false;
    }
  }, [gameState.lobbyState, isMuted]);

  useEffect(() => {
    if (timeLeft === 1 && !hasShattered.current) {
      hasShattered.current = true;

      if (lobbyRef.current) {
        // Base container scales up and fades out
        gsap.to(lobbyRef.current, {
          scale: 1.5,
          opacity: 0,
          duration: 0.8,
          ease: "back.in(1.7)",
          filter: "blur(20px)"
        });

        // Child elements explode outwards like glass shards
        if (lobbyRef.current.children.length > 0) {
           const childrenArray = Array.from(lobbyRef.current.children);
           gsap.to(childrenArray, {
               x: () => (Math.random() - 0.5) * 1200,
               y: () => (Math.random() - 0.5) * 1200,
               rotationZ: () => (Math.random() - 0.5) * 360,
               rotationX: () => (Math.random() - 0.5) * 360,
               rotationY: () => (Math.random() - 0.5) * 360,
               opacity: 0,
               scale: () => Math.random() * 2 + 0.5,
               duration: 0.8,
               ease: "power2.in",
               stagger: 0.02
           });
        }
      }
    }
  }, [timeLeft]);

  return (
    <div className="lobby-overlay" style={{ pointerEvents: 'none', background: 'rgba(0, 5, 10, 0.4)', backdropFilter: 'none' }} ref={lobbyRef}>
      
      {gameState.lobbyState === 'starting' && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100, textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: '12rem', fontWeight: 900, color: 'var(--accent-red)', textShadow: '0 0 50px rgba(255, 0, 0, 0.8)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
            {timeLeft}
          </div>
          <div style={{ fontSize: '2rem', color: 'white', letterSpacing: '8px', textShadow: '0 0 20px rgba(255, 255, 255, 0.5)', marginTop: '-20px' }}>
            PREPARE FOR WAR
          </div>
        </div>
      )}

      <div className="lobby-content" style={{ opacity: gameState.lobbyState === 'starting' ? 0.2 : 1, transition: 'opacity 0.5s', pointerEvents: gameState.lobbyState === 'starting' ? 'none' : 'auto', background: 'rgba(10, 20, 30, 0.85)' }}>
        <button
          className="mute-btn"
          onClick={() => setIsMuted(prev => !prev)}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          title={isMuted ? "Unmute Lobby" : "Mute Lobby"}
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
        <div className="lobby-header">
          <AlertTriangle className="lobby-icon" size={36} color="var(--accent-yellow)" />
          <h2>COMMAND CENTER LOBBY</h2>
          <div className="lobby-stats">
            <span>{players.length} / 6 OPERATIVES</span>
            <div className="progress-bar-mini">
              <div className="progress-fill-mini" style={{ width: `${(readyCount / 6) * 100}%` }}></div>
            </div>
          </div>
        </div>

        <div className="player-grid">
          {Array.from({ length: 6 }).map((_, i) => {
            const p = players[i];
            return (
              <div key={i} className={`player-slot ${p ? 'occupied' : 'empty'} ${p?.isReady ? 'ready' : ''}`}>
                {p ? (
                  <>
                    <div className="player-avatar">
                      <Shield size={24} color={'var(--accent-blue)'} />
                    </div>
                    <div className="player-info">
                      <span className="p-name">{p.name} {p.socketId === useGameStore.getState().socket.id ? '(YOU)' : ''}</span>
                      <span className="p-country">
                        {p.socketId === useGameStore.getState().socket.id ? p.country : 'CLASSIFIED'}
                      </span>
                    </div>
                    <div className="p-status">
                      {p.isReady ? <CheckCircle size={20} color="var(--accent-green)" /> : <XCircle size={20} color="var(--accent-red)" />}
                    </div>
                  </>
                ) : (
                  <div className="waiting-placeholder">WAITING FOR OPERATIVE...</div>
                )}
              </div>
            );
          })}
        </div>

        {gameState.lobbyState === 'waiting' && (
          <div className="lobby-footer">
            <div className="ready-status-box">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={isReady}
                  onChange={toggleReady}
                />
                <span className="checkmark"></span>
                SET STATUS TO READY
              </label>
              <p className="ready-hint">Match starts automatically when all human commanders are ready.</p>
            </div>
            
            {/* GAME GUIDE */}
            <div className="lobby-guide" style={{ marginTop: '20px', padding: '15px', background: 'rgba(5, 10, 16, 0.85)', borderRadius: '12px', border: '1px solid var(--accent-blue)', color: 'white', fontSize: '0.8rem', textAlign: 'left', boxShadow: '0 0 20px rgba(0, 150, 255, 0.1)' }}>
              <h4 style={{ color: 'var(--accent-blue)', marginBottom: '10px', textAlign: 'center', letterSpacing: '1px' }}>COMMANDER FIELD GUIDE</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px' }}>
                  <strong style={{color:'var(--accent-red)'}}>🌍 Market</strong><br/>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Only available during War Preparation phase.</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px' }}>
                  <strong style={{color:'var(--accent-yellow)'}}>🔬 R&D</strong><br/>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Half CP cost, but 40% failure chance.</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px' }}>
                  <strong style={{color:'var(--accent-green)'}}>👁️ Intel & War</strong><br/>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Spend CP to spy. Outlast during War Window.</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
