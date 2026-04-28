import React from 'react';
import { WorldMap } from './components/Map/WorldMap';
import { Dashboard } from './components/HUD/Dashboard';
import { Landing } from './components/HUD/Landing';
import { Lobby } from './components/HUD/Lobby';
import { useGameStore } from './store/gameStore';
import { BGMPlayer } from './components/Audio/BGMPlayer';
import { VolumeControl } from './components/Audio/VolumeControl';
import './styles/index.css';
import './styles/hud.css';
import './styles/retro.css';

function App() {
  const { hasJoined, gameState } = useGameStore();
  const showHUDMap = hasJoined;
  const isLobbyOverlay = hasJoined && (gameState.lobbyState === 'waiting' || gameState.lobbyState === 'starting');

  return (
    <div className="game-wrapper">
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
