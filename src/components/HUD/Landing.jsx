import React, { useState, useLayoutEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { Shield, Globe, Users, ChevronRight, Maximize } from "lucide-react";
import gsap from "gsap";

import missileImg from "../../assets/missile.webp";
import tankImg from "../../assets/tank.webp";
import jetImg from "../../assets/jet.webp";

export const Landing = () => {
  const [name, setName] = useState("");
  const joinMatch = useGameStore((state) => state.joinMatch);

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
      .set(".anim-missile-smoke", { left: "88%", bottom: "1%", opacity: 0, scale: 0.5 })
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
        top: "15%",
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
      .set(".anim-missile-smoke", { left: "88%", bottom: "1%", opacity: 1, scale: 0.1 })
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
      top: "15%",
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
          className="anim-tank-bullet"
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
          {/* Main streak body matching streakMeshRef colors FFDD66 */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to right, transparent, #ffdd66 80%, #ffffff 100%)",
              borderRadius: "10px",
            }}
          />
          {/* Main glow matching streakGlowRef */}
          <div
            style={{
              position: "absolute",
              inset: "-4px",
              background: "#ffdd66",
              opacity: 0.5,
              filter: "blur(6px)",
              borderRadius: "10px",
            }}
          />
          {/* Bright head matching streakHeadRef */}
          <div
            style={{
              position: "absolute",
              width: 14,
              height: 14,
              background: "#ffffff",
              borderRadius: "50%",
              right: -4,
              top: -2,
              boxShadow: "0 0 10px #ffffff, 0 0 20px #ffdd66",
            }}
          />
        </div>
        <div
          className="anim-missile-smoke"
          style={{
            position: "absolute",
            left: "88%",
            bottom: "1%",
            width: 375,
            height: 375,
            borderRadius: "50%",
            /* Nuke style fire/smoke layers based on NukeAnimation */
            background:
              "radial-gradient(circle, #ffffff 0%, #ffee88 15%, #ff6600 30%, #cc1500 50%, rgba(44,40,32,0.9) 70%, rgba(26,22,20,0) 100%)",
            filter: "blur(12px)",
            opacity: 0,
            transform: "translate(-50%, 40%)",
            pointerEvents: "none",
          }}
        />

        <img
          src={jetImg}
          className="anim-jet"
          alt=""
          style={{
            position: "absolute",
            left: "100%",
            top: "15%",
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
                background:
                  "linear-gradient(to bottom, transparent, #ffeedd 80%, #ffffff 100%)",
                borderRadius: "8px",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "-3px",
                background: "#ffeedd",
                opacity: 0.5,
                filter: "blur(5px)",
                borderRadius: "8px",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: 12,
                height: 12,
                background: "#ffffff",
                borderRadius: "50%",
                left: -2,
                bottom: -3,
                boxShadow: "0 0 8px #ffffff, 0 0 16px #ffeedd",
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
            width: 360,
            height: 360,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, #ffffff 0%, #ff5522 28%, rgba(60,40,20,0.75) 55%, rgba(0,0,0,0) 85%)",
            filter: "blur(14px)",
            opacity: 0,
            transform: "translate(-50%, 45%)",
            transformOrigin: "50% 60%",
            pointerEvents: "none",
          }}
        />
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
