import React, { useState } from 'react';
import { useGameStore, playSound } from '../../store/gameStore';
import './audio.css';

export const VolumeControl = () => {
  const { bgmVolume, sfxVolume, isMuted, setBgmVolume, setSfxVolume, toggleMute } = useGameStore();
  const [isHovered, setIsHovered] = useState(false);

  const handleMuteToggle = () => {
    playSound('blip.mp3');
    toggleMute();
  };

  return (
    <div 
      className="retro-volume-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button 
        className={`retro-btn retro-mute-btn ${isMuted ? 'muted' : ''}`}
        onClick={handleMuteToggle}
        title="Mute / Unmute"
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      {isHovered && (
        <div className="volume-sliders-wrapper">
          <div className="slider-row">
            <span className="slider-label">MUS</span>
            <input 
              type="range" min="0" max="1" step="0.05" 
              value={isMuted ? 0 : bgmVolume} 
              onChange={(e) => {
                setBgmVolume(parseFloat(e.target.value));
                if (isMuted && parseFloat(e.target.value) > 0) toggleMute();
              }}
              className="retro-volume-slider"
            />
          </div>
          <div className="slider-row">
            <span className="slider-label">SFX</span>
            <input 
              type="range" min="0" max="1" step="0.05" 
              value={isMuted ? 0 : sfxVolume} 
              onChange={(e) => {
                setSfxVolume(parseFloat(e.target.value));
                if (isMuted && parseFloat(e.target.value) > 0) toggleMute();
              }}
              className="retro-volume-slider"
            />
          </div>
        </div>
      )}
    </div>
  );
};
