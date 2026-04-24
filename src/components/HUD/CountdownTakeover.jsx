import React, { useEffect, useRef, useState, useMemo } from "react";
import { X } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

export const CountdownTakeover = ({ matchStartTime }) => {
  const { cancelCountdown } = useGameStore();
  const [timeLeft, setTimeLeft] = useState(() =>
    matchStartTime
      ? Math.max(0, Math.ceil((matchStartTime - Date.now()) / 1000))
      : 5,
  );
  const prevTick = useRef(timeLeft);
  const [shockKey, setShockKey] = useState(0);

  useEffect(() => {
    if (!matchStartTime) return undefined;
    const id = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((matchStartTime - Date.now()) / 1000),
      );
      setTimeLeft((prev) => (prev === remaining ? prev : remaining));
    }, 200);
    return () => clearInterval(id);
  }, [matchStartTime]);

  useEffect(() => {
    if (prevTick.current !== timeLeft) {
      prevTick.current = timeLeft;
      setShockKey((k) => k + 1);
    }
  }, [timeLeft]);

  const totalSeconds = 5;
  const bars = useMemo(() => {
    const active = Math.max(
      0,
      Math.min(totalSeconds, totalSeconds - timeLeft + 1),
    );
    return Array.from({ length: totalSeconds }, (_, i) => ({
      lit: i < active,
    }));
  }, [timeLeft]);

  const statusText =
    timeLeft <= 1
      ? "STARTING"
      : timeLeft <= 2
        ? "GET READY"
        : timeLeft <= 4
          ? "MATCH STARTING"
          : "ALL PLAYERS READY";

  return (
    <div className="countdown-takeover" role="dialog" aria-live="assertive">
      <div className="countdown-takeover__grid" />
      <div className="countdown-takeover__scanlines" />
      <div className="countdown-takeover__edge" />

      <div className="countdown-side tl">
        <div className="countdown-side__row">
          <span className="countdown-side__label">PLAYERS</span>
          <span className="countdown-side__value">READY</span>
        </div>
        <div className="countdown-side__row">
          <span className="countdown-side__label">MAP</span>
          <span className="countdown-side__value">LOADING</span>
        </div>
        <div className="countdown-side__row">
          <span className="countdown-side__label">MODE</span>
          <span className="countdown-side__value">GLOBAL</span>
        </div>
      </div>

      <div className="countdown-side tr">
        <div className="countdown-side__row">
          <span className="countdown-side__label">MATCH</span>
          <span className="countdown-side__value">3 MIN</span>
        </div>
        <div className="countdown-side__row">
          <span className="countdown-side__label">PREP</span>
          <span className="countdown-side__value">2 MIN</span>
        </div>
        <div className="countdown-side__row">
          <span className="countdown-side__label">WAR</span>
          <span className="countdown-side__value">1 MIN</span>
        </div>
      </div>

      <div className="countdown-side br">
        <div className="countdown-side__row">
          <span className="countdown-side__label">STATUS</span>
          <span className="countdown-side__value">GO</span>
        </div>
      </div>

      <div className="countdown-center">
        <div className="countdown-reticle">
          <div className="countdown-reticle__ring countdown-reticle__ring--outer" />
          <div className="countdown-reticle__ring" />
          <div className="countdown-reticle__ring countdown-reticle__ring--inner" />
          <div className="countdown-reticle__cross" />
          <div className="countdown-reticle__corners">
            <div className="countdown-reticle__corner tl" />
            <div className="countdown-reticle__corner tr" />
            <div className="countdown-reticle__corner bl" />
            <div className="countdown-reticle__corner br" />
          </div>

          <div
            key={`num-${timeLeft}`}
            className="countdown-number countdown-number--enter"
          >
            {timeLeft > 0 ? timeLeft : "GO"}
          </div>
          <div key={`shock-${shockKey}`} className="countdown-shockwave" />
        </div>

        <div className="countdown-status">{statusText}</div>
        <div className="countdown-substatus">
          Match begins in {timeLeft > 0 ? timeLeft : 0} second
          {timeLeft !== 1 ? "s" : ""}
        </div>

        <button
          onClick={cancelCountdown}
          style={{
            marginTop: "32px",
            padding: "14px 36px",
            background:
              "linear-gradient(135deg, rgba(248,81,73,0.28), rgba(248,81,73,0.15))",
            border: "2px solid #f85149",
            borderRadius: 6,
            color: "#ffffff",
            fontSize: "1rem",
            letterSpacing: 4,
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            cursor: "pointer",
            textTransform: "uppercase",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow:
              "0 0 24px rgba(248,81,73,0.55), 0 0 48px rgba(248,81,73,0.25)",
            zIndex: 100,
            position: "relative",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background =
              "linear-gradient(135deg, rgba(248,81,73,0.5), rgba(248,81,73,0.3))";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background =
              "linear-gradient(135deg, rgba(248,81,73,0.28), rgba(248,81,73,0.15))";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <X size={20} strokeWidth={3} />
          Cancel Match
        </button>
      </div>

      <div className="countdown-progress">
        {bars.map((b, i) => (
          <div
            key={i}
            className={`countdown-progress__bar${b.lit ? " lit" : ""}`}
          />
        ))}
      </div>
    </div>
  );
};
