import React from 'react';
import { WorldMap } from './components/Map/WorldMap';
import { Dashboard } from './components/HUD/Dashboard';
import { Landing } from './components/HUD/Landing';
import { Lobby } from './components/HUD/Lobby';
import { useGameStore } from './store/gameStore';
import './styles/index.css';
import './styles/hud.css';

function App() {
  const { hasJoined, gameState } = useGameStore();
  const isGameActive = gameState.lobbyState === 'active' || gameState.lobbyState === 'ended';
  const isLobby = hasJoined && gameState.lobbyState === 'waiting';

  return (
    <div className="game-wrapper">
      {!hasJoined && <Landing />}
      {isLobby && <Lobby />}
      <div style={{ opacity: isGameActive ? 1 : 0, transition: 'opacity 1s', pointerEvents: isGameActive ? 'auto' : 'none' }}>
        <WorldMap />
        <Dashboard />
      </div>
    </div>
  );
}

export default App;
