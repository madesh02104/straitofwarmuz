import React, { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { Shield, Globe, Users, ChevronRight, Maximize } from "lucide-react";
import gsap from "gsap";

export const Landing = () => {
  const [name, setName] = useState("");
  const joinMatch = useGameStore((state) => state.joinMatch);

  const handleJoin = () => {
    if (!name.trim()) {
      gsap.to(".name-input", { x: 8, repeat: 5, yoyo: true, duration: 0.05 });
      return;
    }
    joinMatch(name);
  };

  return (
    <div
      className="landing-overlay"
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div
        className="landing-content"
        style={{
          position: "relative",
          display: "flex",
          gap: "3rem",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "1100px",
          width: "100%",
          zIndex: 2,
        }}
      >
        <div
          className="instructions-box war-frame"
          style={{
            padding: "2rem",
            borderRadius: 10,
            maxWidth: 350,
            marginTop: "6rem",
          }}
        >
          <div className="war-frame__corners" />
          <h3
            style={{
              color: "var(--accent-blue)",
              marginBottom: "1.2rem",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: "0.95rem",
              fontFamily: "var(--font-display)",
              textTransform: "uppercase",
              letterSpacing: 4,
            }}
          >
            <Shield size={18} /> How to Play
          </h3>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              color: "var(--text-main)",
              fontSize: "0.88rem",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              lineHeight: 1.55,
            }}
          >
            <li>
              <strong style={{ color: "var(--accent-blue)" }}>1. Join</strong>{" "}
              Enter your name and join the game. You'll be assigned a country on
              the world map.
            </li>
            <li>
              <strong style={{ color: "#e3b341" }}>2. Prepare (2 min)</strong>{" "}
              Buy weapons and defenses from the market. Start R&D to unlock
              cheaper gear.
            </li>
            <li>
              <strong style={{ color: "var(--accent-red)" }}>
                3. Attack (1 min)
              </strong>{" "}
              Drag weapons from your inventory onto enemy countries to attack
              them.
            </li>
            <li>
              <strong style={{ color: "#ffb86c" }}>4. Answer Quizzes</strong>{" "}
              Answer strategy questions mid-game to earn bonus currency.
            </li>
            <li>
              <strong style={{ color: "#bd93f9" }}>5. Survive</strong> Last
              country standing wins. Matching defenses automatically counter
              attacks.
            </li>
          </ul>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            maxWidth: 440,
          }}
        >
          <div
            className="landing-header"
            style={{ textAlign: "center", marginBottom: "1.6rem" }}
          >
            <Globe
              size={44}
              style={{
                color: "var(--accent-blue)",
                filter: "drop-shadow(0 0 10px rgba(88,166,255,0.5))",
              }}
            />
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: "3.4rem",
                letterSpacing: 6,
                textTransform: "uppercase",
                margin: "8px 0 6px",
                background:
                  "linear-gradient(180deg, #ffffff 0%, #c9d1d9 60%, #58a6ff 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              COUNTRYSIDE
            </h1>
            <div className="war-divider">
              <span>GLOBAL STRATEGY GAME</span>
            </div>
            <p
              style={{
                color: "var(--text-muted)",
                letterSpacing: 3,
                marginTop: 12,
                fontSize: "0.8rem",
                textTransform: "uppercase",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
              }}
            >
              One world map · Last one standing wins
            </p>
          </div>

          <div
            className="landing-card war-frame"
            style={{ padding: "1.8rem", borderRadius: 10 }}
          >
            <div className="war-frame__corners" />

            <div className="input-group" style={{ marginBottom: "1.2rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.7rem",
                  color: "var(--accent-blue)",
                  marginBottom: 8,
                  letterSpacing: 3,
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                }}
              >
                Your Name
              </label>
              <input
                type="text"
                className="name-input"
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoin();
                }}
                maxLength={15}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(88,166,255,0.35)",
                  borderRadius: 6,
                  color: "white",
                  fontSize: "1rem",
                  outline: "none",
                  boxSizing: "border-box",
                  letterSpacing: 1,
                }}
              />
            </div>

            <div className="mode-selection">
              <button
                className="mode-btn public"
                onClick={handleJoin}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 16,
                  background:
                    "linear-gradient(135deg, rgba(248,81,73,0.15), rgba(248,81,73,0.05))",
                  border: "1px solid rgba(248,81,73,0.45)",
                  borderRadius: 6,
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  fontFamily: "var(--font-display)",
                  letterSpacing: 2,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Users size={22} color="var(--accent-red)" />
                  <div style={{ textAlign: "left" }}>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: "1rem",
                        letterSpacing: 3,
                      }}
                    >
                      JOIN GAME
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        letterSpacing: 2,
                        marginTop: 2,
                      }}
                    >
                      Public match
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="arrow" />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: "1.2rem",
                color: "var(--text-muted)",
                fontSize: "0.75rem",
                letterSpacing: 1,
              }}
            >
              <Maximize size={14} />
              <span>
                Press <strong style={{ color: "var(--text-main)" }}>F11</strong>{" "}
                for fullscreen.
              </span>
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
