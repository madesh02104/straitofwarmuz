import React, { useState, useLayoutEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { Shield, Globe, Users, ChevronRight, Maximize, X } from "lucide-react";
import gsap from "gsap";

import missileImg from "../../assets/missile.webp";
import tankImg from "../../assets/tank.webp";
import jetImg from "../../assets/jet.webp";

const blockyExplosion = `polygon(
  40% 10%, 40% 0%, 60% 0%, 60% 10%,
  70% 10%, 70% 20%, 90% 20%, 90% 30%, 80% 30%,
  80% 40%, 100% 40%, 100% 60%, 80% 60%,
  80% 70%, 90% 70%, 90% 80%, 70% 80%,
  70% 90%, 60% 90%, 60% 100%, 40% 100%, 40% 90%,
  30% 90%, 30% 80%, 10% 80%, 10% 70%, 20% 70%,
  20% 60%, 0% 60%, 0% 40%, 20% 40%,
  20% 30%, 10% 30%, 10% 20%, 30% 20%, 30% 10%
)`;

export const Landing = () => {
  const [name, setName] = useState("");
  const joinMatch = useGameStore((state) => state.joinMatch);
  const isJoining = useGameStore((state) => state.isJoining);
  const isSocketConnected = useGameStore((state) => state.isSocketConnected);
  const joinBlockedMessage = useGameStore((state) => state.joinBlockedMessage);
  const dismissJoinBlockedMessage = useGameStore(
    (state) => state.dismissJoinBlockedMessage,
  );

  useLayoutEffect(() => {
    gsap.set(".anim-jet", { left: "100%", x: 220, right: "auto" });
    const tl = gsap.timeline({ repeat: -1 });

    // Step 1: Initial state reset
    tl.set(".anim-missile", { opacity: 1, rotation: 0, scale: 1, left: "90%" })
      .set(".anim-tank", {
        left: "-15%",
        scaleX: -1,
        scaleY: 1,
        opacity: 1,
        y: 0,
        filter: "none",
      })
      .set(".anim-tank-bullet", { opacity: 0 })
      .set(".anim-missile-smoke", {
        left: "88%",
        bottom: "1%",
        opacity: 0,
        scale: 0.5,
      })
      .set(".anim-jet", {
        left: "100%",
        right: "auto",
        x: 220,
        opacity: 1,
        scaleX: 1,
      })
      .set(".anim-jet-b0, .anim-jet-b1, .anim-jet-b2, .anim-jet-b3", {
        opacity: 0,
        left: "50%",
        top: "11%",
      })
      .set(".anim-tank-blast", { opacity: 0, scale: 0.3 });

    tl.to(".anim-tank", {
      left: "20%",
      duration: (16 * 35) / 45,
      ease: "power1.inOut",
    })
      .to(
        ".anim-missile",
        { left: "75%", duration: (16 * 10) / 45, ease: "power1.inOut" },
        ">",
      )
      .to(
        ".anim-tank",
        { left: "30%", duration: (16 * 10) / 45, ease: "power1.inOut" },
        "<",
      )
      .to(".anim-tank", { left: "32%", duration: 1.5, ease: "power1.inOut" });

    tl.set(".anim-tank-bullet", { left: "38%", bottom: "24px", opacity: 1 })
      .to(
        ".anim-tank-bullet",
        { left: "88%", duration: 0.8, ease: "none" },
        "tankFire",
      )
      .to(
        ".anim-tank-bullet",
        {
          keyframes: [
            { bottom: "24%", duration: 0.4, ease: "power1.out" },
            { bottom: "1%", duration: 0.4, ease: "power1.in" },
          ],
        },
        "tankFire",
      );

    tl.set(".anim-tank-bullet", { opacity: 0 })
      .set(".anim-missile", { opacity: 0 })
      .set(".anim-missile-smoke", {
        left: "88%",
        bottom: "1%",
        opacity: 1,
        scale: 0.1,
      })
      .to(".anim-missile-smoke", {
        scale: 2.5,
        opacity: 0.8,
        duration: 0.4,
        ease: "power2.out",
      })
      .to(".anim-missile-smoke", {
        scale: 3.5,
        opacity: 0,
        duration: 1.5,
        ease: "power1.in",
      });

    // Step 3: Jet flies from right to left
    tl.to(
      ".anim-jet",
      { left: "50%", x: 0, duration: 1.5, ease: "none" },
      "jetFly",
    );

    tl.set(".anim-jet-b0, .anim-jet-b1, .anim-jet-b2, .anim-jet-b3", {
      left: "50%",
      top: "11%",
      opacity: 1,
    })
      .to(
        ".anim-jet-b0",
        { left: "39%", top: "90%", duration: 0.3, ease: "none" },
        "jetFire",
      )
      .to(
        ".anim-jet-b1",
        { left: "40.5%", top: "91%", duration: 0.3, ease: "none" },
        "jetFire+=0.05",
      )
      .to(
        ".anim-jet-b2",
        { left: "42%", top: "89%", duration: 0.3, ease: "none" },
        "jetFire+=0.1",
      )
      .to(
        ".anim-jet-b3",
        { left: "40.2%", top: "90.5%", duration: 0.3, ease: "none" },
        "jetFire+=0.15",
      )
      .to(
        ".anim-jet",
        { left: "-15%", x: 0, duration: 1.5, ease: "none" },
        "jetFire",
      )
      .addLabel("tankStruck", "jetFire+=0.45")
      .set(
        ".anim-jet-b0, .anim-jet-b1, .anim-jet-b2, .anim-jet-b3",
        { opacity: 0 },
        "tankStruck",
      )
      .set(
        ".anim-tank-blast",
        { left: "40%", bottom: "2%", opacity: 1, scale: 0.4 },
        "tankStruck",
      )
      .to(
        ".anim-tank",
        {
          opacity: 0,
          filter: "blur(8px)",
          scaleX: -0.9,
          scaleY: 0.9,
          duration: 0.9,
        },
        "tankStruck",
      )
      .to(
        ".anim-tank-blast",
        { scale: 3.2, opacity: 0, duration: 2 },
        "tankStruck",
      );

    // Add small delay before repeating
    tl.to({}, { duration: 1 });

    return () => tl.kill();
  }, []);

  const handleJoin = () => {
    if (isJoining) return;
    if (!name.trim()) {
      gsap.to(".name-input", { x: 8, repeat: 5, yoyo: true, duration: 0.05 });
      return;
    }
    joinMatch(name);
  };

  return (
    <div
      className="landing-overlay"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#040411",
      }}
    >
      {/* Background War Animations */}
      <div
        className="bg-animations"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 6,
          pointerEvents: "none",
        }}
      >
        <img
          src={missileImg}
          className="anim-missile"
          alt=""
          style={{
            position: "absolute",
            left: "85%",
            bottom: "1%",
            width: 500,
          }}
        />
        <img
          src={tankImg}
          className="anim-tank"
          alt=""
          style={{
            position: "absolute",
            left: "-15%",
            bottom: "1%",
            width: 270,
          }}
        />
        <div
          className="anim-tank-bullet floating-element"
          style={{
            position: "absolute",
            width: 40,
            height: 10,
            left: 0,
            bottom: "0%",
            opacity: 0,
            pointerEvents: "none",
          }}
        >
          {/* Solid color blocky bullet */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#FFFF00",
              border: "2px solid #FF0000",
            }}
          />
        </div>
        <div
          className="anim-missile-smoke"
          style={{
            position: "absolute",
            left: "88%",
            bottom: "1%",
            width: 100,
            height: 100,
            opacity: 0,
            transform: "translate(-50%, -10%)",
            transformOrigin: "50% 50%",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#8B0000",
              clipPath: blockyExplosion,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "20%",
              background: "#FF0000",
              clipPath: blockyExplosion,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "40%",
              background: "#FF9900",
              clipPath: blockyExplosion,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "60%",
              background: "#555555",
              clipPath: blockyExplosion,
            }}
          />
        </div>

        <img
          src={jetImg}
          className="anim-jet"
          alt=""
          style={{
            position: "absolute",
            left: "100%",
            top: "6%",
            width: 200,
          }}
        />
        {["b0", "b1", "b2", "b3"].map((id) => (
          <div
            key={id}
            className={`anim-jet-${id}`}
            style={{
              position: "absolute",
              width: 8,
              height: 32,
              left: 0,
              top: 0,
              opacity: 0,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#00FFFF",
                border: "2px solid #FFFFFF",
              }}
            />
          </div>
        ))}
        <div
          className="anim-tank-blast"
          style={{
            position: "absolute",
            left: "40%",
            bottom: "2%",
            width: 120,
            height: 120,
            opacity: 0,
            transform: "translate(-50%, -10%)",
            transformOrigin: "50% 50%",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#D21404",
              clipPath: blockyExplosion,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "15%",
              background: "#FF9900",
              clipPath: blockyExplosion,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "30%",
              background: "#FFFF00",
              clipPath: blockyExplosion,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "45%",
              background: "#FFFFFF",
              clipPath: blockyExplosion,
            }}
          />
        </div>
      </div>

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
          zIndex: 1,
        }}
      >
        <div
          className="instructions-box war-frame floating-element"
          style={{
            padding: "1.5rem",
            borderRadius: 10,
            maxWidth: 380,
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
              fontSize: "0.8rem",
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
              fontSize: "0.6rem",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              lineHeight: 1.8,
            }}
          >
            <li>
              <strong style={{ color: "#00FFFF" }}>1. Join</strong> Enter your
              name and join the game. You'll be assigned a country on the world
              map.
            </li>
            <li>
              <strong style={{ color: "#FFFF00" }}>2. Prepare (2 min)</strong>{" "}
              Buy weapons and defenses from the market. Start R&D to unlock
              cheaper gear.
            </li>
            <li>
              <strong style={{ color: "#FF0000" }}>3. Attack (1 min)</strong>{" "}
              Drag weapons from your inventory onto enemy countries to attack
              them.
            </li>
            <li>
              <strong style={{ color: "#FF9900" }}>4. Answer Quizzes</strong>{" "}
              Answer strategy questions mid-game to earn bonus currency.
            </li>
            <li>
              <strong style={{ color: "#CC00FF" }}>5. Survive</strong> Last
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
              className="globe-icon floating-element"
              style={{
                color: "#00FFFF",
                filter: "drop-shadow(4px 4px 0px #000)",
              }}
            />
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: "2.4rem",
                letterSpacing: 6,
                textTransform: "uppercase",
                margin: "8px 0 16px",
                color: "white",
                textShadow: "4px 4px 0px #000",
              }}
            >
              STRAIT OF WARMUZ
            </h1>
            <div className="war-divider">
              <span style={{ fontSize: "0.6rem", letterSpacing: 2 }}>
                GLOBAL STRATEGY GAME
              </span>
            </div>
            <p
              style={{
                color: "var(--text-muted)",
                letterSpacing: 1,
                marginTop: 16,
                fontSize: "0.45rem",
                textTransform: "uppercase",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              One world map · Last one standing wins
            </p>
          </div>

          <div
            className="landing-card war-frame floating-element"
            style={{ padding: "1.8rem", borderRadius: 10 }}
          >
            <div className="war-frame__corners" />

            <div className="input-group" style={{ marginBottom: "1.2rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.55rem",
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
                disabled={isJoining}
                style={{
                  width: "100%",
                  padding: "16px 16px",
                  background: "#000",
                  border: "4px solid #00FFFF",
                  color: "white",
                  fontSize: "0.8rem",
                  outline: "none",
                  boxSizing: "border-box",
                  letterSpacing: 1,
                  caretColor: "#00FFFF",
                }}
              />
            </div>

            <div className="mode-selection">
              <button
                className="mode-btn public"
                onClick={handleJoin}
                disabled={isJoining}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 16,
                  color: "white",
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                  letterSpacing: 2,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Users size={22} color="#FFFFFF" />
                  <div style={{ textAlign: "left" }}>
                    <div
                      className="join-btn"
                      style={{
                        fontWeight: 900,
                        fontSize: "0.8rem",
                        letterSpacing: 3,
                      }}
                    >
                      JOIN GAME
                    </div>
                    {isJoining ? (
                      <div className="join-status-text">
                        <span className="themed-spinner themed-spinner--tiny" />
                        wait while a backend spins up, it may take a minute at max
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: "0.5rem",
                          color: "var(--text-muted)",
                          letterSpacing: 2,
                          marginTop: 6,
                        }}
                      >
                        Public match
                      </div>
                    )}
                  </div>
                </div>
                {isJoining ? (
                  <span className="themed-spinner" aria-hidden="true" />
                ) : (
                  <ChevronRight size={20} className="arrow" />
                )}
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: "1.6rem",
                color: "var(--text-muted)",
                fontSize: "0.55rem",
                letterSpacing: 1,
              }}
            >
              <Maximize size={14} />
              <span>
                Press <strong style={{ color: "var(--text-main)" }}>F11</strong>{" "}
                for fullscreen.
              </span>
            </div>

            <div
              className="war-frame"
              style={{
                marginTop: "1rem",
                padding: "0.8rem",
                borderRadius: 8,
              }}
            >
              <div className="war-frame__corners" />
              <div
                style={{
                  color: "var(--accent-blue)",
                  fontFamily: "var(--font-display)",
                  fontSize: "0.54rem",
                  fontWeight: 900,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Keyboard Shortcuts
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px 12px",
                  fontSize: "0.5rem",
                  color: "var(--text-main)",
                  letterSpacing: 1,
                }}
              >
                <span><strong style={{ color: "var(--accent-yellow)" }}>Enter</strong> Join game</span>
                <span><strong style={{ color: "var(--accent-yellow)" }}>Space</strong> Ready toggle</span>
                <span><strong style={{ color: "var(--accent-yellow)" }}>M</strong> Mute or unmute</span>
                <span><strong style={{ color: "var(--accent-yellow)" }}>Esc</strong> Close popups</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="war-status-strip">
        <div className="war-status-strip__cell">
          <span className={`war-led ${isSocketConnected ? "" : "amber"}`} />
          {isSocketConnected ? "SERVER ONLINE" : "SERVER CONNECTING"}
        </div>
      </div>

      {joinBlockedMessage && (
        <div className="landing-modal-backdrop">
          <div
            className="landing-modal war-frame"
            style={{
              position: "relative",
              width: "min(520px, calc(100vw - 32px))",
              padding: "1.8rem",
              borderRadius: 10,
              zIndex: 20,
            }}
          >
            <div className="war-frame__corners" />
            <button
              type="button"
              onClick={dismissJoinBlockedMessage}
              aria-label="Close join status popup"
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 36,
                height: 36,
                display: "grid",
                placeItems: "center",
                border: "2px solid var(--accent-blue)",
                background: "#050a10",
                color: "var(--accent-blue)",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                paddingRight: "2.4rem",
              }}
            >
              <div
                style={{
                  color: "var(--accent-red)",
                  fontFamily: "var(--font-display)",
                  fontSize: "0.9rem",
                  fontWeight: 900,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                Room Full
              </div>
              <div className="war-divider">
                <span style={{ fontSize: "0.58rem", letterSpacing: 2 }}>
                  Command Center Notice
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-main)",
                  fontSize: "0.66rem",
                  lineHeight: 1.8,
                  letterSpacing: 0.5,
                }}
              >
                {joinBlockedMessage}{" "}
                <span
                  style={{ color: "var(--accent-yellow)", fontWeight: 900 }}
                >
                  (Max wait: 5 minutes)
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
