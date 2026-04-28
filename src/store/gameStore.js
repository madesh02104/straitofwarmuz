import { create } from "zustand";
import { io } from "socket.io-client";

const STORAGE_KEYS = {
  muted: "countryside_muted",
  bgm: "countryside_bgm_volume",
  sfx: "countryside_sfx_volume",
};

const readBool = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "true";
  } catch {
    return fallback;
  }
};

const readNum = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
};

const socket = io(
  import.meta.env.VITE_API_URL || "https://countryside-lhf0.onrender.com",
);

export const useGameStore = create((set, get) => ({
  socket,
  gameState: {
    players: {},
    lobbyState: "waiting",
    lobbyAutoStartAt: null,
    postGameKickAt: null,
    duration: 180000,
    timeRemaining: 180000,
    phase: 1,
    marketStock: {},
  },
  myCountry: null,
  activeQuiz: null,
  notification: null,
  worldEvent: null,
  spyResult: null,
  joinBlockedMessage: null,
  isReady: false,
  hasJoined: false,
  bgmVolume: readNum(STORAGE_KEYS.bgm, 0.4),
  sfxVolume: readNum(STORAGE_KEYS.sfx, 0.5),
  isMuted: readBool(STORAGE_KEYS.muted, false),

  // Actions
  joinMatch: (name) => {
    socket.emit("joinMatch", { name });
  },

  dismissJoinBlockedMessage: () => set({ joinBlockedMessage: null }),

  returnToHome: () =>
    set({
      gameState: {
        players: {},
        lobbyState: "waiting",
        lobbyAutoStartAt: null,
        postGameKickAt: null,
        duration: 180000,
        timeRemaining: 180000,
        phase: 1,
        marketStock: {},
      },
      myCountry: null,
      activeQuiz: null,
      notification: null,
      worldEvent: null,
      spyResult: null,
      isReady: false,
      hasJoined: false,
      joinBlockedMessage: null,
    }),

  toggleReady: () => {
    const { isReady } = get();
    socket.emit("toggleReady");
    set({ isReady: !isReady });
  },

  cancelCountdown: () => {
    socket.emit("cancelCountdown");
    set({ isReady: false });
  },

  submitQuiz: (correct, timeTaken) => {
    socket.emit("submitQuiz", { correct, timeTaken });
    set({ activeQuiz: null });
  },

  buyItem: (itemId) => {
    socket.emit("buyItem", { itemId });
  },

  researchItem: (itemId) => {
    socket.emit("researchItem", { itemId });
  },

  spy: (targetId, options) => {
    socket.emit("spy", { targetId, ...options });
  },

  attack: (targetId, itemId) => {
    socket.emit("attack", { targetId, itemId });
  },

  activateDeflect: () => {
    socket.emit("activateDeflect");
  },

  setBgmVolume: (vol) => {
    writeStorage(STORAGE_KEYS.bgm, vol);
    set({ bgmVolume: vol });
  },
  setSfxVolume: (vol) => {
    writeStorage(STORAGE_KEYS.sfx, vol);
    set({ sfxVolume: vol });
  },
  toggleMute: () =>
    set((state) => {
      const next = !state.isMuted;
      writeStorage(STORAGE_KEYS.muted, next);
      return { isMuted: next };
    }),
}));

export const playSound = (file) => {
  const { sfxVolume, isMuted } = useGameStore.getState();
  if (isMuted) return;
  const audio = new Audio(`/${file}`);
  audio.volume = sfxVolume;
  audio.play().catch((e) => console.warn("Audio disabled by browser:", e));
};

// Global Socket Listeners
socket.on("gameState", (state) => {
  const prev = useGameStore.getState().gameState;
  const myCountry = useGameStore.getState().myCountry;

  if (prev && prev.lobbyState !== "ended" && state.lobbyState === "ended") {
    // True winner is Rank 1
    const isWinner =
      state.rankings &&
      state.rankings[0] &&
      state.rankings[0].country === myCountry;
    if (isWinner) {
      playSound("win.wav");
    } else {
      playSound("lose.wav");
    }
  }
  if (prev && prev.phase === 1 && state.phase === 2) {
    playSound("war_begin.wav");
  }

  const mySocketId = socket.id;
  const myServerPlayer =
    state.players && mySocketId ? state.players[mySocketId] : null;
  const nextIsReady = myServerPlayer
    ? !!myServerPlayer.isReady
    : useGameStore.getState().isReady;
  useGameStore.setState({ gameState: state, isReady: nextIsReady });
});

socket.on("assignedCountry", (country) => {
  useGameStore.setState({
    myCountry: country,
    hasJoined: true,
    joinBlockedMessage: null,
  });
});

socket.on("joinDenied", (data) => {
  useGameStore.setState({
    hasJoined: false,
    myCountry: null,
    isReady: false,
    joinBlockedMessage:
      data?.message || "Room unavailable. Please try again later.",
  });
});

socket.on("quiz", (quiz) => {
  useGameStore.setState({ activeQuiz: quiz });
});

socket.on("notification", (data) => {
  if (data.message && data.message.startsWith("R&D Complete:")) {
    playSound("rd_complete.wav");
  } else if (data.type === "error") {
    playSound("lose.wav");
  } else {
    playSound("blip.mp3");
  }
  useGameStore.setState({ notification: data });
  setTimeout(() => useGameStore.setState({ notification: null }), 3000);
});

socket.on("worldEvent", (data) => {
  playSound("blip.mp3");
  useGameStore.setState({ worldEvent: data });
  setTimeout(() => useGameStore.setState({ worldEvent: null }), 5000);
});

socket.on("spyResult", (data) => {
  const state = useGameStore.getState();
  const currentLogs = state.intelLogs || [];
  const countryName =
    state.gameState?.players[data.target]?.country || "Unknown";
  const entry = { ...data, countryName, time: Date.now() };

  useGameStore.setState({
    spyResult: data,
    intelLogs: [entry, ...currentLogs].slice(0, 20), // Keep last 20 reports
  });
  setTimeout(() => useGameStore.setState({ spyResult: null }), 5000);
});

socket.on("attackEvent", (data) => {
  if (data.deflected) {
    playSound("glitch.wav");
    if (!data.firewallBlocked) {
      playSound("bomb.wav");
    } else {
      playSound("glass_break.wav"); // Firewall blocked it
    }
  } else if (data.success) {
    playSound("bomb.wav");
  } else {
    playSound("glass_break.wav");
  }
  // Bubbled to WorldMap via custom window event for convenience
  window.dispatchEvent(new CustomEvent("attackEvent", { detail: data }));

  const st = useGameStore.getState();
  const isAttackPhase = st.gameState?.lobbyState === "active" && st.gameState?.phase === 2;
  if (isAttackPhase) {
    const root = document.getElementById("root");
    if (root) {
      root.classList.remove("shake-active");
      requestAnimationFrame(() => {
        root.classList.add("shake-active");
        window.setTimeout(() => root.classList.remove("shake-active"), 650);
      });
    }
  }
});

socket.on("returnToHome", () => {
  useGameStore.getState().returnToHome();
});
