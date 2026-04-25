import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pre-load JSON for efficiency
const questionsBank = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./questionsBank.json"), "utf8"),
);

const EQUIPMENT = {
  missile: {
    name: "Ballistic Missile",
    type: "attack",
    damage: 8,
    counter: "dome",
    marketCost: 150,
    rdCost: 75,
    rdTime: 4000,
    attackDelay: 0,
  },
  dome: {
    name: "Iron Dome",
    type: "defense",
    counters: "missile",
    marketCost: 150,
    rdCost: 75,
    rdTime: 4000,
  },
  tank: {
    name: "Heavy Tank Army",
    type: "attack",
    damage: 5,
    counter: "mine",
    marketCost: 100,
    rdCost: 50,
    rdTime: 5000,
    attackDelay: 4000,
  },
  mine: {
    name: "Sticky Bomb",
    type: "defense",
    counters: "tank",
    marketCost: 100,
    rdCost: 50,
    rdTime: 3000,
  },
  jet: {
    name: "Fighter Jet",
    type: "attack",
    damage: 6,
    counter: "s400",
    marketCost: 200,
    rdCost: 100,
    rdTime: 6000,
    attackDelay: 2000,
  },
  s400: {
    name: "Radar Destruction",
    type: "defense",
    counters: "jet",
    marketCost: 200,
    rdCost: 100,
    rdTime: 6000,
  },
  sub: {
    name: "Attack Submarine",
    type: "attack",
    damage: 7,
    counter: "sonar",
    marketCost: 250,
    rdCost: 125,
    rdTime: 7000,
    attackDelay: 4000,
  },
  sonar: {
    name: "Naval Mines",
    type: "defense",
    counters: "sub",
    marketCost: 250,
    rdCost: 125,
    rdTime: 5000,
  },
  virus: {
    name: "Cyber Attack",
    type: "attack",
    marketCost: 300,
    rdCost: 150,
    rdTime: 8000,
  },
  firewall: {
    name: "Firewall",
    type: "defense",
    counters: "virus",
    marketCost: 300,
    rdCost: 150,
    rdTime: 6000,
  },
  nuke: {
    name: "Nuke",
    type: "attack",
    effect: "nuke",
    counter: null,
    marketCost: 500,
    rdCost: 250,
    rdTime: 10000,
    attackDelay: 2000,
  },
};

class GameState {
  constructor() {
    this.lobbyState = "waiting";
    this.startTime = null;
    this.duration = 180000;
    this.phaseDuration = 120000;
    this.players = {};
    this.countries = [
      "USA",
      "China",
      "Russia",
      "India",
      "UK",
      "Germany",
      "Japan",
      "Brazil",
      "France",
      "Australia",
      "North Korea",
      "Pakistan",
      "Israel",
      "Iran",
    ];
    this.availableCountries = [...this.countries];

    // Global market stock
    this.marketStock = {
      missile: 15,
      dome: 15,
      tank: 20,
      mine: 20,
      jet: 10,
      s400: 10,
      sub: 8,
      sonar: 8,
      virus: 5,
      firewall: 5,
      nuke: 4,
    };

    this.events = [];
    this.battleLogs = [];
    this.lastEventTime = Date.now();
    this.quizTimers = {};
    this.streaks = {};
    this.finalRankings = null;
  }

  addPlayer(socketId, name) {
    if (Object.keys(this.players).length >= 6) return null;
    if (this.availableCountries.length === 0) return null;

    const idx = Math.floor(Math.random() * this.availableCountries.length);
    const country = this.availableCountries.splice(idx, 1)[0];

    this.players[socketId] = {
      socketId,
      name: name || `Player_${socketId.substring(0, 4)}`,
      country,
      hp: 100,
      cp: 0,
      multiplier: 1.0,
      inventory: {
        missile: 0,
        dome: 0,
        tank: 0,
        mine: 0,
        jet: 0,
        s400: 0,
        sub: 0,
        sonar: 0,
        virus: 0,
        firewall: 0,
        nuke: 0,
      },
      researchQueue: [],
      frozenUntil: 0,
      virusInfected: false,
      isReady: false,
      lastActionTime: Date.now(),
      attackCooldowns: {},
      deflectingUntil: 0,
      nukeMarketBuilt: false,
      nukeRDBuilt: false,
    };

    this.streaks[socketId] = 0;
    this.scheduleNextQuiz(socketId);
    return this.players[socketId];
  }

  removePlayer(socketId) {
    const p = this.players[socketId];
    if (p) {
      if (!this.availableCountries.includes(p.country)) {
        this.availableCountries.push(p.country);
      }
      delete this.players[socketId];
      return true;
    }
    return false;
  }

  toggleReady(socketId) {
    if (this.players[socketId]) {
      this.players[socketId].isReady = !this.players[socketId].isReady;
      return true;
    }
    return false;
  }

  startMatch() {
    const allReady = Object.values(this.players).every((p) => p.isReady);

    if (Object.keys(this.players).length > 1 && allReady) {
      this.lobbyState = "starting";
      this.matchStartTime = Date.now() + 5500; // 5.5s to compensate for shatter transition
      return true;
    }
    return false;
  }

  scheduleNextQuiz(socketId) {
    this.quizTimers[socketId] = Date.now() + 10000;
  }

  getPhase(elapsed) {
    // Precise Phase Switch: 1 (Prep) -> 2 (War)
    return elapsed < this.phaseDuration ? 1 : 2;
  }

  tick(io) {
    if (this.lobbyState === "starting") {
      if (Date.now() >= this.matchStartTime) {
        this.lobbyState = "active";
        this.startTime = Date.now();
        for (const id in this.players) {
          this.quizTimers[id] = this.startTime + 10000;
        }
      } else {
        return;
      }
    }

    if (this.lobbyState !== "active") return;

    const now = Date.now();
    const elapsed = now - this.startTime;

    if (elapsed >= this.duration) {
      this.lobbyState = "ended";
      this.finalRankings = this.computeRankings();
      return;
    }

    const phase = this.getPhase(elapsed);

    if (now - this.lastEventTime > 90000) {
      this.triggerRandomEvent(io);
      this.lastEventTime = now;
    }

    for (const id in this.players) {
      const p = this.players[id];
      if (p.hp <= 0) continue;

      // Phase 1: Passive Income
      if (phase === 1) {
        p.cp += 5;
      }

      // Quiz Handling
      if (phase === 1 && now >= this.quizTimers[id]) {
        try {
          const questions = questionsBank.filter(
            (q) => q.country === p.country,
          );
          if (questions.length) {
            const quiz =
              questions[Math.floor(Math.random() * questions.length)];
            if (io) io.to(id).emit("quiz", quiz);
          }
        } catch (e) {
          console.error("Quiz Error:", e);
        }
        this.scheduleNextQuiz(id);
      }

      // Research Management
      p.researchQueue = p.researchQueue.filter((item) => {
        if (now >= item.finishTime) {
          if (Math.random() > 0.4) {
            // Increased failure chance from 0.1 to 0.4
            p.inventory[item.itemId]++;
            if (io)
              io.to(id).emit("notification", {
                message: `R&D Complete: ${item.itemId}`,
              });
          } else {
            if (io)
              io.to(id).emit("notification", {
                message: `R&D FAILED: ${item.itemId} lost.`,
                type: "error",
              });
          }
          return false;
        }
        return true;
      });
    }

    const alive = Object.values(this.players).filter((p) => p.hp > 0);
    if (alive.length <= 1 && this.lobbyState === "active") {
      this.lobbyState = "ended";
      this.finalRankings = this.computeRankings();
    }
  }

  computeRankings() {
    return Object.values(this.players)
      .sort((a, b) => {
        if (b.hp !== a.hp) return b.hp - a.hp;
        return b.cp - a.cp;
      })
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        country: p.country,
        hp: p.hp,
        cp: Math.floor(p.cp),
        survived: p.hp > 0,
      }));
  }

  triggerRandomEvent(io) {
    const list = [
      "Market Crash",
      "Natural Disaster",
      "UN Sanctions",
      "Tech Boom",
      "Resource Windfall",
    ];
    const eventName = list[Math.floor(Math.random() * list.length)];
    const victimIds = Object.keys(this.players)
      .sort(() => 0.5 - Math.random())
      .slice(0, 2);

    victimIds.forEach((id) => {
      const p = this.players[id];
      if (!p) return;
      if (eventName === "Market Crash") p.cp = Math.floor(p.cp * 0.8);
      if (eventName === "Natural Disaster") p.hp = Math.max(0, p.hp - 10);
      if (eventName === "Resource Windfall") p.cp += 500;
      if (eventName === "Tech Boom") p.multiplier += 0.5;
    });

    if (io)
      io.emit("worldEvent", {
        event: eventName,
        victims: victimIds.map((id) => this.players[id].country),
      });
  }

  buyFromMarket(socketId, itemId) {
    const p = this.players[socketId];
    const item = EQUIPMENT[itemId];
    if (itemId === "nuke" && p && p.nukeMarketBuilt) return false;
    if (p && this.marketStock[itemId] > 0 && p.cp >= item.marketCost) {
      if (itemId === "nuke") p.nukeMarketBuilt = true;
      p.cp -= item.marketCost;
      this.marketStock[itemId]--;
      p.inventory[itemId]++;
      return true;
    }
    return false;
  }

  startResearch(socketId, itemId) {
    const p = this.players[socketId];
    const item = EQUIPMENT[itemId];
    if (itemId === "nuke" && p && p.nukeRDBuilt) return false;
    if (p && p.cp >= item.rdCost && Date.now() > p.frozenUntil) {
      if (itemId === "nuke") p.nukeRDBuilt = true;
      p.cp -= item.rdCost;
      p.researchQueue.push({
        itemId,
        finishTime: Date.now() + item.rdTime,
      });
      return true;
    }
    return false;
  }

  deploySpy(socketId, targetId, options) {
    const p = this.players[socketId];
    const target = this.players[targetId];
    if (!p || !target) return null;

    const mode = options.mode;
    let cost = 0;
    if (mode === "full") cost = 500;
    else if (mode === "category") cost = 300;
    else if (mode === "specific") cost = 100;

    if (p.cp >= cost) {
      p.cp -= cost;
      if (mode === "full") return { mode, data: target.inventory };
      if (mode === "category") {
        const result = {};
        for (const id in EQUIPMENT) {
          if (EQUIPMENT[id].type === options.category)
            result[id] = target.inventory[id];
        }
        return { mode, category: options.category, data: result };
      }
      if (mode === "specific")
        return {
          mode,
          itemId: options.itemId,
          count: target.inventory[options.itemId] || 0,
        };
    }
    return null;
  }

  activateDeflect(socketId) {
    const p = this.players[socketId];
    if (p && p.inventory["virus"] > 0) {
      p.inventory["virus"]--;
      p.deflectingUntil = Date.now() + 5000; // 5 seconds of deflection
      return true;
    }
    return false;
  }

  attack(attackerId, targetId, itemId) {
    const attacker = this.players[attackerId];
    let actualTarget = this.players[targetId];
    const item = EQUIPMENT[itemId];

    if (attacker && actualTarget && attacker.inventory[itemId] > 0) {
      if (attacker.hp <= 0) return { success: false, reason: "dead_attacker" };
      if (actualTarget.hp <= 0)
        return { success: false, reason: "dead_target" };

      if (Date.now() < (attacker.attackCooldowns[itemId] || 0)) {
        return { success: false, reason: "cooldown" };
      }

      attacker.inventory[itemId]--;

      const counterId = item.counter;

      const deflectable = ["missile", "nuke"];
      if (
        Date.now() < actualTarget.deflectingUntil &&
        deflectable.includes(itemId)
      ) {
        if (attacker.inventory["firewall"] > 0) {
          attacker.inventory["firewall"]--;
          attacker.attackCooldowns[itemId] =
            Date.now() + (item.attackDelay || 0);
          this.battleLogs.push({
            time: Date.now(),
            text: `[FIREWALL] ${attacker.country} nullified ${actualTarget.country}'s deflected ${item.name} attack!`,
          });
          return {
            success: true,
            damage: 0,
            target: attacker.socketId,
            deflected: true,
            originalTarget: actualTarget.socketId,
            itemId,
            firewallBlocked: true,
          };
        }

        let damageDealt = 0;
        if (item.effect === "freeze") {
          attacker.frozenUntil = Date.now() + 20000;
        } else if (item.effect === "nuke") {
          const oldHp = attacker.hp;
          attacker.hp = Math.floor(attacker.hp * 0.5);
          damageDealt = oldHp - attacker.hp;
        } else if (item.damage) {
          const oldHp = attacker.hp;
          attacker.hp = Math.max(0, attacker.hp - item.damage);
          damageDealt = oldHp - attacker.hp;
        }

        attacker.attackCooldowns[itemId] = Date.now() + (item.attackDelay || 0);
        // Reset deflection timer on success
        actualTarget.deflectingUntil = Date.now() + 5000;
        this.battleLogs.push({
          time: Date.now(),
          text: `[CYBERATTACK] ${actualTarget.country} deflected ${item.name} back to ${attacker.country} dealing ${damageDealt} HP damage!`,
        });
        return {
          success: true,
          damage: damageDealt,
          target: attacker.socketId,
          deflected: true,
          originalTarget: actualTarget.socketId,
          itemId,
        };
      }

      let isCountered = false;
      if (counterId && actualTarget.inventory[counterId] > 0) {
        actualTarget.inventory[counterId]--;
        isCountered = true;
      }

      if (isCountered) {
        attacker.attackCooldowns[itemId] = Date.now() + (item.attackDelay || 0);
        this.battleLogs.push({
          time: Date.now(),
          text: `[DEFENSE] ${actualTarget.country} successfully countered ${attacker.country}'s ${item.name}!`,
        });
        return {
          success: false,
          reason: "countered",
          target: actualTarget.socketId,
          itemId,
        };
      } else {
        let damageDealt = 0;
        if (item.effect === "freeze") {
          actualTarget.frozenUntil = Date.now() + 20000;
        } else if (item.effect === "nuke") {
          const oldHp = actualTarget.hp;
          actualTarget.hp = Math.floor(actualTarget.hp * 0.5);
          damageDealt = oldHp - actualTarget.hp;
        } else if (item.damage) {
          const oldHp = actualTarget.hp;
          actualTarget.hp = Math.max(0, actualTarget.hp - item.damage);
          damageDealt = oldHp - actualTarget.hp;
        }

        attacker.attackCooldowns[itemId] = Date.now() + (item.attackDelay || 0);
        this.battleLogs.push({
          time: Date.now(),
          text: `[ATTACK] ${attacker.country} hit ${actualTarget.country} with ${item.name} dealing ${damageDealt} HP damage!`,
        });
        return {
          success: true,
          damage: damageDealt,
          target: actualTarget.socketId,
          itemId,
        };
      }
    }
    return { success: false, reason: "no_ammo" };
  }

  handleQuiz(socketId, correct) {
    const p = this.players[socketId];
    if (!p) return;
    if (correct) {
      this.streaks[socketId]++;
      const amount = 100 * p.multiplier;
      p.cp += Math.floor(amount);
      p.multiplier += 0.5;
    } else {
      this.streaks[socketId] = 0;
      p.cp = Math.max(0, p.cp - 100);
      p.multiplier = Math.max(1.0, p.multiplier - 0.1);
    }
  }

  getSnapshot() {
    let rankings = null;
    if (this.lobbyState === "ended") {
      if (!this.finalRankings) {
        this.finalRankings = this.computeRankings();
      }
      rankings = this.finalRankings;
    }

    const elapsed = this.startTime ? Date.now() - this.startTime : 0;

    return {
      lobbyState: this.lobbyState,
      matchStartTime: this.matchStartTime,
      duration: this.duration,
      timeRemaining: this.startTime
        ? Math.max(0, this.duration - elapsed)
        : this.duration,
      phase: this.startTime ? this.getPhase(elapsed) : 1,
      players: this.players,
      marketStock: this.marketStock,
      rankings,
      battleLogs: this.battleLogs,
    };
  }

  resetGame() {
    this.lobbyState = "waiting";
    this.startTime = null;
    this.matchStartTime = null;
    this.players = {};
    this.availableCountries = [...this.countries];
    this.marketStock = {
      missile: 15,
      dome: 15,
      tank: 20,
      mine: 20,
      jet: 10,
      s400: 10,
      sub: 8,
      sonar: 8,
      virus: 5,
      firewall: 5,
      nuke: 4,
    };
    this.quizTimers = {};
    this.streaks = {};
    this.battleLogs = [];
    this.finalRankings = null;
  }
}

export default GameState;
