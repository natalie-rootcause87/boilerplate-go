export default class Player {
  health: number;
  maxHealth: number;
  spells: { name: string; level: number }[];
  xp: number;
  mana: number;
  maxMana: number;
  level: number;
  xpForNextLevel: number;
  spellToReplace?: string;
  pendingSpell?: string;

  constructor() {
    this.health = 100;
    this.maxHealth = 100;
    this.spells = [];
    this.xp = 0;
    this.mana = 0;
    this.maxMana = 10;
    this.level = 1;
    this.xpForNextLevel = 100; // Initial XP required for level 2
    this.spellToReplace = undefined;
    this.pendingSpell = undefined;
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
    this.xpForNextLevel = Math.floor(this.xpForNextLevel * 1.1);
    this.maxHealth += 20;
    this.health += 20;
    this.maxMana += 5;
    this.mana = this.maxMana;
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

  upgradeSpell(spellName: string, replaceSpell?: string) {
    const spell = this.spells.find(s => s.name === spellName);
    let result = "failed";

    if (spell) {
      spell.level += 1;
      result = "upgraded";
    } else if (this.spells.length < this.level) {
      this.spells.push({ name: spellName, level: 1 });
      result = "learned";
    } else if (replaceSpell) {
      // Replace the specified spell
      const index = this.spells.findIndex(s => s.name === replaceSpell);
      if (index !== -1) {
        this.spells[index] = { name: spellName, level: 1 };
        result = "replaced";
      }
    }

    return result;
  }

  setSpellToReplace(spellName: string) {
    this.spellToReplace = spellName;
  }

  handleSpellChoice(chosenSpell?: string) {
    if (!this.pendingSpell) return "no_pending_spell";
    
    if (!chosenSpell) {
      // Player chose to keep their current spells
      const result = "kept_current";
      this.pendingSpell = undefined;
      return result;
    }

    // Player chose to replace a spell
    const result = this.upgradeSpell(this.pendingSpell, chosenSpell);
    this.pendingSpell = undefined;
    return result;
  }

  // Methods to manage player state
}
