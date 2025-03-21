export default class Player {
  health: number;
  maxHealth: number;
  spells: { name: string; level: number }[];
  xp: number;
  mana: number;
  maxMana: number;
  level: number;
  xpForNextLevel: number;

  constructor() {
    this.health = 100;
    this.maxHealth = 100;
    this.spells = [];
    this.xp = 0;
    this.mana = 0;
    this.maxMana = 10;
    this.level = 1;
    this.xpForNextLevel = 100; // Initial XP required for level 2
  }

  gainXP(amount: number) {
    this.xp += amount;
    let didLevelUp = false;
    while (this.xp >= this.xpForNextLevel) {
      this.levelUp();
      didLevelUp = true;
    }
    return didLevelUp;
  }

  levelUp() {
    this.level += 1;
    this.xp -= this.xpForNextLevel;
    if (this.xp < 0) {
      this.xp = 0;
    }
    this.xpForNextLevel = Math.floor(this.xpForNextLevel * 1.2); // Increase XP required for next level
    this.maxHealth += 10; // Increase max health per level
    this.maxMana += 2; // Increase max mana per level
    console.log(`Leveled up to ${this.level}!`);
  }

  gainMana(amount: number) {
    this.mana += amount;
    if (this.mana > this.maxMana) {
      this.mana = this.maxMana;
    }
  }

  increaseHealth(amount: number) {
    this.health += amount;
    if (this.health > this.maxHealth) {
      this.maxHealth = this.health;
    }
  }

  resetHealth() {
    this.health = 100;
    this.maxHealth = 100;
  }

  upgradeSpell(spellName: string) {
    const spell = this.spells.find(s => s.name === spellName);
    let result = "failed";
    if (spell) {
      spell.level += 1;

      result = "upgraded"
    } else if (this.spells.length < this.level) {
      this.spells.push({ name: spellName, level: 1 });
      result = "learned"
    }

    return result;
  }

  // Methods to manage player state
}
