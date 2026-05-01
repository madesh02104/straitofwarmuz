import React, { useEffect, useState, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import { CheckCircle, XCircle, Shield, Users } from "lucide-react";
import { CountdownTakeover } from "./CountdownTakeover";

const formatCountdown = (ms) => {
  if (!ms || ms <= 0) return "00:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export const Lobby = () => {
  const { gameState, isReady, toggleReady, sfxVolume, isMuted } =
    useGameStore();
  const players = Object.values(gameState.players);
  const [now, setNow] = useState(() => Date.now());
  const autoStartRemaining =
    gameState.lobbyAutoStartAt && players.length >= 2
      ? Math.max(0, gameState.lobbyAutoStartAt - now)
      : 0;

  const hasCountdownSoundPlayed = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (
      gameState.lobbyState === "starting" &&
      !hasCountdownSoundPlayed.current
    ) {
      hasCountdownSoundPlayed.current = true;
      const countdownAudio = new Audio("/5_sec_countdown.wav");
      countdownAudio.volume = isMuted ? 0 : sfxVolume;
      countdownAudio
        .play()
        .catch((e) => console.warn("Countdown audio play failed", e));
    } else if (gameState.lobbyState === "waiting") {
      hasCountdownSoundPlayed.current = false;
    }
  }, [gameState.lobbyState, isMuted, sfxVolume]);

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
      {gameState.lobbyState === "waiting" && autoStartRemaining > 0 && (
        <div
          className="war-frame"
          style={{
            position: "absolute",
            top: 28,
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(420px, calc(100vw - 40px))",
            padding: "16px 20px",
            borderRadius: 10,
            zIndex: 3,
            textAlign: "center",
          }}
        >
          <div className="war-frame__corners" />
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.56rem",
              letterSpacing: 3,
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            Game Starts In
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-display)",
              fontSize: "1.15rem",
              fontWeight: 900,
              letterSpacing: 4,
              color: "var(--accent-yellow)",
              textTransform: "uppercase",
            }}
          >
            {formatCountdown(autoStartRemaining)}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: "0.5rem",
              color: "var(--text-muted)",
              letterSpacing: 1,
            }}
          >
            Match launches when all players are ready or when this timer ends.
          </div>
        </div>
      )}

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

        <div
          className="lobby-header"
          style={{ marginBottom: 24, textAlign: "center" }}
        >
          <Users
            size={28}
            color="var(--accent-blue)"
            style={{ marginBottom: 6 }}
          />
          <p
            style={{
              margin: "0 0 8px 0",
              fontSize: "0.52rem",
              color: "var(--text-muted)",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Call your friends to start the match sooner
          </p>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "1.25rem",
              letterSpacing: 4,
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
                              fontSize: "0.5rem",
                              color: "var(--accent-yellow)",
                              letterSpacing: 1,
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
                      fontSize: "0.55rem",
                      color: "var(--text-muted)",
                      letterSpacing: 1,
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
              fontSize: "0.55rem",
              color: "var(--text-muted)",
              marginTop: 12,
              textAlign: "center",
              letterSpacing: 1,
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
                letterSpacing: 2,
                fontFamily: "var(--font-display)",
                fontSize: "0.65rem",
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
                  <strong
                    style={{
                      color: item.color,
                      letterSpacing: 1,
                      fontSize: "0.6rem",
                    }}
                  >
                    {item.label}
                  </strong>
                  <br />
                  <span
                    style={{ color: "var(--text-muted)", fontSize: "0.5rem" }}
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
