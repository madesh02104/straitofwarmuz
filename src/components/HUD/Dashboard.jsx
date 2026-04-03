import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore, playSound } from '../../store/gameStore';
import gsap from 'gsap';
import { Shield, Activity, Send, Crosshair, HelpCircle, Bomb, Zap, ChevronUp, ChevronDown, Globe, Trophy, Skull } from 'lucide-react';

const formatTime = (ms) => {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const EQUIPMENT = {
  missile: { name: 'Ballistic Missile', type: 'attack', damage: 8, counter: 'dome', marketCost: 150, rdCost: 80, rdTime: 4000, icon: <Crosshair size={20}/> },
  dome: { name: 'Iron Dome', type: 'defense', counters: 'missile', marketCost: 120, rdCost: 60, rdTime: 4000, icon: <Shield size={20}/> },
  tank: { name: 'Heavy Tank', type: 'attack', damage: 5, counter: 'mine', marketCost: 100, rdCost: 50, rdTime: 5000, icon: <Zap size={20}/> },
  mine: { name: 'Anti-Tank Mine', type: 'defense', counters: 'tank', marketCost: 80, rdCost: 40, rdTime: 3000, icon: <Bomb size={20}/> },
  jet: { name: 'Fighter Jet', type: 'attack', damage: 6, counter: 's400', marketCost: 200, rdCost: 100, rdTime: 6000, icon: <Send size={20}/> },
  s400: { name: 'S-400 Battery', type: 'defense', counters: 'jet', marketCost: 180, rdCost: 90, rdTime: 6000, icon: <Activity size={20}/> },
  sub: { name: 'Attack Submarine', type: 'attack', damage: 7, counter: 'sonar', marketCost: 250, rdCost: 120, rdTime: 7000, icon: <Activity size={20}/> },
  sonar: { name: 'Sonar Depth Charge', type: 'defense', counters: 'sub', marketCost: 200, rdCost: 100, rdTime: 5000, icon: <Activity size={20}/> },
  virus: { name: 'Cyber Virus', type: 'attack', damage: 0, effect: 'freeze', counter: 'firewall', marketCost: 300, rdCost: 150, rdTime: 8000, icon: <Zap size={20}/> },
  firewall: { name: 'Firewall', type: 'defense', counters: 'virus', marketCost: 250, rdCost: 120, rdTime: 6000, icon: <Shield size={20}/> }
};

const QuizToaster = ({ quiz, onAnswer }) => {
  const [timeLeft, setTimeLeft] = useState(Math.floor(Math.random() * 6) + 5); // 5-10s
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onAnswer(false); // Time out = incorrect
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [quiz, onAnswer]);

  return (
    <div className="quiz-toaster">
      <div className="quiz-header">
        <HelpCircle size={16} /> <span>INTEL QUIZ (+0.5x MULTIPLIER)</span>
        <div className="quiz-timer-mini">{timeLeft}s</div>
      </div>
      <p className="quiz-question-mini">{quiz.question}</p>
      <div className="quiz-options-mini">
        {quiz.options.map((opt, i) => (
          <button key={i} onClick={() => onAnswer(i === quiz.answer)}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const { 
    gameState, myCountry, activeQuiz, submitQuiz, 
    buyItem, researchItem, spy, attack, 
    notification, worldEvent, spyResult 
  } = useGameStore();
  
  const uiRef = useRef();
  const [activeTab, setActiveTab] = useState('market');
  const [isMinimized, setIsMinimized] = useState(true);
  const [intelTarget, setIntelTarget] = useState('');
  const [intelItem, setIntelItem] = useState('missile');

  const me = Object.values(gameState.players).find(p => p.country === myCountry);
  const isFarmingPhase = gameState.phase === 1;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (me && !hasAnimated.current) {
      if (document.querySelector('.top-panel')) {
        gsap.fromTo('.top-panel', { y: -100, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' });
      }
      if (document.querySelector('.inventory-dock')) {
        gsap.fromTo('.inventory-dock', { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 1, delay: 0.5, ease: 'power3.out' });
      }
      hasAnimated.current = true;
    }
  }, [me]);

  const handleQuizAnswer = useCallback((correct) => {
    submitQuiz(correct, 0); 
    useGameStore.setState({ activeQuiz: null });
  }, [submitQuiz]);

  useEffect(() => {
    if (!isFarmingPhase && activeQuiz) {
      useGameStore.setState({ activeQuiz: null });
    }
  }, [isFarmingPhase, activeQuiz]);

  if (!me) return <div className="loading-hud">Connecting to Command Center...</div>;

  return (
    <div className="hud-container" ref={uiRef}>
      {/* Notifications & Events */}
      {notification && <div className="notification-toast" style={{ background: notification.type === 'error' ? 'var(--accent-red)' : undefined }}>{notification.message}</div>}
      
      {worldEvent && (
        <div className="world-event-banner">
          ⚠️ GLOBAL EVENT: {worldEvent.event} affecting {worldEvent.victims.join(', ')}
        </div>
      )}
      
      {/* END GAME RANKINGS OVERLAY */}
      {gameState.lobbyState === 'ended' && gameState.rankings && (
        <div className="winner-overlay">
          <div className="rankings-content">
            <Globe size={48} className="winner-icon" />
            <div className="winner-label">MATCH CONCLUDED</div>
            <div className="rankings-list">
              {gameState.rankings.map((entry) => (
                <div key={entry.rank} className={`ranking-row ${entry.survived ? 'survived' : 'eliminated'} ${entry.country === myCountry ? 'is-me' : ''}`}>
                  <div className="rank-badge">#{entry.rank}</div>
                  <div className="rank-icon">
                    {entry.survived ? <Trophy size={20} /> : <Skull size={20} />}
                  </div>
                  <div className="rank-info">
                    <span className="rank-name">{entry.name} {entry.country === myCountry ? '(YOU)' : ''}</span>
                    <span className="rank-country">{entry.country}</span>
                  </div>
                  <div className="rank-stats">
                    <span className="rank-hp">{entry.hp} HP</span>
                    <span className="rank-cp">{entry.cp} CP</span>
                  </div>
                  <div className="rank-status">
                    {entry.survived ? 'SURVIVED' : 'ELIMINATED'}
                  </div>
                </div>
              ))}
            </div>
            <button className="winner-btn" onClick={() => window.location.reload()}>RETURN TO HQ</button>
          </div>
        </div>
      )}

      {/* QUIZ TOASTER (Bottom Right) */}
      {activeQuiz && (
        <QuizToaster quiz={activeQuiz} onAnswer={handleQuizAnswer} />
      )}

      {spyResult && (
        <div className="notification-toast" style={{ background: 'var(--accent-blue)', top: '160px' }}>
          INTEL: {spyResult.target} has {spyResult.count} {EQUIPMENT[spyResult.item].name}
        </div>
      )}

      {/* TOP PANEL */}
      <div className="top-panel">
        <div className="country-info">
          <h2>{myCountry}</h2>
          <div className="hp-bar-container">
            <div className="hp-fill" style={{ width: `${me.hp}%` }} />
          </div>
          <div className="hp-text" style={{ fontSize: '0.8rem', marginTop: '4px' }}>{me.hp} HP</div>
        </div>

        <div className="stats-center">
          <div className="stat-item">
            <span className="stat-label">Country Points</span>
            <span className="stat-value" style={{ color: 'var(--accent-yellow)' }}>{Math.floor(me.cp)} CP</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Multiplier</span>
            <span className="stat-value" style={{ color: 'var(--accent-green)' }}>x{me.multiplier.toFixed(1)}</span>
          </div>
          <div className="stat-item">
             <span className="stat-label">Phase</span>
             <span className="stat-value" style={{ color: isFarmingPhase ? 'var(--accent-green)' : 'var(--accent-red)' }}>
               {isFarmingPhase ? 'PREPARATION' : 'WAR WINDOW'}
             </span>
          </div>
        </div>

        <div className="timer-box">
          <Activity className="t-icon" />
          <span className="time">{formatTime(gameState.timeRemaining)}</span>
        </div>
      </div>

      {/* INVENTORY DOCK (Always Visible) */}
      <div className="inventory-dock">
        {Object.entries(EQUIPMENT).map(([id, item]) => (
          <div 
            key={id} 
            className={`inv-item ${!isFarmingPhase && me.inventory[id] > 0 ? 'draggable' : ''}`}
            title={`${item.name}${!isFarmingPhase && me.inventory[id] > 0 ? ' — Drag onto enemy country to attack' : ''}`}
            draggable={!isFarmingPhase && me.inventory[id] > 0} 
            onDragStart={(e) => {
              e.dataTransfer.setData('itemId', id);
            }}
          >
            <div className="inv-icon" style={{ borderColor: me.inventory[id] > 0 ? 'var(--accent-blue)' : 'var(--panel-border)' }}>
              {item.icon}
            </div>
            <span className="inv-name">{item.name.split(' ').pop()}</span>
            <span className="inv-count" style={{ color: me.inventory[id] > 0 ? 'white' : 'var(--text-muted)' }}>
              {me.inventory[id]}
            </span>
          </div>
        ))}
      </div>

      {/* BOTTOM CONSOLE */}
      <div className={`main-content docked ${isMinimized ? 'minimized' : ''}`}>
        <div className="tab-container">
          <div className="tab-headers">
            <button className={`tab-btn ${activeTab === 'market' ? 'active' : ''}`} onClick={() => setActiveTab('market')}>World Market</button>
            <button className={`tab-btn ${activeTab === 'rd' ? 'active' : ''}`} onClick={() => setActiveTab('rd')}>R&D Wing</button>
            <button className={`tab-btn ${activeTab === 'intel' ? 'active' : ''}`} onClick={() => setActiveTab('intel')}>Intel Bureau</button>
            <button className="minimize-toggle" onClick={() => setIsMinimized(!isMinimized)}>
              {isMinimized ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
            </button>
          </div>

          {!isMinimized && (
            <div className="tab-content">
              {activeTab === 'market' && (
                 <div className="weapons-container" style={{ display: 'flex', flexDirection: 'row', gap: '1rem', paddingBottom: '1rem' }}>
                    {['attack', 'defense'].map((type) => (
                      <div key={type} className="weapon-group" style={{ flex: 1 }}>
                        <h4 style={{ textTransform: 'uppercase', color: type === 'attack' ? 'var(--accent-red)' : 'var(--accent-blue)', marginBottom: '0.75rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.25rem' }}>{type} Systems</h4>
                        <div className="market-grid">
                          {Object.entries(EQUIPMENT).filter(([_, item]) => item.type === type).map(([id, item]) => (
                            <div key={id} className="item-card">
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="item-name">{item.name}</span>
                                {item.icon}
                              </div>
                              <span className="item-cost">{item.marketCost} CP</span>
                              <span className="item-stock">Global Stock: {gameState.marketStock[id] || 0}</span>
                              <button 
                                className="btn-buy" 
                                onClick={() => { buyItem(id); playSound('cash_register.wav'); }}
                                disabled={me.cp < item.marketCost || (gameState.marketStock[id] || 0) <= 0}
                              >BUY NOW</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                 </div>
              )}

              {activeTab === 'rd' && (
                 <div className="weapons-container" style={{ display: 'flex', flexDirection: 'row', gap: '1rem', paddingBottom: '1rem' }}>
                    {['attack', 'defense'].map((type) => (
                      <div key={type} className="weapon-group" style={{ flex: 1 }}>
                        <h4 style={{ textTransform: 'uppercase', color: type === 'attack' ? 'var(--accent-red)' : 'var(--accent-blue)', marginBottom: '0.75rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.25rem' }}>{type} Systems</h4>
                        <div className="rd-grid">
                          {Object.entries(EQUIPMENT).filter(([_, item]) => item.type === type).map(([id, item]) => {
                            const inQueue = me.researchQueue.find(q => q.itemId === id);
                            return (
                              <div key={id} className="item-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span className="item-name">{item.name}</span>
                                  {item.icon}
                                </div>
                                <span className="item-cost">{item.rdCost} CP (R&D)</span>
                                {inQueue ? (
                                  <div className="rd-progress">RESEARCHING...</div>
                                ) : (
                                  <button 
                                    className="btn-rd" 
                                    onClick={() => researchItem(id)}
                                    disabled={me.cp < item.rdCost || me.frozenUntil > Date.now()}
                                  >START R&D</button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                 </div>
              )}

              {activeTab === 'intel' && (
                <div className="intel-bureau">
                  <h3 style={{ marginBottom: '1rem', color: 'var(--accent-blue)', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>INTELLIGENCE OPERATIONS</h3>
                  <div className="intel-controls" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="select-group" style={{ display: 'flex', gap: '10px', width: '100%' }}>
                      <select 
                        style={{ flex: 1, padding: '0.5rem', background: 'var(--panel-bg)', color: 'white', border: '1px solid var(--panel-border)', borderRadius: '4px', cursor: 'pointer' }}
                        onChange={(e) => setIntelTarget(e.target.value)} 
                        value={intelTarget}
                      >
                        <option value="">Target Nation...</option>
                        {Object.values(gameState.players).filter(p => p.country !== myCountry).map(p => (
                          <option key={p.socketId} value={p.socketId}>{p.country}</option>
                        ))}
                      </select>
                      <select 
                        style={{ flex: 1, padding: '0.5rem', background: 'var(--panel-bg)', color: 'white', border: '1px solid var(--panel-border)', borderRadius: '4px', cursor: 'pointer' }}
                        onChange={(e) => setIntelItem(e.target.value)} 
                        value={intelItem}
                      >
                        {Object.entries(EQUIPMENT).map(([id, item]) => (
                          <option key={id} value={id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      className="btn-execute"
                      style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', cursor: !intelTarget || me.cp < 50 ? 'not-allowed' : 'pointer' }}
                      onClick={() => spy(intelTarget, intelItem)} 
                      disabled={!intelTarget || me.cp < 50}
                    >DEPLOY OPERATIVE (50 CP)</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
