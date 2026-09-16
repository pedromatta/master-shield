/**
 * Icon catalogue for the whole app. Two families are supported:
 *
 * - `ra` — RPG Awesome glyphs (font-based, fantasy/RPG themed). Rendered as `<i class="ra ra-*">`.
 * - `lu` — Lucide Angular components (stroke SVG, UI/general purpose). Rendered as a component.
 *
 * Anything the GM picks is stored on the entity as an `iconId` string:
 * `ra:crossed-swords`, `lu:shield`, etc. Legacy emoji strings are mapped through
 * {@link LEGACY_EMOJI_ICONS} so existing data keeps rendering.
 */

export type IconFamily = 'ra' | 'lu';

export interface IconOption {
  /** Canonical id, e.g. `ra:crossed-swords` or `lu:shield`. */
  readonly id: string;
  readonly family: IconFamily;
  /** RPG Awesome class suffix or Lucide component key. */
  readonly name: string;
  /** Human-readable label for pickers and screen readers. */
  readonly label: string;
  /** Grouping used to organise the picker. */
  readonly group: string;
}

/**
 * Curated RPG Awesome glyphs, grouped so the picker stays navigable. The full set has
 * ~500 icons; this selection covers the entities the shield models.
 */
export const RPG_ICONS: readonly IconOption[] = [
  // People & creatures
  ...ra('person', 'Person', 'People'),
  ...ra('player', 'Player', 'People'),
  ...ra('hood', 'Hood', 'People'),
  ...ra('wizard-face', 'Wizard', 'People'),
  ...ra('elf-helmet', 'Elf', 'People'),
  ...ra('dwarf-face', 'Dwarf', 'People'),
  ...ra('orc-head', 'Orc', 'People'),
  ...ra('goblin-head', 'Goblin', 'People'),
  ...ra('troll', 'Troll', 'People'),
  ...ra('dragon-head', 'Dragon', 'People'),
  ...ra('beast-eye', 'Beast', 'People'),
  ...ra('wolf-head', 'Wolf', 'People'),
  ...ra('spider-alt', 'Spider', 'People'),
  ...ra('snake', 'Snake', 'People'),
  ...ra('bat-wing', 'Bat', 'People'),
  ...ra('skull', 'Skull', 'People'),
  ...ra('ghost', 'Ghost', 'People'),
  ...ra('angel-wings', 'Angel', 'People'),
  ...ra('daemon-skull', 'Demon', 'People'),
  ...ra('hydra', 'Hydra', 'People'),
  ...ra('minotaur', 'Minotaur', 'People'),
  ...ra('cyclops', 'Cyclops', 'People'),
  ...ra('beholder', 'Beholder', 'People'),

  // Combat & items
  ...ra('crossed-swords', 'Swords', 'Combat'),
  ...ra('sword', 'Sword', 'Combat'),
  ...ra('axe', 'Axe', 'Combat'),
  ...ra('axe-swing', 'Axe Swing', 'Combat'),
  ...ra('hammer', 'Hammer', 'Combat'),
  ...ra('warhammer', 'Warhammer', 'Combat'),
  ...ra('bow-arrow', 'Bow', 'Combat'),
  ...ra('crossbow', 'Crossbow', 'Combat'),
  ...ra('dagger', 'Dagger', 'Combat'),
  ...ra('spear', 'Spear', 'Combat'),
  ...ra('staff', 'Staff', 'Combat'),
  ...ra('wand', 'Wand', 'Combat'),
  ...ra('shield', 'Shield', 'Combat'),
  ...ra('shield-reflect', 'Shield Reflect', 'Combat'),
  ...ra('breastplate', 'Armour', 'Combat'),
  ...ra('helmet', 'Helmet', 'Combat'),
  ...ra('battle-axe', 'Battle Axe', 'Combat'),
  ...ra('arrow-cluster', 'Arrows', 'Combat'),
  ...ra('bomb', 'Bomb', 'Combat'),
  ...ra('barbed-arrow', 'Barbed Arrow', 'Combat'),

  // Magic & arcane
  ...ra('magic-swirl', 'Magic', 'Magic'),
  ...ra('spell-book', 'Spell Book', 'Magic'),
  ...ra('book-cover', 'Tome', 'Magic'),
  ...ra('crystal-ball', 'Crystal Ball', 'Magic'),
  ...ra('crystal-cluster', 'Crystals', 'Magic'),
  ...ra('scroll-unfurled', 'Scroll', 'Magic'),
  ...ra('rune-sword', 'Rune Sword', 'Magic'),
  ...ra('fairy-wand', 'Fairy Wand', 'Magic'),
  ...ra('pentacle', 'Pentacle', 'Magic'),
  ...ra('ankh', 'Ankh', 'Magic'),
  ...ra('orb-wand', 'Orb', 'Magic'),
  ...ra('aura', 'Aura', 'Magic'),
  ...ra('flame', 'Flame', 'Magic'),
  ...ra('ice-bolt', 'Ice', 'Magic'),
  ...ra('lightning-bolt', 'Lightning', 'Magic'),
  ...ra('water-drop', 'Water', 'Magic'),
  ...ra('stone-sphere', 'Earth', 'Magic'),
  ...ra('wind-slap', 'Wind', 'Magic'),
  ...ra('poison-cloud', 'Poison', 'Magic'),
  ...ra('holy-symbol', 'Holy Symbol', 'Magic'),

  // Places & travel
  ...ra('castle', 'Castle', 'Places'),
  ...ra('castle-emblem', 'Fortress', 'Places'),
  ...ra('tower', 'Tower', 'Places'),
  ...ra('village', 'Village', 'Places'),
  ...ra('hut', 'Hut', 'Places'),
  ...ra('forest', 'Forest', 'Places'),
  ...ra('mountains', 'Mountains', 'Places'),
  ...ra('mountain-cave', 'Cave', 'Places'),
  ...ra('cave-entrance', 'Cave Entrance', 'Places'),
  ...ra('desert', 'Desert', 'Places'),
  ...ra('island', 'Island', 'Places'),
  ...ra('harbor', 'Harbour', 'Places'),
  ...ra('bridge', 'Bridge', 'Places'),
  ...ra('campfire', 'Camp', 'Places'),
  ...ra('tent', 'Tent', 'Places'),
  ...ra('dungeon-gate', 'Dungeon', 'Places'),
  ...ra('treasure-map', 'Map', 'Places'),
  ...ra('compass', 'Compass', 'Places'),
  ...ra('world', 'World', 'Places'),
  ...ra('portal', 'Portal', 'Places'),
  ...ra('ruins', 'Ruins', 'Places'),
  ...ra('watchtower', 'Watchtower', 'Places'),

  // Treasure & tools
  ...ra('treasure-map', 'Treasure Map', 'Items'),
  ...ra('coins', 'Coins', 'Items'),
  ...ra('coin', 'Coin', 'Items'),
  ...ra('gem', 'Gem', 'Items'),
  ...ra('cut-diamond', 'Diamond', 'Items'),
  ...ra('ring', 'Ring', 'Items'),
  ...ra('amulet', 'Amulet', 'Items'),
  ...ra('crown', 'Crown', 'Items'),
  ...ra('crown-coin', 'Crown Coin', 'Items'),
  ...ra('key', 'Key', 'Items'),
  ...ra('locked-fortress', 'Locked', 'Items'),
  ...ra('padlock', 'Padlock', 'Items'),
  ...ra('potion-ball', 'Potion', 'Items'),
  ...ra('round-potion', 'Potion Flask', 'Items'),
  ...ra('health-potion', 'Health Potion', 'Items'),
  ...ra('backpack', 'Backpack', 'Items'),
  ...ra('book', 'Book', 'Items'),
  ...ra('scroll', 'Scroll', 'Items'),
  ...ra('quill-ink', 'Quill', 'Items'),
  ...ra('torch', 'Torch', 'Items'),
  ...ra('lantern-flame', 'Lantern', 'Items'),
  ...ra('rope-coil', 'Rope', 'Items'),
  ...ra('blacksmith', 'Forge', 'Items'),

  // Nature & misc
  ...ra('leaf', 'Leaf', 'Nature'),
  ...ra('oak', 'Oak', 'Nature'),
  ...ra('wheat', 'Wheat', 'Nature'),
  ...ra('flower', 'Flower', 'Nature'),
  ...ra('sun', 'Sun', 'Nature'),
  ...ra('moon', 'Moon', 'Nature'),
  ...ra('star', 'Star', 'Nature'),
  ...ra('star-formation', 'Constellation', 'Nature'),
  ...ra('eclipse', 'Eclipse', 'Nature'),
  ...ra('bird-claw', 'Claw', 'Nature'),
  ...ra('paw-print', 'Paw', 'Nature'),
  ...ra('feather-wing', 'Feather', 'Nature'),
  ...ra('eye-monster', 'Eye', 'Nature'),
  ...ra('clockwork', 'Clockwork', 'Nature'),
  ...ra('gear-hammer', 'Gear', 'Nature'),
  ...ra('battered-axe', 'Worn Axe', 'Nature'),
];

function ra(name: string, label: string, group: string): IconOption[] {
  return [{ id: `ra:${name}`, family: 'ra', name, label, group }];
}

/**
 * Lucide icons used across the UI chrome (buttons, status, navigation). These are picked as
 * concrete components by {@link IconComponent}; the name is the Lucide export without the
 * `Lucide` prefix, lower-cased.
 */
export const LUCIDE_ICONS: readonly IconOption[] = [
  ...lu('swords', 'Swords', 'Combat'),
  ...lu('sword', 'Sword', 'Combat'),
  ...lu('shield', 'Shield', 'Combat'),
  ...lu('axes', 'Axes', 'Combat'),
  ...lu('target', 'Target', 'Combat'),
  ...lu('crosshair', 'Crosshair', 'Combat'),
  ...lu('flame', 'Flame', 'Magic'),
  ...lu('sparkles', 'Sparkles', 'Magic'),
  ...lu('wand-sparkles', 'Wand', 'Magic'),
  ...lu('zap', 'Zap', 'Magic'),
  ...lu('snowflake', 'Snowflake', 'Magic'),
  ...lu('droplet', 'Droplet', 'Magic'),
  ...lu('leaf', 'Leaf', 'Magic'),
  ...lu('skull', 'Skull', 'People'),
  ...lu('ghost', 'Ghost', 'People'),
  ...lu('user', 'User', 'People'),
  ...lu('users', 'Users', 'People'),
  ...lu('user-round', 'Person', 'People'),
  ...lu('bot', 'Construct', 'People'),
  ...lu('crown', 'Crown', 'People'),
  ...lu('map', 'Map', 'Places'),
  ...lu('map-pin', 'Location', 'Places'),
  ...lu('castle', 'Castle', 'Places'),
  ...lu('tent', 'Camp', 'Places'),
  ...lu('mountain', 'Mountain', 'Places'),
  ...lu('trees', 'Forest', 'Places'),
  ...lu('house', 'House', 'Places'),
  ...lu('compass', 'Compass', 'Places'),
  ...lu('book', 'Book', 'Items'),
  ...lu('book-open', 'Book Open', 'Items'),
  ...lu('scroll', 'Scroll', 'Items'),
  ...lu('gem', 'Gem', 'Items'),
  ...lu('coins', 'Coins', 'Items'),
  ...lu('key', 'Key', 'Items'),
  ...lu('lock', 'Lock', 'Items'),
  ...lu('backpack', 'Backpack', 'Items'),
  ...lu('flask-conical', 'Flask', 'Items'),
  ...lu('heart', 'Heart', 'Status'),
  ...lu('heart-pulse', 'Vitality', 'Status'),
  ...lu('activity', 'Activity', 'Status'),
  ...lu('star', 'Star', 'Status'),
  ...lu('eye', 'Eye', 'Status'),
  ...lu('bell', 'Alert', 'Status'),
  ...lu('folder', 'Folder', 'Organisation'),
  ...lu('tags', 'Tags', 'Organisation'),
  ...lu('notebook', 'Notebook', 'Organisation'),
  ...lu('file-text', 'Note', 'Organisation'),
  ...lu('list', 'List', 'Organisation'),
  ...lu('grid', 'Grid', 'Organisation'),
  ...lu('clock', 'Clock', 'Organisation'),
  ...lu('calendar', 'Calendar', 'Organisation'),
  ...lu('dices', 'Dice', 'Organisation'),
  ...lu('puzzle', 'Puzzle', 'Organisation'),
  ...lu('package', 'Package', 'Organisation'),
  ...lu('layers', 'Layers', 'Organisation'),
];

function lu(name: string, label: string, group: string): IconOption[] {
  return [{ id: `lu:${name}`, family: 'lu', name, label, group }];
}

/** Everything the picker can offer. */
export const ALL_ICONS: readonly IconOption[] = [...RPG_ICONS, ...LUCIDE_ICONS];

/** Icon id used when an entity has no explicit choice. */
export const DEFAULT_ICON_ID = 'lu:user';

/**
 * Legacy emoji → icon id, so entities authored before the icon system keep rendering.
 */
export const LEGACY_EMOJI_ICONS: Readonly<Record<string, string>> = {
  '🧝': 'ra:hood',
  '👹': 'ra:monster-skull',
  '👺': 'ra:broken-skull',
  '🐉': 'ra:dragon',
  '💀': 'ra:skull',
  '👻': 'ra:eye-monster',
  '🐺': 'ra:wolf-head',
  '🕷️': 'ra:spider-face',
  '🦇': 'ra:batwings',
  '🧙': 'ra:crystal-wand',
  '⚔️': 'ra:crossed-swords',
  '⚔': 'ra:crossed-swords',
  '🗡️': 'ra:plain-dagger',
  '🛡️': 'ra:shield',
  '🏹': 'ra:crossbow',
  '🪄': 'ra:fairy-wand',
  '✨': 'lu:sparkles',
  '🔥': 'ra:flame-symbol',
  '❄️': 'ra:ice-cube',
  '⚡': 'ra:lightning-bolt',
  '📖': 'ra:scroll-unfurled',
  '📚': 'ra:book',
  '📝': 'lu:notebook',
  '📄': 'lu:file-text',
  '🗂️': 'lu:folder',
  '🏰': 'lu:castle',
  '🗺️': 'lu:map',
  '🧭': 'lu:compass',
  '⏳': 'lu:clock',
  '📅': 'lu:calendar',
  '👥': 'lu:users',
  '👤': 'lu:user',
  '✎': 'lu:pencil',
  '✕': 'lu:x',
  '📌': 'lu:pin',
};

/**
 * Normalises any stored icon value into a renderable icon id. Accepts a canonical id,
 * a legacy emoji, or an empty value (falls back to a family default).
 */
export function resolveIconId(value: string | null | undefined, fallback = DEFAULT_ICON_ID): string {
  if (!value) return fallback;
  if (value.startsWith('ra:') || value.startsWith('lu:')) return value;
  return LEGACY_EMOJI_ICONS[value] ?? fallback;
}
