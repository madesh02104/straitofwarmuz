import React, { useEffect, useState, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import {
  CheckCircle,
  XCircle,
  Shield,
  Volume2,
  VolumeX,
  Users,
} from "lucide-react";
import { CountdownTakeover } from "./CountdownTakeover";

export const Lobby = () => {
  const { gameState, isReady, toggleReady } = useGameStore();
  const players = Object.values(gameState.players);
  const readyCount = players.filter((p) => p.isReady).length;

  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const hasCountdownSoundPlayed = useRef(false);

  useEffect(() => {
    const audio = new Audio("/lobbby.wav");
    audio.loop = true;
    audio.volume = isMuted ? 0 : 0.3;
    audio.play().catch((e) => console.warn("Audio disabled by browser:", e));
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [isMuted]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : 0.3;
  }, [isMuted]);

  useEffect(() => {
    if (
      gameState.lobbyState === "starting" &&
      !hasCountdownSoundPlayed.current
    ) {
      hasCountdownSoundPlayed.current = true;
      const countdownAudio = new Audio("/5_sec_countdown.wav");
      countdownAudio.volume = isMuted ? 0 : 0.6;
      countdownAudio
        .play()
        .catch((e) => console.warn("Countdown audio play failed", e));
    } else if (gameState.lobbyState === "waiting") {
      hasCountdownSoundPlayed.current = false;
    }
  }, [gameState.lobbyState, isMuted]);

  if (gameState.lobbyState === "starting") {
    return <CountdownTakeover matchStartTime={gameState.matchStartTime} />;
  }

  return (
    <div
      className="lobby-overlay"
      style={{
        background:
          "radial-gradient(circle at center, #0d1117 0%, #050a10 100%)",
        pointerEvents: "auto",
      }}
    >
      <div
        className="lobby-content war-frame"
        style={{
          position: "relative",
          maxWidth: 760,
          width: "100%",
          padding: "34px 40px",
          borderRadius: 10,
          background:
            "linear-gradient(135deg, rgba(13,17,23,0.95) 0%, rgba(8,12,18,0.97) 100%)",
          zIndex: 2,
        }}
      >
        <div className="war-frame__corners" />

        <button
          className="mute-btn"
          onClick={() => setIsMuted((prev) => !prev)}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        <div
          className="lobby-header"
          style={{ marginBottom: 24, textAlign: "center" }}
        >
          <Users
            size={28}
            color="var(--accent-blue)"
            style={{ marginBottom: 6 }}
          />
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "1.8rem",
              letterSpacing: 8,
              margin: "4px 0",
              textTransform: "uppercase",
              color: "var(--text-main)",
            }}
          >
            WAITING ROOM
          </h2>
          <div className="war-divider">
            <span>Players · Ready Check</span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => {
            const p = players[i];
            const isMe = p && p.socketId === useGameStore.getState().socket.id;
            return (
              <div
                key={i}
                className={`war-slot ${p ? "occupied" : "empty"} ${p?.isReady ? "ready" : ""}`}
              >
                {p ? (
                  <>
                    <div className="war-slot__status-dot" />
                    <div className="war-slot__avatar">
                      <Shield
                        size={22}
                        color={
                          p.isReady
                            ? "var(--accent-green)"
                            : "var(--accent-blue)"
                        }
                      />
                    </div>
                    <div className="war-slot__info">
                      <span className="war-slot__name">
                        {p.name}
                        {isMe && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: "0.65rem",
                              color: "var(--accent-yellow)",
                              letterSpacing: 2,
                            }}
                          >
                            (YOU)
                          </span>
                        )}
                      </span>
                      <span className="war-slot__country">
                        {isMe ? p.country : "---"}
                      </span>
                    </div>
                    <div className="war-slot__rank">
                      {p.isReady ? "READY" : "NOT READY"}
                    </div>
                    {p.isReady ? (
                      <CheckCircle size={18} color="var(--accent-green)" />
                    ) : (
                      <XCircle size={18} color="var(--accent-red)" />
                    )}
                  </>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontFamily: "var(--font-display)",
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      letterSpacing: 3,
                      fontWeight: 800,
                    }}
                  >
                    Waiting for player...
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div>
          <label
            className={`war-toggle${isReady ? " armed" : ""}`}
            style={{ width: "100%" }}
          >
            <input
              type="checkbox"
              checked={isReady}
              onChange={toggleReady}
              style={{ display: "none" }}
            />
            <span className="war-toggle__indicator" />
            {isReady ? "✓ You are Ready" : "Click to Mark as Ready"}
          </label>
          <p
            style={{
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              marginTop: 12,
              textAlign: "center",
              letterSpacing: 2,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
            }}
          >
            Match starts automatically when all players are ready
          </p>

          <div
            style={{
              marginTop: 18,
              padding: "14px 16px",
              background: "rgba(5,10,16,0.75)",
              borderRadius: 6,
              border: "1px solid rgba(88,166,255,0.3)",
            }}
          >
            <h4
              style={{
                color: "var(--accent-blue)",
                marginBottom: 10,
                textAlign: "center",
                letterSpacing: 4,
                fontFamily: "var(--font-display)",
                fontSize: "0.8rem",
                fontWeight: 900,
              }}
            >
              Quick Guide
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
              }}
            >
              {[
                {
                  label: "MARKET",
                  color: "var(--accent-red)",
                  border: "rgba(248,81,73,0.25)",
                  desc: "Buy weapons during the Prep phase.",
                },
                {
                  label: "R&D",
                  color: "var(--accent-yellow)",
                  border: "rgba(227,179,65,0.3)",
                  desc: "Research cheaper gear. 40% risk of failure.",
                },
                {
                  label: "ATTACK",
                  color: "var(--accent-green)",
                  border: "rgba(63,185,80,0.3)",
                  desc: "Drag weapons onto enemy countries to attack.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    padding: 10,
                    borderRadius: 4,
                    border: `1px solid ${item.border}`,
                  }}
                >
                  <strong style={{ color: item.color, letterSpacing: 1 }}>
                    {item.label}
                  </strong>
                  <br />
                  <span
                    style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}
                  >
                    {item.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="war-status-strip">
        <div className="war-status-strip__cell">
          <span className="war-led" /> SERVER ONLINE
        </div>
      </div>
    </div>
  );
};
