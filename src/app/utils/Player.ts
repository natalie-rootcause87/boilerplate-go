import { SPECIAL_ITEMS, Item } from './Items';

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
  items: Item[];

  constructor() {
    this.health = this.maxHealth = 100;
    this.maxMana = 10;
    this.mana = 0;
    this.level = 1;
    this.xp = 0;
    this.xpForNextLevel = this.calculateXpForNextLevel(this.level);
    this.spells = [];
    this.pendingSpellLevel = 1;
    this.items = this.loadPersistentItems();
    this.logState('Initialized');
  }

  private loadPersistentItems(): Item[] {
    if (typeof window !== 'undefined') {
      const highestLevel = parseInt(localStorage.getItem('highestLevel') || '1');
      if (highestLevel >= 3) {
        return [SPECIAL_ITEMS.donut_crown];
      }
    }
    return [];
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

    // Check for level 3 reward and update highest level
    if (typeof window !== 'undefined') {
      const currentHighestLevel = parseInt(localStorage.getItem('highestLevel') || '1');
      if (this.level > currentHighestLevel) {
        localStorage.setItem('highestLevel', this.level.toString());
      }
      
      // Give level 3 reward if just reached level 3
      if (this.level === 3 && currentHighestLevel < 3) {
        this.items.push(SPECIAL_ITEMS.donut_crown);
        this.log(`[Item] Received the ${SPECIAL_ITEMS.donut_crown.name}! ${SPECIAL_ITEMS.donut_crown.description}`);
      }
    }
  }

  private calculateXpForNextLevel(level: number): number {
    return Math.floor(10 * Math.pow(3, level - 1));
  }

  // --- Health & Mana ---

  gainMana(amount: number) {
    // Apply mana regeneration bonus from items
    if (this.items.some(item => item.effect === 'mana_regen')) {
      amount += 2; // Donut Crown effect
    }
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
    
    // If we have space for more spells, learn it directly
    if (this.spells.length < this.level) {
      result = this.upgradeSpell(this.pendingSpell);
    } else if (!chosenSpell) {
      // No space and no spell chosen to replace
      result = 'kept_current';
    } else {
      // Replace chosen spell with new spell
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

  private log(message: string) {
    console.log(`[Player] ${message}`);
  }

  private logState(context: string) {
    console.log(`[Player] ${context} | Level: ${this.level}, XP: ${this.xp}/${this.xpForNextLevel}, HP: ${this.health}/${this.maxHealth}, Mana: ${this.mana}/${this.maxMana}, Spells: ${this.spells.length}, Items: ${this.items.length}`);
  }
}
