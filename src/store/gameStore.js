import { create } from "zustand";
import { io } from "socket.io-client";

const socket = io(
  import.meta.env.VITE_API_URL || "https://countryside-lhf0.onrender.com",
);

export const useGameStore = create((set, get) => ({
  socket,
  gameState: {
    players: {},
    lobbyState: "waiting",
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

  // Actions
  joinMatch: (name) => {
    socket.emit("joinMatch", { name });
    set({ hasJoined: true });
  },

  toggleReady: () => {
    const { isReady } = get();
    socket.emit("toggleReady");
    set({ isReady: !isReady });
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
}));

export const playSound = (file) => {
  const audio = new Audio(`/${file}`);
  audio.volume = 0.5;
  audio.play().catch(e => console.warn('Audio disabled by browser:', e));
};

// Global Socket Listeners
socket.on("gameState", (state) => {
  const prev = useGameStore.getState().gameState;
  const myCountry = useGameStore.getState().myCountry;
  
  if (prev && prev.lobbyState !== "ended" && state.lobbyState === "ended") {
    // True winner is Rank 1
    const isWinner = state.rankings && state.rankings[0] && state.rankings[0].country === myCountry;
    if (isWinner) {
      playSound('win.wav');
    } else {
      playSound('lose.wav');
    }
  }
  if (prev && prev.phase === 1 && state.phase === 2) {
    playSound('war_begin.wav');
  }

  useGameStore.setState({ gameState: state });
});

socket.on("assignedCountry", (country) => {
  useGameStore.setState({ myCountry: country });
});

socket.on("quiz", (quiz) => {
  useGameStore.setState({ activeQuiz: quiz });
});

socket.on("notification", (data) => {
  if (data.message && data.message.startsWith("R&D Complete:")) {
    playSound('rd_complete.wav');
  } else if (data.type === 'error') {
    playSound('lose.wav');
  } else {
    playSound('blip.mp3');
  }
  useGameStore.setState({ notification: data });
  setTimeout(() => useGameStore.setState({ notification: null }), 3000);
});

socket.on("worldEvent", (data) => {
  playSound('blip.mp3');
  useGameStore.setState({ worldEvent: data });
  setTimeout(() => useGameStore.setState({ worldEvent: null }), 5000);
});

socket.on("spyResult", (data) => {
  useGameStore.setState({ spyResult: data });
  setTimeout(() => useGameStore.setState({ spyResult: null }), 5000);
});

socket.on("attackEvent", (data) => {
  if (data.deflected) {
    playSound('glitch.wav');
    if (!data.firewallBlocked) {
      playSound('bomb.wav');
    } else {
      playSound('glass_break.wav'); // Firewall blocked it
    }
  } else if (data.success) {
    playSound('bomb.wav');
  } else {
    playSound('glass_break.wav');
  }
  // Bubbled to WorldMap via custom window event for convenience
  window.dispatchEvent(new CustomEvent("attackEvent", { detail: data }));
});
