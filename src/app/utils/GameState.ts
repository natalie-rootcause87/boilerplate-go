import Player from './Player';
import { Monster } from './Monster';
import { allSpells } from './Spell';
import EventManager from './EventManager';

export interface Effect {
  type: string;
  value: number;
  target: string;
  special?: {
    type: 'freeze';
    duration: number;
  };
}

export interface LogEntry {
  message: string;
  effect?: Effect[];
}

export interface PartialGameState {
  player: Player;
  gameLog: LogEntry[][];
  isGameOver: boolean;
  unlockedSpells: string[];
}

export default class GameState {
  player: Player;
  monster: Monster | null;
  gameLog: LogEntry[][];
  isGameOver: boolean;
  unlockedSpells: string[];
  lastActionType: string | null;

  constructor() {
    this.player = new Player();
    this.monster = null;
    this.gameLog = this.loadGameLog();
    this.isGameOver = false;
    this.unlockedSpells = this.loadUnlockedSpells();
    this.lastActionType = null;
  }

  loadUnlockedSpells(): string[] {
    if (typeof window !== 'undefined') {
      const spells = localStorage.getItem('unlockedSpells');
      return spells ? JSON.parse(spells) : [];
    }
    return [];
  }

  saveUnlockedSpells() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('unlockedSpells', JSON.stringify(this.unlockedSpells));
    }
  }

  loadGameLog(): LogEntry[][] {
    if (typeof window !== 'undefined') {
      const log = localStorage.getItem('gameLog');
      return log ? JSON.parse(log) : [[]]; // Initialize with an empty array for the first turn
    }
    return [[]];
  }

  saveGameLog() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gameLog', JSON.stringify(this.gameLog));
    }
  }

  addLogEntry(message: string, effect?: Effect[]) {
    if (this.gameLog.length === 0) {
      this.gameLog.push([]); // Ensure there's at least one turn
    }
    this.gameLog[this.gameLog.length - 1].push({ message, effect });
    this.saveGameLog();
  }

  startGame() {
    if (this.gameLog.length === 0) {
      this.gameLog.push([]); // Initialize the game log with the first turn
    }
    this.saveGameLog();
  }

  resetGame() {
    this.player = new Player();
    this.gameLog = []; // Reset the game log without initializing a turn
    this.isGameOver = false;
    this.unlockedSpells = []; // Reset unlocked spells
    
    // Clear localStorage entries
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gameLog');
      localStorage.removeItem('unlockedSpells');
      localStorage.removeItem('playerState');
    }
    
    this.saveGameLog(); // Save the cleared log
    this.saveUnlockedSpells(); // Save the cleared spells
    this.savePlayerState(); // Save the new player state
  }

  // Method to handle combat
  combat(monster: Monster) {
    this.lastActionType = "attack";
    let playerHp = this.player.health;
    let playerMana = this.player.mana;
    let monsterHp = monster.health;
    let turnCount = 0;
    const maxTurns = 100;
    monster.frozenTurns = 0; // Initialize frozen turns
    let earnedDonutSpell = false;

    while (monsterHp >= 0 && playerHp > 0 && turnCount < maxTurns) {
      turnCount++;
      console.log('combat turnCount', turnCount);
      const eligibleSpells = this.player.spells
        .map(spell => {
          const spellDef = allSpells.find(s => s.name === spell.name);
          if (spellDef) {
            spellDef.player = this.player;
          }
          return spellDef;
        })
        .filter(spell => spell && spell.manaCost <= playerMana && (spell.targetType === 'monster' || playerHp < (100 - spell.power)));
      
      if (eligibleSpells.length > 0) {
        const randomSpell = eligibleSpells[Math.floor(Math.random() * eligibleSpells.length)];

        if (randomSpell) {
          const logEntry = randomSpell.applyEffect(playerMana) as LogEntry;
          playerMana -= randomSpell.manaCost;
          
          // Handle freeze effects
          const spellEffect = logEntry.effect?.[0]?.special;
          if (spellEffect?.type === 'freeze') {
            if (randomSpell.name === 'Donut') {
              monster.frozenTurns = 1; // Always 1 turn for Donut
            } else if (randomSpell.name === 'Freeze') {
              const spellLevel = this.player.spells.find(s => s.name === 'Freeze')?.level || 1;
              monster.frozenTurns = spellLevel;
              logEntry.message += ` ${monster.name} is frozen for ${spellLevel} turns!`;
            }
          }

          if (randomSpell.targetType === 'player') {
            playerHp += randomSpell.power;
          }
          if (randomSpell.targetType === 'monster') {
            monsterHp += randomSpell.power;
          }
          this.addLogEntry(logEntry.message, logEntry.effect);
        }
      } else {
        // Use fists if no spells are available
        const fistDamage = 10; // Define the damage dealt by fists
        
        monsterHp -= fistDamage;
        playerMana += monster.manaOnHit;
        this.addLogEntry(`Player uses fists on ${monster.name}.`, [{ type: 'Mana', value: monster.manaOnHit, target: 'player' }, { type: 'HP', value: -fistDamage, target: 'monster' }]);
      }

      // Check if the monster is defeated
      if (monsterHp <= 0) {
        this.addLogEntry(`${monster.name} has been defeated!`);
        // Mark that we earned the donut spell if applicable
        if (monster.name.toLowerCase().includes("donut")) {
          earnedDonutSpell = true;
        }
        break; // Exit the combat loop
      }

      // Monster's return strike - only if not frozen
      if (monster.frozenTurns > 0) {
        monster.frozenTurns--;
        const message = monster.frozenTurns > 0 
          ? `${monster.name} is frozen and cannot attack! (${monster.frozenTurns} turns remaining)`
          : `${monster.name} thawed out!`;
        this.addLogEntry(message);
      } else {
        const monsterDamage = monster.attack * Math.floor(Math.random() * 5) + 1;
        playerHp -= monsterDamage;
        this.addLogEntry(`${monster.name} strikes back for ${monsterDamage} damage.`, [{ type: 'HP', value: -monsterDamage, target: 'player' }]);
      }

      // Check if the player is dead
      if (playerHp <= 0) {
        this.isGameOver = true;
        this.addLogEntry('Player has been defeated. Game over.');
        return; // Exit the loop if the player is dead
      }
    }

    // Sync health values back to the main objects so the UI updates
    this.player.health = playerHp;
    monster.health = monsterHp;

    // After combat is complete, handle rewards
    if (monsterHp <= 0) {
      // Award XP after combat is complete
      const isBossFight = monster.name.toLowerCase().includes("boss");
      if (isBossFight) {
        const didLevelUp = this.player.gainXP(25);
        this.addLogEntry('You defeated a boss! +25 XP', [{ type: 'XP', value: 25, target: 'player' }]);
        if (didLevelUp) {
          this.addLogEntry(`Level up! You are now level ${this.player.level}!`);
        }
      } else {
        const didLevelUp = this.player.gainXP(7);
        this.addLogEntry('You defeated the monster! +7 XP', [{ type: 'XP', value: 7, target: 'player' }]);
        if (didLevelUp) {
          this.addLogEntry(`Level up! You are now level ${this.player.level}!`);
        }
      }

      // Handle donut spell earning after combat
      if (earnedDonutSpell) {
        EventManager.spellSelection(this, "Donut");
      }
    } else if (turnCount >= maxTurns) {
      this.addLogEntry('Combat ended due to reaching the maximum number of turns.');
    }
  }

  // Perform a single turn of combat and return the result
  combatTurn(monster: Monster) {
    const logEntries: LogEntry[] = [];
    let isCombatOver = false;
    let playerDied = false;
    let earnedDonutSpell = false;

    // Use the current health/mana from the objects
    let playerHp = this.player.health;
    let playerMana = this.player.mana;
    let monsterHp = monster.health;

    // Determine eligible spells
    const eligibleSpells = this.player.spells
      .map(spell => {
        const spellDef = allSpells.find(s => s.name === spell.name);
        if (spellDef) {
          spellDef.player = this.player;
        }
        return spellDef;
      })
      .filter(spell => spell && spell.manaCost <= playerMana && (spell.targetType === 'monster' || playerHp < (100 - spell.power)));

    if (eligibleSpells.length > 0) {
      const randomSpell = eligibleSpells[Math.floor(Math.random() * eligibleSpells.length)];
      if (randomSpell) {
        const logEntry = randomSpell.applyEffect(playerMana) as LogEntry;
        playerMana -= randomSpell.manaCost;
        // Handle freeze effects
        const spellEffect = logEntry.effect?.[0]?.special;
        if (spellEffect?.type === 'freeze') {
          if (randomSpell.name === 'Donut') {
            monster.frozenTurns = 1;
          } else if (randomSpell.name === 'Freeze') {
            const spellLevel = this.player.spells.find(s => s.name === 'Freeze')?.level || 1;
            monster.frozenTurns = spellLevel;
            logEntry.message += ` ${monster.name} is frozen for ${spellLevel} turns!`;
          }
        }
        if (randomSpell.targetType === 'player') {
          playerHp += randomSpell.power;
        }
        if (randomSpell.targetType === 'monster') {
          monsterHp += randomSpell.power;
        }
        logEntries.push(logEntry);
      }
    } else {
      // Use fists if no spells are available
      const fistDamage = 10;
      monsterHp -= fistDamage;
      playerMana += monster.manaOnHit;
      logEntries.push({
        message: `Player uses fists on ${monster.name}.`,
        effect: [
          { type: 'Mana', value: monster.manaOnHit, target: 'player' },
          { type: 'HP', value: -fistDamage, target: 'monster' }
        ]
      });
    }

    // Check if the monster is defeated
    if (monsterHp <= 0) {
      logEntries.push({ message: `${monster.name} has been defeated!` });
      if (monster.name.toLowerCase().includes("donut")) {
        earnedDonutSpell = true;
      }
      isCombatOver = true;
    } else {
      // Monster's return strike - only if not frozen
      if (monster.frozenTurns > 0) {
        monster.frozenTurns--;
        const message = monster.frozenTurns > 0
          ? `${monster.name} is frozen and cannot attack! (${monster.frozenTurns} turns remaining)`
          : `${monster.name} thawed out!`;
        logEntries.push({ message });
      } else {
        const monsterDamage = monster.attack * Math.floor(Math.random() * 5) + 1;
        playerHp -= monsterDamage;
        logEntries.push({
          message: `${monster.name} strikes back for ${monsterDamage} damage.`,
          effect: [{ type: 'HP', value: -monsterDamage, target: 'player' }]
        });
      }
      // Check if the player is dead
      if (playerHp <= 0) {
        this.isGameOver = true;
        logEntries.push({ message: 'Player has been defeated. Game over.' });
        isCombatOver = true;
        playerDied = true;
      }
    }

    // Sync health/mana back to the main objects
    this.player.health = playerHp;
    this.player.mana = playerMana;
    monster.health = monsterHp;

    return {
      logEntries,
      isCombatOver,
      playerDied,
      earnedDonutSpell
    };
  }

  static fromPartial(partial: PartialGameState): GameState {
    const newState = new GameState();
    newState.player = partial.player;
    newState.gameLog = partial.gameLog;
    newState.isGameOver = partial.isGameOver;
    newState.unlockedSpells = partial.unlockedSpells;
    return newState;
  }

  // Additional methods to manage game state

  savePlayerState() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('playerState', JSON.stringify(this.player));
    }
  }

  loadPlayerState() {
    if (typeof window !== 'undefined') {
      const playerData = localStorage.getItem('playerState');
      if (playerData) {
        this.player = JSON.parse(playerData);
      } else {
        this.player = new Player();
      }
    }
  }

  startNewTurn() {
    this.gameLog.push([]); // Start a new turn by adding a new array for log entries
    this.saveGameLog(); // Save the updated game log
  }
}
