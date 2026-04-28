import React, { useEffect } from 'react';
import { WorldMap } from './components/Map/WorldMap';
import { Dashboard } from './components/HUD/Dashboard';
import { Landing } from './components/HUD/Landing';
import { Lobby } from './components/HUD/Lobby';
import { useGameStore } from './store/gameStore';
import { BGMPlayer } from './components/Audio/BGMPlayer';
import { VolumeControl } from './components/Audio/VolumeControl';
import { AssetPreloader } from './components/Utils/AssetPreloader';
import './styles/index.css';
import './styles/hud.css';
import './styles/retro.css';

function App() {
  const {
    hasJoined,
    gameState,
    toggleReady,
    toggleMute,
    joinBlockedMessage,
    dismissJoinBlockedMessage,
  } = useGameStore();
  const showHUDMap = hasJoined;
  const isLobbyOverlay = hasJoined && (gameState.lobbyState === 'waiting' || gameState.lobbyState === 'starting');

  useEffect(() => {
    const isEditableTarget = (t) => {
      if (!t) return false;
      const tag = t.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || t.isContentEditable;
    };

    const onKeyDown = (e) => {
      if (isEditableTarget(e.target)) return;

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
        return;
      }

      if (e.key === 'Escape') {
        if (joinBlockedMessage) {
          e.preventDefault();
          dismissJoinBlockedMessage();
        }
        return;
      }

      if (e.code === 'Space') {
        if (isLobbyOverlay) {
          e.preventDefault();
          toggleReady();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    toggleReady,
    toggleMute,
    isLobbyOverlay,
    joinBlockedMessage,
    dismissJoinBlockedMessage,
  ]);

  return (
    <div className="game-wrapper">
      <AssetPreloader />
      {!hasJoined && <Landing />}
      {isLobbyOverlay && <Lobby />}
      <div style={{ opacity: showHUDMap ? 1 : 0, transition: 'opacity 1s', pointerEvents: showHUDMap ? 'auto' : 'none' }}>
        <WorldMap />
        <Dashboard />
      </div>
      <div className="crt-overlay" />
      <BGMPlayer />
      <VolumeControl />
    </div>
  );
}

export default App;
