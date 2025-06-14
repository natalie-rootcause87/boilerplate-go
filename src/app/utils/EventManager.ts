import GameState from './GameState';
import { allSpells } from './Spell';
import { getRandomBossMonster, getRandomMonster } from './Monster';

export default class EventManager {
  private static lastEventType: string | null = null;

  static triggerEvent(gameState: GameState): GameState {
    gameState.startNewTurn();

    const isFight = gameState.gameLog.length % 10 === 0;
    const isBossFight = gameState.gameLog.length % 30 === 0;
    const randomValue = Math.random() * 100;

    // Determine available event types
    const availableEvents = [];
    if (isFight || isBossFight) {
      availableEvents.push('monster');
    } else {
      if (this.lastEventType !== 'monster' && randomValue < 12) {
        availableEvents.push('monster');
      }
      if (this.lastEventType !== 'spell' && randomValue < 22) {
        availableEvents.push('spell');
      }
      if (this.lastEventType !== 'random') {
        availableEvents.push('random');
      }
    }

    // If no events are available, default to random event
    if (availableEvents.length === 0) {
      availableEvents.push('random');
    }

    // Select a random event from available events
    const selectedEvent = availableEvents[Math.floor(Math.random() * availableEvents.length)];

    // Trigger the selected event
    if (selectedEvent === 'monster') {
      this.monsterEncounter(gameState, isBossFight);
      this.lastEventType = 'monster';
    } else if (selectedEvent === 'spell') {
      this.spellSelection(gameState);
      this.lastEventType = 'spell';
    } else {
      this.randomEvent(gameState);
      this.lastEventType = 'random';
    }

    // Return the updated game state
    return gameState;
  }

  static randomEvent(gameState: GameState) {
    const events = [
      { message: "You find a shiny coin on the ground.", type: "good", affects: "XP", value: Math.floor(Math.random() * 5) + 1 },
      { message: "A gentle breeze refreshes you.", type: "good", affects: "HP", value: Math.floor(Math.random() * 5) + 1 },
      { message: "You hear distant laughter.", type: "neutral", affects: "none", value: 0 },
      { message: "A bird sings a beautiful song.", type: "good", affects: "XP", value: Math.floor(Math.random() * 3) + 1 },
      { message: "You feel a sudden chill.", type: "bad", affects: "HP", value: -(Math.floor(Math.random() * 5) + 1) },
      { message: "You trip over a root and fall.", type: "bad", affects: "HP", value: -(Math.floor(Math.random() * 10) + 1) },
      { message: "You find a hidden stash of supplies.", type: "good", affects: "XP", value: Math.floor(Math.random() * 5) + 1 },
      { message: "A sudden storm drenches you.", type: "bad", affects: "HP", value: -(Math.floor(Math.random() * 3) + 1) },
      { message: "A donut flies by. You eat it", type: "good", affects: "HP", value: Math.floor(Math.random() * 10) + 1 }
    ];

    const randomEvent = events[Math.floor(Math.random() * events.length)];

    if (randomEvent.affects === "XP") {
      const didLevelUp = gameState.player.gainXP(randomEvent.value);
      gameState.addLogEntry(randomEvent.message, [{ type: 'XP', value: randomEvent.value, target: 'player' }]);
      if (didLevelUp) {
        gameState.addLogEntry(`Level up! You are now level ${gameState.player.level}!`);
      }
    } else if (randomEvent.affects === "HP") {
      gameState.player.increaseHealth(randomEvent.value);
      gameState.addLogEntry(randomEvent.message, [{ type: 'HP', value: randomEvent.value, target: 'player' }]);

      // Check if the player's health is zero or below
      if (gameState.player.health <= 0) {
        gameState.isGameOver = true;
        gameState.addLogEntry('Player has been defeated by a random event. Game over.');
        return; // Exit if the game is over
      }
    } else {
      gameState.addLogEntry(randomEvent.message);
    }
  }

  static monsterEncounter(gameState: GameState, isBossFight: boolean = false) {
    const difficultyLevel = Math.floor(gameState.gameLog.length / 10) + 1; // Increase difficulty over time
    const monster = isBossFight ? getRandomBossMonster() : getRandomMonster(gameState.gameLog.length, difficultyLevel);
    gameState.monster = monster;
    gameState.monsterEncountered = true;
    gameState.addLogEntry(`A wild ${monster.name} appears!`);

    // The combat method simulates the fight and will set monster to null if defeated.
    // We want to keep the monster data for the animation, so we'll restore it after.
    const monsterDataForAnimation = JSON.parse(JSON.stringify(monster));

    gameState.combat(monster);
    
    gameState.monster = monsterDataForAnimation;
  }

  static spellSelection(gameState: GameState, spellOverride?: string) {
    console.log("spellSelection")
    const learnableSpells = allSpells.filter(s => !s.earnedByCombat);
    const randomSpell = learnableSpells[Math.floor(Math.random() * learnableSpells.length)];
    const selectedSpellName = spellOverride || randomSpell.name;
    
    // First check if player already has this spell - if so, upgrade it
    const existingSpell = gameState.player.spells.find(s => s.name === selectedSpellName);
    if (existingSpell) {
      gameState.player.upgradeSpell(selectedSpellName);
      gameState.addLogEntry(`Practice has paid off. You have upgraded your ${selectedSpellName} spell to level ${existingSpell.level}!`);
      return;
    }

    // Store the spell as pending - it will be added to the player's spells after combat
    gameState.addLogEntry(
      `You found the ${selectedSpellName} spell! ${gameState.player.getActiveSpells().length > gameState.player.level ? `At level ${gameState.player.level}, ` +
      `you can only hold ${gameState.player.level} spell${gameState.player.level > 1 ? 's' : ''}. ` +
      `You can choose what to do with it after the battle.` : ''}`
    );
    gameState.player.pendingSpell = selectedSpellName;
    gameState.player.pendingSpellLevel = 1;
  }

  static narrativeEvent(gameState: GameState) {
    if (gameState.gameLog.length > 20 && !gameState.gameLog.some(turn => turn.some(entry => entry.message.includes('A mysterious figure appears...')))) {
      gameState.addLogEntry('A mysterious figure appears...');
    }
  }

  // Additional event methods can be added here
}
