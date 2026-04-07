import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CheckCircle, XCircle, Users, Globe, Shield, Volume2, VolumeX } from 'lucide-react';

export const Lobby = () => {
  const { gameState, isReady, toggleReady } = useGameStore();
  const players = Object.values(gameState.players);
  const readyCount = players.filter(p => p.isReady).length;
  
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

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

  return (
    <div className="lobby-overlay">
      <div className="lobby-content">
        <button 
          className="mute-btn" 
          onClick={() => setIsMuted(prev => !prev)}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          title={isMuted ? "Unmute Lobby" : "Mute Lobby"}
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
        <div className="lobby-header">
          <Globe className="lobby-icon" size={32} />
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
        </div>
      </div>
    </div>
  );
};
