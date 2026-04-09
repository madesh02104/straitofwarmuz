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

// Attack → Defense pairs for side-by-side layout
const WEAPON_PAIRS = [
  { attack: 'missile', defense: 'dome' },
  { attack: 'tank', defense: 'mine' },
  { attack: 'jet', defense: 's400' },
  { attack: 'sub', defense: 'sonar' },
  { attack: 'virus', defense: 'firewall' },
  { attack: 'nuke', defense: null },
];

const getDamageLabel = (id) => {
  const item = EQUIPMENT[id];
  if (!item || item.type !== 'attack') return '';
  if (item.effect === 'nuke') return '-50%';
  if (item.damage) return `-${item.damage}`;
  return '';
};

const QuizToaster = ({ quiz, onAnswer }) => {
  const initialTimeLeft = 10;
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const tickAudioRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    tickAudioRef.current = new Audio('/tick_timer.wav');
    tickAudioRef.current.volume = 0.5;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 4 && prev > 1) {
          if (tickAudioRef.current) {
            tickAudioRef.current.currentTime = 0;
            tickAudioRef.current.play().catch(e => console.warn(e));
          }
        }
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onAnswer(false); // Time out = incorrect
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearInterval(timerRef.current);
      if (tickAudioRef.current) {
        tickAudioRef.current.pause();
      }
    };
  }, [quiz, onAnswer]);

  const percentage = (timeLeft / initialTimeLeft) * 100;
  const barColor = timeLeft > 3 ? 'var(--accent-green)' : 'var(--accent-red)';

  return (
    <div className="quiz-toaster">
      <div className="quiz-header">
        <HelpCircle size={16} /> <span>INTEL QUIZ (+0.5x MULTIPLIER)</span>
        <div className="quiz-timer-mini">{timeLeft}s</div>
      </div>
      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '4px 0 8px 0', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percentage}%`, background: barColor, transition: 'width 1s linear, background-color 0.3s' }} />
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
    buyItem, researchItem, spy, activateDeflect,
    notification, worldEvent, spyResult, intelLogs
  } = useGameStore();

  const uiRef = useRef();
  const [activeTab, setActiveTab] = useState(0); // 0=market, 1=rd, 2=intel
  const [isMinimized, setIsMinimized] = useState(false);
  const [intelTarget, setIntelTarget] = useState('');
  const [intelItem, setIntelItem] = useState('missile');
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

  const [now, setNow] = useState(() => Date.now());
  const lastCyberTick = useRef(0);

  useEffect(() => {
    const int = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    if (me && me.deflectingUntil) {
      const remain = me.deflectingUntil - now;
      if (remain > 0 && remain <= 3000) {
        const currentSec = Math.ceil(remain / 1000);
        if (currentSec !== lastCyberTick.current) {
          lastCyberTick.current = currentSec;
          playSound('tick_timer.wav');
        }
      } else if (remain <= 0) {
        lastCyberTick.current = 0;
      }
    }
  }, [now, me]);

  const handleQuizAnswer = useCallback((correct) => {
    if (correct) {
      playSound('correct_answer.wav');
    } else {
      playSound('low_battery.mp3');
    }
    submitQuiz(correct, 0);
    useGameStore.setState({ activeQuiz: null });
  }, [submitQuiz]);

  useEffect(() => {
    if (!isFarmingPhase && activeQuiz) {
      useGameStore.setState({ activeQuiz: null });
    }
  }, [isFarmingPhase, activeQuiz]);

  // Custom drag to swipe logic
  const [touchStart, setTouchStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e) => {
    setTouchStart(e.clientX ?? e.touches?.[0]?.clientX);
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    // prevent text selection while dragging
    e.preventDefault(); 
  };

  const handlePointerUp = (e) => {
    if (!isDragging || touchStart === null) return;
    const endX = e.clientX ?? e.changedTouches?.[0]?.clientX;
    const diff = touchStart - endX;
    
    if (diff > 50 && activeTab < 2) setActiveTab(prev => prev + 1);
    else if (diff < -50 && activeTab > 0) setActiveTab(prev => prev - 1);
    
    setIsDragging(false);
    setTouchStart(null);
  };

  if (!me) return <div className="loading-hud">Connecting to Command Center...</div>;

  const tabNames = ['🌍 Market', '🔬 R&D', '👁️ Intel'];

  const phaseTimeRemaining = isFarmingPhase 
    ? Math.max(0, gameState.timeRemaining - 60000) 
    : gameState.timeRemaining;
  const isLast5Sec = phaseTimeRemaining > 0 && phaseTimeRemaining <= 5000;
  const timerGlow = isLast5Sec ? '0 0 15px var(--accent-red)' : 'none';
  const timerColor = isLast5Sec ? 'var(--accent-red)' : 'var(--text-bright)';

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
            
            {gameState.battleLogs && gameState.battleLogs.length > 0 && (
              <div className="battle-logs-container" style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                <h3 style={{ textTransform: 'uppercase', fontSize: '14px', marginBottom: '10px', color: 'var(--accent-blue)' }}>BATTLE LOG</h3>
                {gameState.battleLogs.map((log, i) => (
                  <div key={i} style={{ fontSize: '12px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', color: log.text.includes('[ATTACK]') ? 'var(--accent-red)' : log.text.includes('[DEFENSE]') ? 'var(--text-muted)' : log.text.includes('[FIREWALL]') ? '#aaaaaa' : '#00ffcc' }}>
                    <span style={{ opacity: 0.5, marginRight: '8px' }}>{new Date(log.time).toLocaleTimeString()}</span>
                    {log.text}
                  </div>
                ))}
              </div>
            )}
            
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

        <div className="timer-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px' }}>
          <div className="timer-box" style={{ textShadow: timerGlow, color: timerColor, transition: 'all 0.3s ease' }}>
            <Activity className="t-icon" />
            <span className="time" style={{ fontWeight: isLast5Sec ? 900 : 'normal' }}>{formatTime(phaseTimeRemaining)}</span>
          </div>
          {isFarmingPhase && isLast5Sec && (
            <span style={{ color: 'var(--accent-red)', fontSize: '9px', fontWeight: 800, textAlign: 'center', marginTop: '4px', maxWidth: '100px', lineHeight: 1.1, textShadow: '0 0 10px #f85149' }}>
              5 SEC LEFT TO BUY!
            </span>
          )}
        </div>
      </div>

      {/* INVENTORY DOCK — Paired vertical columns: Attack top, Defense bottom */}
      <div className="inventory-dock">
        <div className="inv-pairs-row">
          {WEAPON_PAIRS.map(({ attack: atkId, defense: defId }) => {
            const atkItem = EQUIPMENT[atkId];
            const defItem = defId ? EQUIPMENT[defId] : null;
            const cdRemaining = cooldowns[atkId] ? Math.max(0, cooldowns[atkId] - now) : 0;
            const isOnCooldown = cdRemaining > 0;
            const isAtkStocked = (me.inventory[atkId] || 0) > 0;
            const isDefStocked = defId ? (me.inventory[defId] || 0) > 0 : false;
            const isCyber = atkId === 'virus';
            const deflectRemaining = (isCyber && me.deflectingUntil) ? Math.max(0, me.deflectingUntil - now) : 0;
            const isDeflecting = isCyber && deflectRemaining > 0;
            const canActivateCyber = isCyber && isAtkStocked && !isFarmingPhase && !isDeflecting && me.hp > 0;
            const canDrag = !isFarmingPhase && isAtkStocked && !isOnCooldown && !isCyber && me.hp > 0;
            const dmgLabel = getDamageLabel(atkId);

            return (
              <div key={atkId} className="inv-pair-col">
                {/* ATTACK (top) */}
                <div
                  className={`inv-item attack-item ${canDrag ? 'draggable' : ''}`}
                  title={isCyber ? `${atkItem.name} — Click to activate Deflection Shield` : `${atkItem.name}${canDrag ? ' — Drag onto enemy to attack' : ''}${isOnCooldown ? ` (cooldown ${(cdRemaining/1000).toFixed(1)}s)` : ''}${isFarmingPhase ? ' (War phase only)' : ''}`}
                  draggable={canDrag}
                  onDragStart={(e) => { if(canDrag) e.dataTransfer.setData('itemId', atkId); }}
                  onClick={() => { if(canActivateCyber) activateDeflect(); }}
                  style={{ position: 'relative', overflow: 'hidden', cursor: canActivateCyber ? 'pointer' : (isDeflecting ? 'not-allowed' : 'default') }}
                >
                  <div className={`inv-icon attack ${isCyber ? 'cyber-icon' : 'circle-icon'}${isAtkStocked ? ' stocked' : ''}`}>
                    {atkItem.icon}
                  </div>
                  <span className="inv-name">{atkItem.name.split(' ').pop()}</span>
                  <div className="inv-count-row">
                    <span className="inv-count" style={{ color: isAtkStocked ? '#ff6b6b' : 'var(--text-muted)' }}>
                      {me.inventory[atkId] || 0}
                    </span>
                    {dmgLabel && <span className="inv-damage">{dmgLabel}</span>}
                  </div>
                  {isOnCooldown && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4444', fontWeight: 900, fontSize: '13px', borderRadius: '10px', zIndex: 10 }}>
                      {(cdRemaining / 1000).toFixed(1)}s
                    </div>
                  )}
                  {isDeflecting && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 255, 204, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '10px' }}>
                      <span style={{ color: '#00ffcc', fontWeight: 900, fontSize: '13px', textShadow: '0 0 5px black' }}>{(deflectRemaining / 1000).toFixed(1)}s</span>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, height: '4px', background: 'rgba(0,0,0,0.5)', width: '100%', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(deflectRemaining / 5000) * 100}%`, background: '#00ffcc', transition: 'width 0.1s linear' }} />
                      </div>
                    </div>
                  )}
                </div>
                {/* DEFENSE (bottom) */}
                {defItem && (
                  <div className="inv-item defense-item" title={defItem.name}>
                    <div className={`inv-icon defense circle-icon${isDefStocked ? ' stocked' : ''}`}>
                      {defItem.icon}
                    </div>
                    <span className="inv-name">{defItem.name.split(' ').pop()}</span>
                    <span className="inv-count" style={{ color: isDefStocked ? '#79b8ff' : 'var(--text-muted)' }}>
                      {me.inventory[defId] || 0}
                    </span>
                  </div>
                )}
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

        {/* Tab indicators */}
        <div className="sidebar-nav">
          {tabNames.map((name, i) => (
            <button key={i} className={`nav-btn ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>{name}</button>
          ))}
        </div>

        {/* Swipable content area */}
        <div 
          className="sidebar-swipe-container" 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div className="sidebar-swipe-inner" style={{ transform: `translateX(-${activeTab * 100}%)` }}>
          {/* Panel 0: Market */}
          <div className="sidebar-swipe-panel" style={{ position: 'relative' }}>
            {!isFarmingPhase && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(5, 10, 16, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-red)' }}>
                <Lock size={48} style={{ marginBottom: '16px' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: '2px', textAlign: 'center' }}>MARKET CLOSED</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px', padding: '0 40px', lineHeight: 1.5 }}>The World Market is unavailable during the War Window. Weapons can only be purchased during the Preparation phase.</p>
              </div>
            )}
            <div className="sidebar-section" style={{ filter: !isFarmingPhase ? 'blur(2px) grayscale(1)' : 'none', pointerEvents: !isFarmingPhase ? 'none' : 'auto' }}>
              <div className="paired-header">
                <span className="paired-col-label attack-label">⚔ ATTACK</span>
                <span className="paired-col-label defense-label">🛡 COUNTER</span>
              </div>
              {WEAPON_PAIRS.map(({ attack: atkId, defense: defId }) => {
                const atkItem = EQUIPMENT[atkId];
                const defItem = defId ? EQUIPMENT[defId] : null;
                return (
                  <div key={atkId} className="paired-row">
                    {/* Attack side */}
                    <div className="paired-card attack-card">
                      <div className="paired-card-top">
                        <span className="item-name">{atkItem.name}</span>
                        {atkItem.icon}
                      </div>
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="item-cost" style={{ marginTop: 0 }}>{atkItem.marketCost} CP</span>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>|</span>
                        <span className="item-stock">
                          {atkId === 'nuke' 
                            ? `Stock: ${(gameState.marketStock[atkId] || 0) === 0 ? '-/0' : `${me.nukeMarketBuilt ? 0 : 1}/${gameState.marketStock[atkId] || 0}`}`
                            : `Stock: ${gameState.marketStock[atkId] || 0}`}
                        </span>
                      </div>
                      <button
                        className="btn-buy"
                        onClick={() => { buyItem(atkId); playSound('cash_register.wav'); }}
                        disabled={me.cp < atkItem.marketCost || (gameState.marketStock[atkId] || 0) <= 0 || (atkId === 'nuke' && me.nukeMarketBuilt)}
                      >{(atkId === 'nuke' && me.nukeMarketBuilt) ? 'LIMIT EXCEEDED' : (gameState.marketStock[atkId] || 0) <= 0 ? 'OUT OF STOCK' : 'BUY NOW'}</button>
                    </div>
                    {/* Arrow */}
                    <div className="paired-arrow">→</div>
                    {/* Defense side */}
                    {defItem ? (
                      <div className="paired-card defense-card">
                        <div className="paired-card-top">
                          <span className="item-name">{defItem.name}</span>
                          {defItem.icon}
                        </div>
                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="item-cost" style={{ marginTop: 0 }}>{defItem.marketCost} CP</span>
                          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>|</span>
                          <span className="item-stock">Stock: {gameState.marketStock[defId] || 0}</span>
                        </div>
                        <button
                          className="btn-buy"
                          onClick={() => { buyItem(defId); playSound('cash_register.wav'); }}
                          disabled={me.cp < defItem.marketCost || (gameState.marketStock[defId] || 0) <= 0}
                        >{(gameState.marketStock[defId] || 0) <= 0 ? 'OUT OF STOCK' : 'BUY NOW'}</button>
                      </div>
                    ) : (
                      <div className="paired-card" style={{ border: 'none', background: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        <HelpCircle size={48} style={{ opacity: 0.15, strokeWidth: 1 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel 1: R&D */}
          <div className="sidebar-swipe-panel">
            <div className="sidebar-section">
              <div className="paired-header">
                <span className="paired-col-label attack-label">⚔ ATTACK</span>
                <span className="paired-col-label defense-label">🛡 COUNTER</span>
              </div>
              {WEAPON_PAIRS.map(({ attack: atkId, defense: defId }) => {
                const atkItem = EQUIPMENT[atkId];
                const defItem = defId ? EQUIPMENT[defId] : null;
                const atkInQueue = me.researchQueue.find(q => q.itemId === atkId);
                const defInQueue = defId ? me.researchQueue.find(q => q.itemId === defId) : null;
                return (
                  <div key={atkId} className="paired-row">
                    {/* Attack side */}
                    <div className="paired-card attack-card">
                      <div className="paired-card-top">
                        <span className="item-name">{atkItem.name}</span>
                        {atkItem.icon}
                      </div>
                      <span className="item-cost">{atkItem.rdCost} CP (R&D)</span>
                      {atkInQueue ? (
                        <div className="rd-progress">RESEARCHING...</div>
                      ) : (
                        <button
                          className="btn-rd"
                          onClick={() => researchItem(atkId)}
                          disabled={me.cp < atkItem.rdCost || me.frozenUntil > now || (atkId === 'nuke' && me.nukeRDBuilt)}
                        >{(atkId === 'nuke' && me.nukeRDBuilt) ? 'LIMIT EXCEEDED' : 'START R&D'}</button>
                      )}
                    </div>
                    {/* Arrow */}
                    <div className="paired-arrow">→</div>
                    {/* Defense side */}
                    {defItem ? (
                      <div className="paired-card defense-card">
                        <div className="paired-card-top">
                          <span className="item-name">{defItem.name}</span>
                          {defItem.icon}
                        </div>
                        <span className="item-cost">{defItem.rdCost} CP (R&D)</span>
                        {defInQueue ? (
                          <div className="rd-progress">RESEARCHING...</div>
                        ) : (
                          <button
                            className="btn-rd"
                            onClick={() => researchItem(defId)}
                            disabled={me.cp < defItem.rdCost || me.frozenUntil > now}
                          >START R&D</button>
                        )}
                      </div>
                    ) : (
                      <div className="paired-card" style={{ border: 'none', background: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        <HelpCircle size={48} style={{ opacity: 0.15, strokeWidth: 1 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel 2: Intel */}
          <div className="sidebar-swipe-panel">
            <div className="intel-bureau">
              <h3 style={{ marginBottom: '1rem', color: 'var(--accent-blue)', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>INTELLIGENCE OPERATIONS</h3>
              <div className="intel-controls" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Target selection */}
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

                <hr style={{ borderColor: 'var(--panel-border)', margin: '0.25rem 0' }} />

                {/* Full Intel */}
                <button className="btn-intel-option" onClick={() => spy(intelTarget, { mode: 'full' })} disabled={!intelTarget || me.cp < 500}>
                  <div className="intel-option-info">
                    <span className="intel-option-title">🔍 Full Intel Package</span>
                    <span className="intel-option-desc">View entire enemy arsenal</span>
                  </div>
                  <span className="intel-option-cost">500 CP</span>
                </button>

                {/* Attack Intel */}
                <button className="btn-intel-option" onClick={() => spy(intelTarget, { mode: 'category', category: 'attack' })} disabled={!intelTarget || me.cp < 300}>
                  <div className="intel-option-info">
                    <span className="intel-option-title">⚔ Attack Intel</span>
                    <span className="intel-option-desc">View enemy attack weapons</span>
                  </div>
                  <span className="intel-option-cost">300 CP</span>
                </button>

                {/* Defense Intel */}
                <button className="btn-intel-option" onClick={() => spy(intelTarget, { mode: 'category', category: 'defense' })} disabled={!intelTarget || me.cp < 300}>
                  <div className="intel-option-info">
                    <span className="intel-option-title">🛡 Defense Intel</span>
                    <span className="intel-option-desc">View enemy defense systems</span>
                  </div>
                  <span className="intel-option-cost">300 CP</span>
                </button>

                {/* Specific Intel */}
                <div className="intel-specific-row">
                  <select style={{ flex: 1, padding: '0.5rem', background: 'var(--panel-bg)', color: 'white', border: '1px solid var(--panel-border)', borderRadius: '4px' }} onChange={(e) => setIntelItem(e.target.value)} value={intelItem}>
                    {Object.entries(EQUIPMENT).map(([id, item]) => (<option key={id} value={id}>{item.name}</option>))}
                  </select>
                  <button className="btn-intel-option specific" onClick={() => spy(intelTarget, { mode: 'specific', itemId: intelItem })} disabled={!intelTarget || me.cp < 100}>
                    <div className="intel-option-info">
                      <span className="intel-option-title">🎯 Specific</span>
                    </div>
                    <span className="intel-option-cost">100 CP</span>
                  </button>
                </div>
              </div>

              {/* INTEL REPORTS LOG */}
              {intelLogs && intelLogs.length > 0 && (
                <div className="intel-reports" style={{ marginTop: '20px', borderTop: '1px solid var(--panel-border)', paddingTop: '15px' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '1px' }}>RECENT REPORTS</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' }}>
                    {intelLogs.map((log, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', padding: '10px', borderRadius: '6px', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-blue)', fontWeight: 800, marginBottom: '4px' }}>
                          <span>{log.countryName.toUpperCase()}</span>
                          <span style={{ opacity: 0.5 }}>{new Date(log.time).toLocaleTimeString()}</span>
                        </div>
                        <div style={{ color: 'var(--text-main)', whiteSpace: 'pre-line' }}>
                          {log.mode === 'specific'
                            ? `Has ${log.count}x ${EQUIPMENT[log.itemId]?.name}`
                            : log.mode === 'category'
                              ? `(${log.category.toUpperCase()}):\n` + Object.entries(log.data).map(([id, count]) => `• ${EQUIPMENT[id].name}: ${count}`).join('\n')
                              : `(FULL INTEL):\n` + Object.entries(log.data).map(([id, count]) => `• ${EQUIPMENT[id].name}: ${count}`).join('\n')
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Swipe indicator dots */}
        <div className="swipe-dots">
          {tabNames.map((_, i) => (
            <div key={i} className={`swipe-dot ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)} />
          ))}
        </div>
      </div>
    </div>
  );
};
