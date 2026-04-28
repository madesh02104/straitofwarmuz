import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

const TRACKS = {
  LANDING: '/phase_musics/Frontier_Command_Landing_Main.mp3',
  LOBBY: '/phase_musics/Quarter_Slot_Lobby.mp3',
  PHASE1: '/phase_musics/Ticker_s_Gambit_war_prep.mp3',
  PHASE2: '/phase_musics/Projectile_Barrage_War_Phase.mp3',
  VICTORY: '/phase_musics/Bonus_Stage_Triumph_Victory.mp3'
};

export const BGMPlayer = () => {
  const hasJoined = useGameStore((s) => s.hasJoined);
  const lobbyState = useGameStore((s) => s.gameState?.lobbyState);
  const phase = useGameStore((s) => s.gameState?.phase);
  const bgmVolume = useGameStore((s) => s.bgmVolume);
  const isMuted = useGameStore((s) => s.isMuted);
  const audioRef = useRef(new Audio());
  const [audioBlocked, setAudioBlocked] = useState(false);
  const currentTrack = !hasJoined
    ? TRACKS.LANDING
    : (lobbyState === 'waiting' || lobbyState === 'starting')
      ? TRACKS.LOBBY
      : lobbyState === 'active'
        ? (phase === 1 ? TRACKS.PHASE1 : phase === 2 ? TRACKS.PHASE2 : null)
        : lobbyState === 'ended'
          ? TRACKS.VICTORY
          : null;

  // Handle playing the track
  useEffect(() => {
    const audio = audioRef.current;
    
    if (currentTrack) {
      audio.src = currentTrack;
      audio.loop = true;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.log("Audio play blocked by browser:", e);
          setAudioBlocked(true);
        });
      }
    } else {
      audio.pause();
    }

    return () => {
      audio.pause();
    };
  }, [currentTrack]);

  // Attempt to recover from blocked audio on first interaction
  useEffect(() => {
    if (!audioBlocked) return;

    const handleInteraction = () => {
      const audio = audioRef.current;
      if (audio.paused && currentTrack) {
        audio.play()
          .then(() => setAudioBlocked(false))
          .catch(e => console.log("Still blocked:", e));
      }
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [audioBlocked, currentTrack]);

  // Handle volume and mute
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = isMuted ? 0 : bgmVolume;
  }, [bgmVolume, isMuted]);

  return null; // This is a logic-only component
};
