export type Spell = { name: string; level: number };

export default class Player {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  level: number;
  xp: number;
  xpForNextLevel: number;
  spells: Spell[];
  spellToReplace?: string;
  pendingSpell?: string;
  pendingSpellLevel: number;

  constructor() {
    this.health = this.maxHealth = 100;
    this.maxMana = 10;
    this.mana = 0;
    this.level = 1;
    this.xp = 0;
    this.xpForNextLevel = this.calculateXpForNextLevel(this.level);
    this.spells = [];
    this.pendingSpellLevel = 1;
    this.logState('Initialized');
  }

  // --- XP & Leveling ---

  gainXP(amount: number): boolean {
    this.log(`[XP Gain] +${amount} XP (was ${this.xp}/${this.xpForNextLevel})`);
    this.xp += amount;
    let didLevelUp = false;
    if (this.xp >= this.xpForNextLevel) {
      didLevelUp = true;
      this.levelUp();
    }
    this.logState('After gainXP');
    return didLevelUp;
  }

  private levelUp() {
    const oldLevel = this.level;
    this.level++;
    this.xp -= this.xpForNextLevel;
    if (this.xp < 0) this.xp = 0;
    this.xpForNextLevel = this.calculateXpForNextLevel(this.level);
    this.maxHealth += 20;
    this.health = this.maxHealth;
    this.maxMana += 5;
    this.mana = this.maxMana;
    this.log(`[Level Up] ${oldLevel} → ${this.level} | XP: ${this.xp}/${this.xpForNextLevel}`);
  }

  private calculateXpForNextLevel(level: number): number {
    return Math.floor(10 * Math.pow(3, level - 1));
  }

  // --- Health & Mana ---

  gainMana(amount: number) {
    this.mana = Math.min(this.maxMana, this.mana + amount);
    this.log(`[Mana] +${amount} → ${this.mana}/${this.maxMana}`);
  }

  increaseHealth(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.log(`[Health] +${amount} → ${this.health}/${this.maxHealth}`);
  }

  resetHealth() {
    this.health = this.maxHealth = 100;
    this.log('[Health] Reset to 100');
  }

  // --- Spells ---

  earnSpell(spellName: string, level: number = 1) {
    this.pendingSpell = spellName;
    this.pendingSpellLevel = level;
    this.log(`[Spell] Pending: ${spellName} (level ${level})`);
  }

  resolvePendingSpell() {
    if (!this.pendingSpell) return null;
    const result = this.upgradeSpell(this.pendingSpell);
    const spellName = this.pendingSpell;
    this.pendingSpell = undefined;
    this.pendingSpellLevel = 1;
    this.log(`[Spell] Resolved: ${spellName} (${result})`);
    return { spellName, result };
  }

  upgradeSpell(spellName: string, replaceSpell?: string): 'upgraded' | 'learned' | 'replaced' | 'failed' {
    const spell = this.spells.find(s => s.name === spellName);
    if (spell) {
      spell.level++;
      this.log(`[Spell] Upgraded: ${spellName} to level ${spell.level}`);
      return 'upgraded';
    }
    if (this.spells.length < this.level) {
      this.spells.push({ name: spellName, level: this.pendingSpellLevel });
      this.log(`[Spell] Learned: ${spellName} at level ${this.pendingSpellLevel}`);
      return 'learned';
    }
    if (replaceSpell) {
      const idx = this.spells.findIndex(s => s.name === replaceSpell);
      if (idx !== -1) {
        this.spells[idx] = { name: spellName, level: this.pendingSpellLevel };
        this.log(`[Spell] Replaced: ${replaceSpell} with ${spellName}`);
        return 'replaced';
      }
    }
    this.log(`[Spell] Failed to learn/replace: ${spellName}`);
    return 'failed';
  }

  setSpellToReplace(spellName: string) {
    this.spellToReplace = spellName;
    this.log(`[Spell] Set to replace: ${spellName}`);
  }

  handleSpellChoice(chosenSpell?: string): string {
    if (!this.pendingSpell) return 'no_pending_spell';
    let result: string;
    if (!chosenSpell) {
      result = 'kept_current';
    } else {
      result = this.upgradeSpell(this.pendingSpell, chosenSpell);
    }
    this.pendingSpell = undefined;
    this.log(`[Spell] Choice handled: ${result}`);
    return result;
  }

  getActiveSpells(): Spell[] {
    return this.spells;
  }

  // --- Logging ---

  private log(msg: string) {
    console.log(`[Player] ${msg}`);
  }

  private logState(context: string) {
    console.log(`[Player] ${context} | Level: ${this.level}, XP: ${this.xp}/${this.xpForNextLevel}, HP: ${this.health}/${this.maxHealth}, Mana: ${this.mana}/${this.maxMana}, Spells: ${this.spells.length}`);
  }
}
