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
  const { hasJoined, gameState, bgmVolume, isMuted } = useGameStore();
  const audioRef = useRef(new Audio());
  const [currentTrack, setCurrentTrack] = useState(null);
  const [audioBlocked, setAudioBlocked] = useState(false);

  // Determine which track should be playing
  useEffect(() => {
    let nextTrack = null;

    if (!hasJoined) {
      nextTrack = TRACKS.LANDING;
    } else if (gameState.lobbyState === 'waiting' || gameState.lobbyState === 'starting') {
      nextTrack = TRACKS.LOBBY;
    } else if (gameState.lobbyState === 'active') {
      if (gameState.phase === 1) {
        nextTrack = TRACKS.PHASE1;
      } else if (gameState.phase === 2) {
        nextTrack = TRACKS.PHASE2;
      }
    } else if (gameState.lobbyState === 'ended') {
      nextTrack = TRACKS.VICTORY;
    }

    if (nextTrack !== currentTrack) {
      setCurrentTrack(nextTrack);
    }
  }, [hasJoined, gameState.lobbyState, gameState.phase, currentTrack]);

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
