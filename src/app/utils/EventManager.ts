import GameState from './GameState';
import { allSpells } from './Spell';
import { getRandomBossMonster, getRandomMonster } from './Monster';

export default class EventManager {
  static triggerEvent(gameState: GameState): GameState {
    gameState.startNewTurn();

    const isFight = gameState.gameLog.length % 10 === 0;
    const isBossFight = gameState.gameLog.length % 30 === 0;
    const randomValue = Math.random() * 100;

    if (isFight || isBossFight) {
      this.monsterEncounter(gameState, isBossFight);
    } else if (randomValue < 12) {
      // 12% chance for a Monster encounter
      this.monsterEncounter(gameState);
    } else if (randomValue < 22) {
      // 10% chance for a Spell selection
      this.spellSelection(gameState);
    } else {
      // 78% chance for a Random Event
      this.randomEvent(gameState);
    }

    // Return the updated game state
    return gameState;
  }

  static randomEvent(gameState: GameState) {
    const events = [
      { message: "You find a shiny coin on the ground.", type: "good", affects: "XP", value: Math.floor(Math.random() * 10) + 1 },
      { message: "A gentle breeze refreshes you.", type: "good", affects: "HP", value: Math.floor(Math.random() * 5) + 1 },
      { message: "You hear distant laughter.", type: "neutral", affects: "none", value: 0 },
      { message: "A bird sings a beautiful song.", type: "good", affects: "XP", value: Math.floor(Math.random() * 5) + 1 },
      { message: "You feel a sudden chill.", type: "bad", affects: "HP", value: -(Math.floor(Math.random() * 5) + 1) },
      { message: "You trip over a root and fall.", type: "bad", affects: "HP", value: -(Math.floor(Math.random() * 10) + 1) },
      { message: "You find a hidden stash of supplies.", type: "good", affects: "XP", value: Math.floor(Math.random() * 15) + 5 },
      { message: "A sudden storm drenches you.", type: "bad", affects: "HP", value: -(Math.floor(Math.random() * 3) + 1) },
      { message: "A donut flies by. You eat it", type: "good", affects: "HP", value: Math.floor(Math.random() * 10) + 1 }
    ];

    const randomEvent = events[Math.floor(Math.random() * events.length)];
    // let messageAddition = '';

    if (randomEvent.affects === "XP") {
      // messageAddition = `You gain ${randomEvent.value} XP.`;
      gameState.addLogEntry(randomEvent.message, [{ type: 'XP', value: randomEvent.value, target: 'player' }]);
    } else if (randomEvent.affects === "HP") {
      // messageAddition = `Your health changes by ${randomEvent.value}.`;
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
    const monster = isBossFight ? getRandomBossMonster(gameState.gameLog.length) : getRandomMonster(gameState.gameLog.length, difficultyLevel);
    gameState.monster = monster;
    gameState.addLogEntry(`A wild ${monster.name} appears!`);
    gameState.combat(monster);
  }

  static spellSelection(gameState: GameState, spellOverride?: string) {
    console.log("spellSelection")
    const learnableSpells = allSpells.filter(s => !s.earnedByCombat);
    const randomSpell = learnableSpells[Math.floor(Math.random() * learnableSpells.length)];
    const selectedSpellName = spellOverride || randomSpell.name
    const result = gameState.player.upgradeSpell(selectedSpellName);

    const resultMessage = {
      "upgraded": `Practice has paid off. You have upgraded your spell: ${selectedSpellName}.`,
      "learned": `You have learned a new spell: ${selectedSpellName}.`,
      "failed": `You tried to practice ${selectedSpellName}, but you were not able to grasp the concept.`
    }[result]

    gameState.addLogEntry(resultMessage || '');
  }

  static narrativeEvent(gameState: GameState) {
    if (gameState.gameLog.length > 20 && !gameState.gameLog.some(turn => turn.some(entry => entry.message.includes('A mysterious figure appears...')))) {
      gameState.addLogEntry('A mysterious figure appears...');
    }
  }

  // Additional event methods can be added here
}
