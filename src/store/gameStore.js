import { create } from "zustand";
import { io } from "socket.io-client";

const socket = io(
  import.meta.env.VITE_API_URL || "https://countryside-ye4p.onrender.com",
);

export const useGameStore = create((set, get) => ({
  socket,
  gameState: {
    players: {},
    lobbyState: "waiting",
    duration: 120000,
    timeRemaining: 120000,
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

  spy: (targetId, itemId) => {
    socket.emit("spy", { targetId, itemId });
  },

  attack: (targetId, itemId) => {
    socket.emit("attack", { targetId, itemId });
  },
}));

// Global Socket Listeners
socket.on("gameState", (state) => {
  useGameStore.setState({ gameState: state });
});

socket.on("assignedCountry", (country) => {
  useGameStore.setState({ myCountry: country });
});

socket.on("quiz", (quiz) => {
  useGameStore.setState({ activeQuiz: quiz });
});

socket.on("notification", (data) => {
  useGameStore.setState({ notification: data.message });
  setTimeout(() => useGameStore.setState({ notification: null }), 3000);
});

socket.on("worldEvent", (data) => {
  useGameStore.setState({ worldEvent: data });
  setTimeout(() => useGameStore.setState({ worldEvent: null }), 5000);
});

socket.on("spyResult", (data) => {
  useGameStore.setState({ spyResult: data });
  setTimeout(() => useGameStore.setState({ spyResult: null }), 5000);
});

socket.on("attackEvent", (data) => {
  // Bubbled to WorldMap via custom window event for convenience
  window.dispatchEvent(new CustomEvent("attackEvent", { detail: data }));
});
