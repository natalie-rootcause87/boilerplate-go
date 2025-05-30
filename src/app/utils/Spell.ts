import { LogEntry } from "./GameState";
import Player from "./Player";

export interface SpellEffect {
  type: "HP" | "Mana" | "XP";
  value: number;
  target: 'player' | 'monster';
  special?: {
    type: 'freeze';
    duration: number;
  };
}

export default class Spell {
  name: string;
  description: string;
  power: number;
  affects: "HP" | "Mana" | "XP";
  targetType: 'player' | 'monster';
  manaCost: number;
  earnedByCombat?: boolean;
  player?: Player;

  constructor(
    name: string,
    description: string,
    power: number,
    affects: "HP" | "Mana" | "XP",
    targetType: 'player' | 'monster',
    manaCost: number,
    earnedByCombat?: boolean,
    player?: Player
  ) {
    this.name = name;
    this.description = description;
    this.power = power;
    this.affects = affects;
    this.targetType = targetType;
    this.manaCost = manaCost;
    this.earnedByCombat = earnedByCombat;
    this.player = player;
  }

  applyEffect(playerMana: number) {
    if (playerMana < this.manaCost) {
      return console.log(`Not enough mana to cast ${this.name}.`);
    }

    const effect: SpellEffect = {
      type: this.affects,
      value: this.power,
      target: this.targetType
    };

    // Add special effects based on spell name
    if (this.name === 'Freeze') {
      effect.special = {
        type: 'freeze',
        duration: 1 // This will be multiplied by spell level in combat
      };
    } else if (this.name === 'Donut') {
      effect.special = {
        type: 'freeze',
        duration: -1 // Using -1 to indicate this is a fixed 1-turn duration
      };
    } else if (this.name === 'Healing Light') {
      // Get the spell level from the player's spells
      const spellLevel = this.player?.spells.find((s: { name: string; level: number }) => s.name === 'Healing Light')?.level || 1;
      // Scale the healing power with spell level
      effect.value = this.power * spellLevel;
    }

    let message = `Player casts ${this.name} on ${this.targetType === 'player' ? 'self' : 'Monster'}.`;
    if (this.name === 'Donut') {
      message = `A magical donut appears! The Monster is distracted, busy eating it.`;
    } else if (this.name === 'Healing Light') {
      const spellLevel = this.player?.spells.find((s: { name: string; level: number }) => s.name === 'Healing Light')?.level || 1;
      message = `A warm light surrounds you, healing your wounds${spellLevel > 1 ? ` (Level ${spellLevel})` : ''}.`;
    }

    const logEntry: LogEntry = {
      message: message,
      effect: [
        effect,
        {
          type: 'Mana',
          value: -this.manaCost,
          target: 'player'
        }
      ]
    };

    return logEntry;
  }
}

// Example global table of spells
export const allSpells = [
  new Spell(
    'Fireball',
    'A fiery explosion that burns the target.',
    -15,
    'HP',
    'monster',
    8
  ),
  new Spell(
    'Donut',
    'A flying donut appears and distracts the target.',
    1,
    'HP',
    'monster',
    3,
    true
  ),
  new Spell(
    'Freeze',
    'An icy blast that freezes the target, preventing them from attacking for a number of turns equal to the spell level.',
    -5,
    'HP',
    'monster',
    8
  ),
  new Spell(
    'Healing Light',
    'A warm light that heals the target. Healing power increases with spell level.',
    20,  // Increased from 12 to 20
    'HP',
    'player',
    7
  ),
  // Add more spells as needed
];
