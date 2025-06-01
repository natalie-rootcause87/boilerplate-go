export interface Item {
  name: string;
  description: string;
  effect: string;
  icon: string;
}

export const SPECIAL_ITEMS: { [key: string]: Item } = {
  'donut_crown': {
    name: 'Donut Crown',
    description: 'A crown made of crystallized sugar, earned by reaching level 3. Grants +2 mana regeneration per turn.',
    effect: 'mana_regen',
    icon: '👑'
  }
}; 