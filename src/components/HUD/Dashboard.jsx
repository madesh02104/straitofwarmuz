import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore, playSound } from '../../store/gameStore';
import gsap from 'gsap';
import { Target, Truck, Waves, Skull, Bomb, Shield, ShieldAlert, Radar, Zap, Lock, Activity, Send, Crosshair, HelpCircle, ChevronUp, ChevronDown, Globe, Trophy, Menu, ChevronLeft, ChevronRight } from 'lucide-react';

const formatTime = (ms) => {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const EQUIPMENT = {
  missile: { name: 'Ballistic Missile', type: 'attack', damage: 8, counter: 'dome', marketCost: 150, rdCost: 75, rdTime: 4000, attackDelay: 0, icon: <Target size={20} /> },
  dome: { name: 'Iron Dome', type: 'defense', counters: 'missile', marketCost: 150, rdCost: 75, rdTime: 4000, icon: <Shield size={20} /> },
  tank: { name: 'Heavy Tank Army', type: 'attack', damage: 5, counter: 'mine', marketCost: 100, rdCost: 50, rdTime: 5000, attackDelay: 4000, icon: <Truck size={20} /> },
  mine: { name: 'Anti Tank', type: 'defense', counters: 'tank', marketCost: 100, rdCost: 50, rdTime: 3000, icon: <ShieldAlert size={20} /> },
  jet: { name: 'Fighter Jet', type: 'attack', damage: 6, counter: 's400', marketCost: 200, rdCost: 100, rdTime: 6000, attackDelay: 2000, icon: <Send size={20} /> },
  s400: { name: 'Radar Destruction', type: 'defense', counters: 'jet', marketCost: 200, rdCost: 100, rdTime: 6000, icon: <Radar size={20} /> },
  sub: { name: 'Attack Submarine', type: 'attack', damage: 7, counter: 'sonar', marketCost: 250, rdCost: 125, rdTime: 7000, attackDelay: 4000, icon: <Waves size={20} /> },
  sonar: { name: 'Naval Mines', type: 'defense', counters: 'sub', marketCost: 250, rdCost: 125, rdTime: 5000, icon: <Zap size={20} /> },
  virus: { name: 'Cyber Attack', type: 'attack', counters: 'nuke,missile', marketCost: 300, rdCost: 150, rdTime: 8000, icon: <Skull size={20} /> },
  firewall: { name: 'Firewall', type: 'defense', counters: 'virus', marketCost: 300, rdCost: 150, rdTime: 6000, icon: <Lock size={20} /> },
  nuke: { name: 'Nuke', type: 'attack', effect: 'nuke', counter: null, marketCost: 500, rdCost: 250, rdTime: 10000, attackDelay: 2000, icon: <Bomb size={20} /> }
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
    buyItem, researchItem, spy, attack, activateDeflect,
    notification, worldEvent, spyResult
  } = useGameStore();

  const uiRef = useRef();
  const [activeTab, setActiveTab] = useState('market');
  const [isMinimized, setIsMinimized] = useState(true);
  const [intelTarget, setIntelTarget] = useState('');
  const [intelItem, setIntelItem] = useState('missile');
  const [intelCategory, setIntelCategory] = useState('attack');
  const [cooldowns, setCooldowns] = useState({});

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

  useEffect(() => {
    const onAttackEvent = (e) => {
      const data = e.detail;
      const socketId = useGameStore.getState().socket?.id;
      if (data.attacker === socketId && data.itemId && EQUIPMENT[data.itemId].attackDelay > 0) {
        setCooldowns(prev => ({
          ...prev,
          [data.itemId]: Date.now() + EQUIPMENT[data.itemId].attackDelay
        }));
      }
    };
    window.addEventListener('attackEvent', onAttackEvent);
    return () => window.removeEventListener('attackEvent', onAttackEvent);
  }, []);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const int = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(int);
  }, []);

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
                    {entry.rank === 1 ? <Trophy size={20} color="var(--accent-yellow)" /> : (entry.survived ? <Shield size={20} /> : <Skull size={20} />)}
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
                    {entry.rank === 1 ? 'WINNER' : (entry.survived ? 'SURVIVED' : 'ELIMINATED')}
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
        <div className="notification-toast" style={{ background: 'var(--accent-blue)', top: '160px', height: 'auto', whiteSpace: 'pre-line', textAlign: 'left', zIndex: 100 }}>
          {spyResult.mode === 'specific'
            ? `INTEL: ${gameState.players[spyResult.target]?.country} has ${spyResult.count} ${EQUIPMENT[spyResult.itemId]?.name}`
            : spyResult.mode === 'category'
              ? `INTEL (${gameState.players[spyResult.target]?.country} - ${spyResult.category.toUpperCase()}):\n` + Object.entries(spyResult.data).map(([id, count]) => `${EQUIPMENT[id].name}: ${count}`).join('\n')
              : `FULL INTEL (${gameState.players[spyResult.target]?.country}):\n` + Object.entries(spyResult.data).map(([id, count]) => `${EQUIPMENT[id].name}: ${count}`).join('\n')
          }
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

      {/* INVENTORY DOCK — 2-row layout */}
      <div className="inventory-dock">

        {/* ROW 1: ATTACK weapons — draggable in war phase */}
        <div className="inv-row">
          <span className="inv-row-label attack">⚔ ATTACK</span>
          {Object.entries(EQUIPMENT).filter(([_, item]) => item.type === 'attack').map(([id, item]) => {
            const cdRemaining = cooldowns[id] ? Math.max(0, cooldowns[id] - now) : 0;
            const isOnCooldown = cdRemaining > 0;
            const isStocked = (me.inventory[id] || 0) > 0;
            const isCyber = id === 'virus';
            const canDrag = !isFarmingPhase && isStocked && !isOnCooldown && !isCyber;
            return (
              <div
                key={id}
                className={`inv-item attack-item ${canDrag ? 'draggable' : ''}`}
                title={isCyber ? `${item.name} — Click to activate Deflection Shield` : `${item.name}${canDrag ? ' — Drag onto enemy to attack' : ''}${isOnCooldown ? ` (cooldown ${(cdRemaining/1000).toFixed(1)}s)` : ''}${isFarmingPhase ? ' (War phase only)' : ''}`}
                draggable={canDrag}
                onDragStart={(e) => { if(canDrag) e.dataTransfer.setData('itemId', id); }}
                onClick={() => { if(isCyber && isStocked && !isFarmingPhase) activateDeflect(); }}
                style={{ position: 'relative', overflow: 'hidden', cursor: isCyber && isStocked && !isFarmingPhase ? 'pointer' : 'default' }}
              >
                <div className={`inv-icon attack${isStocked ? ' stocked' : ''}`}>
                  {item.icon}
                </div>
                <span className="inv-name">{item.name.split(' ').pop()}</span>
                <span className="inv-count" style={{ color: isStocked ? '#ff6b6b' : 'var(--text-muted)' }}>
                  {me.inventory[id] || 0}
                </span>
                {isOnCooldown && (
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4444', fontWeight: 900, fontSize: '13px', borderRadius: '10px', zIndex: 10 }}>
                    {(cdRemaining / 1000).toFixed(1)}s
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="inv-row-divider" />

        {/* ROW 2: DEFENSE weapons — static, auto-depleted when attacked */}
        <div className="inv-row">
          <span className="inv-row-label defense">🛡 DEFENSE</span>
          {Object.entries(EQUIPMENT).filter(([_, item]) => item.type === 'defense').map(([id, item]) => {
            const isStocked = (me.inventory[id] || 0) > 0;
            return (
              <div
                key={id}
                className="inv-item defense-item"
                title={`${item.name}${id === 'virus' ? ' — Auto-counters Nuke & Missile' : ''}`}
              >
                <div className={`inv-icon defense${isStocked ? ' stocked' : ''}`}>
                  {item.icon}
                </div>
                <span className="inv-name">{item.name.split(' ').pop()}</span>
                <span className="inv-count" style={{ color: isStocked ? '#79b8ff' : 'var(--text-muted)' }}>
                  {me.inventory[id] || 0}
                </span>
              </div>
            );
          })}
        </div>

      </div>



      {/* SIDEBAR NAVIGATION & CONTENT */}
      {/* Absolute Toggle Button (visible when sidebar is closed/minimized) */}
      <button 
        className={`sidebar-toggle-btn ${!isMinimized ? 'hidden' : ''}`} 
        onClick={() => setIsMinimized(false)}
        title="Open Command Center"
      >
        <Menu size={24} color="var(--accent-blue)" />
      </button>

      <div className={`sidebar-container ${isMinimized ? 'minimized' : ''}`}>
        <div className="sidebar-header">
          <h3 className="sidebar-title">COMMAND CENTER</h3>
          <button className="sidebar-close-btn" onClick={() => setIsMinimized(true)}>
            <ChevronLeft size={24} />
          </button>
        </div>

        <div className="sidebar-nav">
          <button className={`nav-btn ${activeTab === 'market' ? 'active' : ''}`} onClick={() => setActiveTab('market')}>🌍 World Market</button>
          <button className={`nav-btn ${activeTab === 'rd' ? 'active' : ''}`} onClick={() => setActiveTab('rd')}>🔬 R&D Wing</button>
          <button className={`nav-btn ${activeTab === 'intel' ? 'active' : ''}`} onClick={() => setActiveTab('intel')}>👁️ Intel Bureau</button>
        </div>

        <div className="sidebar-content">
              {activeTab === 'market' && (
                <div className="sidebar-section">
                  {['attack', 'defense'].map((type) => (
                    <div key={type} className="weapon-group" style={{ flex: 1 }}>
                      <h4 style={{ textTransform: 'uppercase', color: type === 'attack' ? 'var(--accent-red)' : 'var(--accent-blue)', marginBottom: '0.75rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.25rem' }}>{type} Systems</h4>
                      <div className="market-grid">
                        {Object.entries(EQUIPMENT).filter(([_, item]) => item.type === type).map(([id, item]) => (
                          <div key={id} className="item-card" style={{
                            border: `1px solid ${type === 'attack' ? 'rgba(255, 68, 68, 0.4)' : 'rgba(88, 166, 255, 0.4)'}`,
                            background: type === 'attack' ? 'rgba(255, 68, 68, 0.05)' : 'rgba(88, 166, 255, 0.05)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span className="item-name">{item.name}</span>
                              {item.icon}
                            </div>
                            <span className="item-cost">{item.marketCost} CP</span>
                            <span className="item-stock">Global Stock: {gameState.marketStock[id] || 0}</span>
                            <button
                              className="btn-buy"
                              onClick={() => { buyItem(id); playSound('cash_register.wav'); }}
                              disabled={me.cp < item.marketCost || (gameState.marketStock[id] || 0) <= 0 || (id === 'nuke' && me.nukeBuilt)}
                            >{(id === 'nuke' && me.nukeBuilt) ? 'LIMIT EXCEEDED' : 'BUY NOW'}</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'rd' && (
                <div className="sidebar-section">
                  {['attack', 'defense'].map((type) => (
                    <div key={type} className="weapon-group" style={{ flex: 1 }}>
                      <h4 style={{ textTransform: 'uppercase', color: type === 'attack' ? 'var(--accent-red)' : 'var(--accent-blue)', marginBottom: '0.75rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.25rem' }}>{type} Systems</h4>
                      <div className="rd-grid">
                        {Object.entries(EQUIPMENT).filter(([_, item]) => item.type === type).map(([id, item]) => {
                          const inQueue = me.researchQueue.find(q => q.itemId === id);
                          return (
                            <div key={id} className="item-card" style={{
                              border: `1px solid ${type === 'attack' ? 'rgba(255, 68, 68, 0.4)' : 'rgba(88, 166, 255, 0.4)'}`,
                              background: type === 'attack' ? 'rgba(255, 68, 68, 0.05)' : 'rgba(88, 166, 255, 0.05)'
                            }}>
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
                                  disabled={me.cp < item.rdCost || me.frozenUntil > Date.now() || (id === 'nuke' && me.nukeBuilt)}
                                >{(id === 'nuke' && me.nukeBuilt) ? 'LIMIT EXCEEDED' : 'START R&D'}</button>
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
                    <select
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--panel-bg)', color: 'white', border: '1px solid var(--panel-border)', borderRadius: '4px', cursor: 'pointer' }}
                      onChange={(e) => setIntelTarget(e.target.value)}
                      value={intelTarget}
                    >
                      <option value="">Target Nation...</option>
                      {Object.values(gameState.players).filter(p => p.country !== myCountry).map(p => (
                        <option key={p.socketId} value={p.socketId}>{p.country}</option>
                      ))}
                    </select>
                    <hr style={{ borderColor: 'var(--panel-border)', margin: '0.5rem 0' }} />
                    <button className="btn-execute" style={{ width: '100%', padding: '0.75rem', cursor: !intelTarget || me.cp < 500 ? 'not-allowed' : 'pointer' }} onClick={() => spy(intelTarget, { mode: 'full' })} disabled={!intelTarget || me.cp < 500}>FULL INTEL PACKAGE (500 CP)</button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <select style={{ flex: 1, padding: '0.5rem', background: 'var(--panel-bg)', color: 'white', border: '1px solid var(--panel-border)', borderRadius: '4px' }} onChange={(e) => setIntelCategory(e.target.value)} value={intelCategory}>
                        <option value="attack">Attack Base</option>
                        <option value="defense">Defense Base</option>
                      </select>
                      <button className="btn-execute" style={{ flex: 2, padding: '0.75rem' }} onClick={() => spy(intelTarget, { mode: 'category', category: intelCategory })} disabled={!intelTarget || me.cp < 300}>CATEGORY SCAN (300 CP)</button>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <select style={{ flex: 1, padding: '0.5rem', background: 'var(--panel-bg)', color: 'white', border: '1px solid var(--panel-border)', borderRadius: '4px' }} onChange={(e) => setIntelItem(e.target.value)} value={intelItem}>
                        {Object.entries(EQUIPMENT).map(([id, item]) => (<option key={id} value={id}>{item.name}</option>))}
                      </select>
                      <button className="btn-execute" style={{ flex: 2, padding: '0.75rem' }} onClick={() => spy(intelTarget, { mode: 'specific', itemId: intelItem })} disabled={!intelTarget || me.cp < 100}>SPECIFIC INTEL (100 CP)</button>
                    </div>
                  </div>
                </div>
              )}
        </div>
      </div>
    </div>
  );
};
