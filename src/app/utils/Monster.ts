export class Monster {
  name: string;
  health: number;
  maxHealth: number;
  attack: number;
  difficultyLevel: number;
  xpReward: number;
  manaOnHit: number;
  activeAfterTurn: number;
  frozenTurns: number;

  constructor(name: string, difficultyLevel: number, manaOnHit: number, activeAfterTurn: number) {
    this.name = name;
    this.health = Math.floor(difficultyLevel * 45);
    this.maxHealth = this.health;
    this.attack = Math.ceil(difficultyLevel * 1.5);
    this.difficultyLevel = difficultyLevel;
    this.xpReward = Math.floor(difficultyLevel * 10);
    this.manaOnHit = manaOnHit;
    this.activeAfterTurn = activeAfterTurn;
    this.frozenTurns = 0;
  }
}

// Define a set of possible monsters
export const MonsterPool: Monster[] = [
  new Monster("Goblin", 1, 1, 0),
  new Monster("Donut Hole", 1, 1, 0),
  new Monster("Wolf", 2, 2, 20),
  new Monster("Orc", 3, 3, 25),
  new Monster("Undead Knight", 5, 4, 45),
  new Monster("Dragon", 10, 5, 60),
];

export const BossMonsterPool: Monster[] = [
  new Monster("Orc Chieftain", 5, 4, 29),
  new Monster("Armored Donut", 5, 4, 29),
  new Monster("Undead General", 8, 8, 59),
  new Monster("Ancient Dragon", 15, 10, 89),
]

// Function to get a monster based on player level
export function getRandomMonster(currentTurn: number, playerLevel: number): Monster {
  const availableMonsters = MonsterPool.filter(monster => monster.activeAfterTurn <= currentTurn);
  const selection = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];

  // Scale monster health & attack based on turn count & player level
  const difficultyMultiplier = 1 + (currentTurn / 150) + (playerLevel / 15); // Example scaling
  const scaledHealth = Math.floor(selection.maxHealth * difficultyMultiplier);
  const scaledAttack = Math.ceil(selection.attack * difficultyMultiplier);
  return {
    ...selection,
    health: scaledHealth,
    maxHealth: scaledHealth,
    attack: scaledAttack
  };
}

export function getRandomBossMonster(): Monster {
  const selection = BossMonsterPool[Math.floor(Math.random() * BossMonsterPool.length)];
  // You can add scaling for boss monsters here if needed
  return { ...selection };
}

