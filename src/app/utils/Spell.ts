import { LogEntry } from "./GameState";

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

    const logEntry: LogEntry = {
      message: `Player casts ${this.name} on ${this.targetType === 'player' ? 'self' : 'Monster'}.`,
      effect: [{
        type: this.affects,
        value: this.power,
        target: this.targetType
      },
      {
        type: 'Mana',
        value: -this.manaCost,
        target: 'player'
      }]
    }

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
    'An icy blast that freezes the target for one turn.',
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
