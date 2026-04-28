import { useEffect } from "react";

import missileImg from "../../assets/missile.webp";
import tankImg from "../../assets/tank.webp";
import jetImg from "../../assets/jet.webp";
import submarineImg from "../../assets/submarine.webp";
import nukeImg from "../../assets/nuke.webp";
import domeImg from "../../assets/dome.webp";
import stickybombImg from "../../assets/stickybomb.webp";
import radarImg from "../../assets/radar.webp";
import navalmineImg from "../../assets/navalmine.webp";
import cyberAttackImg from "../../assets/cyberattack.webp";
import firewallImg from "../../assets/firewall.webp";

const IMAGE_ASSETS = [
  missileImg,
  tankImg,
  jetImg,
  submarineImg,
  nukeImg,
  domeImg,
  stickybombImg,
  radarImg,
  navalmineImg,
  cyberAttackImg,
  firewallImg,
];

const AUDIO_ASSETS = [
  "/phase_musics/Frontier_Command_Landing_Main.mp3",
  "/phase_musics/Quarter_Slot_Lobby.mp3",
  "/phase_musics/Ticker_s_Gambit_war_prep.mp3",
  "/phase_musics/Projectile_Barrage_War_Phase.mp3",
  "/phase_musics/Bonus_Stage_Triumph_Victory.mp3",
  "/tick_timer.wav",
  "/war_begin.wav",
  "/correct_answer.wav",
  "/low_battery.mp3",
  "/blip.mp3",
  "/bomb.wav",
  "/glass_break.wav",
  "/glitch.wav",
  "/win.wav",
  "/lose.wav",
];

export function AssetPreloader() {
  useEffect(() => {
    const imgs = [];
    for (const src of IMAGE_ASSETS) {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      imgs.push(img);
    }

    const audios = [];
    for (const src of AUDIO_ASSETS) {
      const a = new Audio();
      a.preload = "auto";
      a.src = src;
      audios.push(a);
    }

    return () => {
      // release references
      imgs.length = 0;
      audios.length = 0;
    };
  }, []);

  return null;
}

