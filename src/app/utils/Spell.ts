import { LogEntry } from "./GameState";

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

  constructor(
    name: string,
    description: string,
    power: number,
    affects: "HP" | "Mana" | "XP",
    targetType: 'player' | 'monster',
    manaCost: number,
    earnedByCombat?: boolean,
  ) {
    this.name = name;
    this.description = description;
    this.power = power;
    this.affects = affects;
    this.targetType = targetType;
    this.manaCost = manaCost;
    this.earnedByCombat = earnedByCombat;
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
    }

    let message = `Player casts ${this.name} on ${this.targetType === 'player' ? 'self' : 'Monster'}.`;
    if (this.name === 'Donut') {
      message = `A magical donut appears! The Monster is distracted, busy eating it.`;
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
    'A warm light that heals the target.',
    12,
    'HP',
    'player',
    7
  ),
  // Add more spells as needed
];
