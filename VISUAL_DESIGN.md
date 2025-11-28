# Arcane Gamemaster - Visual Design Specification

## Design Philosophy

The visual design should evoke the feeling of sitting at a candlelit table in a medieval tavern, with ancient tomes, weathered maps, and mystical artifacts. The UI should feel like a magical artifact itself - ornate but functional, mysterious but readable.

**Core Aesthetic**: Dark fantasy with warm candlelight accents, aged parchment textures, ornate gold filigree, and mystical glowing elements.

---

## Color Palette (Already Configured)

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Gold | #C4A35A | Headers, accents, buttons, borders |
| Secondary Burgundy | #6B1C23 | Danger, blood/damage, emphasis |
| Tertiary Blue | #1E4D6B | Magic, mana, information |
| Background Dark | #1A1714 | Main background |
| Surface Brown | #2D241E | Cards, panels |
| Parchment | #F4E4BC | Text, light elements |
| Ember Red | #CF6679 | Errors, critical damage |
| Forest Green | #4CAF50 | Success, healing |
| Amber | #FFC107 | Warnings, gold currency |

---

## Required Assets

### 1. BACKGROUND TEXTURES

#### 1.1 Main Background Texture
- **File**: `public/textures/dark-wood-bg.jpg`
- **Size**: 1920x1080px (tileable)
- **Description**: Dark aged wood grain texture. Should look like the surface of an ancient oak table in a dimly lit tavern. Subtle grain patterns, some darker knots and imperfections. Color should blend with #1A1714.
- **Style**: Photorealistic or high-quality painterly
- **Opacity when used**: 10-20% overlay on background

#### 1.2 Parchment Texture
- **File**: `public/textures/parchment.jpg`
- **Size**: 800x800px (tileable)
- **Description**: Aged, yellowed parchment/vellum texture. Slightly wrinkled, with subtle fiber patterns and age spots. Should have uneven edges feel. Color should complement #F4E4BC.
- **Usage**: Behind narrative text, character sheets, message bubbles
- **Style**: Realistic aged paper

#### 1.3 Leather Texture
- **File**: `public/textures/leather.jpg`
- **Size**: 600x600px (tileable)
- **Description**: Dark brown tooled leather texture, like the cover of an ancient grimoire. Subtle embossed pattern, worn in places.
- **Usage**: Sidebar backgrounds, panel headers
- **Style**: Rich, warm brown tones

#### 1.4 Stone Texture
- **File**: `public/textures/stone.jpg`
- **Size**: 600x600px (tileable)
- **Description**: Dark grey dungeon stone texture. Rough hewn, with mortar lines suggesting large blocks.
- **Usage**: Combat overlay background, dungeon-themed areas
- **Style**: Dark and moody

---

### 2. DECORATIVE BORDERS & FRAMES

#### 2.1 Ornate Gold Frame - Large
- **File**: `public/frames/gold-frame-large.png`
- **Size**: 1200x800px with transparency
- **Description**: Elaborate gold filigree frame with Celtic/medieval knotwork patterns. Corner pieces should have flourishes. Interior should be transparent. Frame thickness ~40px.
- **Usage**: Main content cards, character sheets, campaign cards
- **Style**: Ornate metallic gold with slight 3D beveling

#### 2.2 Ornate Gold Frame - Medium
- **File**: `public/frames/gold-frame-medium.png`
- **Size**: 600x400px with transparency
- **Description**: Simpler version of large frame. Corner accents with connecting lines.
- **Usage**: Stat blocks, inventory panels, smaller cards
- **Style**: Matching large frame but less elaborate

#### 2.3 Ornate Gold Frame - Small
- **File**: `public/frames/gold-frame-small.png`
- **Size**: 300x200px with transparency
- **Description**: Minimal corner brackets with simple connecting lines.
- **Usage**: Buttons, badges, small info panels
- **Style**: Clean, elegant

#### 2.4 Scroll Frame
- **File**: `public/frames/scroll-frame.png`
- **Size**: 800x1000px with transparency
- **Description**: Unfurled scroll with rolled edges at top and bottom. Interior parchment-colored but mostly transparent for content overlay.
- **Usage**: Quest logs, spell descriptions, lore text
- **Style**: Aged parchment scroll with wooden rollers

#### 2.5 Combat Initiative Frame
- **File**: `public/frames/initiative-frame.png`
- **Size**: 400x800px with transparency
- **Description**: Vertical banner/pennant shape with torn edges at bottom. Medieval heraldic style.
- **Usage**: Initiative tracker sidebar
- **Style**: Weathered fabric/banner look

---

### 3. CORNER ORNAMENTS

#### 3.1 Gold Corner Flourish
- **File**: `public/ornaments/corner-gold.png`
- **Size**: 150x150px with transparency
- **Description**: Single corner ornament - intricate gold filigree with leaf/vine motifs. Should work when rotated for all 4 corners.
- **Usage**: Card corners, section dividers
- **Style**: Vector-clean but with metallic texture

#### 3.2 Dragon Corner
- **File**: `public/ornaments/corner-dragon.png`
- **Size**: 200x200px with transparency
- **Description**: Stylized dragon head in corner, body curves along edges. Gold/bronze metallic.
- **Usage**: Premium/important content frames
- **Style**: Medieval heraldic dragon design

#### 3.3 Sword Divider
- **File**: `public/ornaments/divider-sword.png`
- **Size**: 600x50px with transparency
- **Description**: Horizontal divider with crossed swords in center, decorative lines extending to sides.
- **Usage**: Section separators
- **Style**: Metallic, slightly worn

---

### 4. ICONS - UI ELEMENTS

#### 4.1 D20 Die Icon
- **File**: `public/icons/d20.png`
- **Size**: 64x64px with transparency
- **Description**: Iconic 20-sided die, showing the "20" face. Slight 3D perspective. Gold/amber color with dark shadows.
- **Usage**: Dice roll indicators, roll buttons
- **Style**: Clean with subtle shading

#### 4.2 Complete Dice Set
- **Files**: `public/icons/d4.png`, `d6.png`, `d8.png`, `d10.png`, `d12.png`, `d20.png`, `d100.png`
- **Size**: 48x48px each with transparency
- **Description**: Full set of polyhedral dice. Each showing a representative number. Matching gold/amber style.
- **Usage**: Damage type indicators, dice selection
- **Style**: Consistent set, clean iconography

#### 4.3 Condition Icons (14 total)
- **Files**: `public/icons/conditions/blinded.png`, `charmed.png`, `deafened.png`, `frightened.png`, `grappled.png`, `incapacitated.png`, `invisible.png`, `paralyzed.png`, `petrified.png`, `poisoned.png`, `prone.png`, `restrained.png`, `stunned.png`, `unconscious.png`
- **Size**: 32x32px each with transparency
- **Description**: 
  - **Blinded**: Crossed-out eye
  - **Charmed**: Pink heart with sparkles
  - **Deafened**: Crossed-out ear
  - **Frightened**: Fearful face or ghost
  - **Grappled**: Grabbing hand/tentacle
  - **Incapacitated**: Dizzy spiral
  - **Invisible**: Dotted outline figure
  - **Paralyzed**: Lightning bolt through figure
  - **Petrified**: Stone texture figure
  - **Poisoned**: Green skull with drip
  - **Prone**: Fallen figure
  - **Restrained**: Chains
  - **Stunned**: Stars around head
  - **Unconscious**: Closed eyes, "Zzz"
- **Style**: Simple, readable at small size, distinct colors per condition

#### 4.4 Class Icons (12 total)
- **Files**: `public/icons/classes/barbarian.png`, `bard.png`, `cleric.png`, `druid.png`, `fighter.png`, `monk.png`, `paladin.png`, `ranger.png`, `rogue.png`, `sorcerer.png`, `warlock.png`, `wizard.png`
- **Size**: 64x64px each with transparency
- **Description**: Iconic symbol for each D&D class
  - **Barbarian**: Crossed axes or horned helmet
  - **Bard**: Lute or musical notes
  - **Cleric**: Holy symbol/sunburst
  - **Druid**: Oak leaf or animal silhouette
  - **Fighter**: Sword and shield
  - **Monk**: Open palm or yin-yang
  - **Paladin**: Radiant sword
  - **Ranger**: Bow with arrow
  - **Rogue**: Crossed daggers
  - **Sorcerer**: Magical flame/orb
  - **Warlock**: Eye with tentacles or dark pact symbol
  - **Wizard**: Pointed hat or spellbook
- **Style**: Silhouette style with gold accent, works on dark backgrounds

#### 4.5 Action Icons
- **Files**: `public/icons/actions/attack.png`, `spell.png`, `dash.png`, `dodge.png`, `disengage.png`, `hide.png`, `help.png`, `ready.png`, `search.png`, `use-item.png`
- **Size**: 40x40px each with transparency
- **Description**: Quick action button icons
  - **Attack**: Sword swing arc
  - **Spell**: Magic sparkle/star
  - **Dash**: Running figure
  - **Dodge**: Figure with motion blur
  - **Disengage**: Figure backing away
  - **Hide**: Figure behind cover
  - **Help**: Two figures together
  - **Ready**: Hourglass or clock
  - **Search**: Magnifying glass
  - **Use Item**: Hand holding potion
- **Style**: Simple line art, works at small sizes

#### 4.6 Damage Type Icons (13 total)
- **Files**: `public/icons/damage/slashing.png`, `piercing.png`, `bludgeoning.png`, `fire.png`, `cold.png`, `lightning.png`, `thunder.png`, `acid.png`, `poison.png`, `necrotic.png`, `radiant.png`, `force.png`, `psychic.png`
- **Size**: 24x24px each with transparency
- **Description**: Small icons for damage types
  - **Slashing**: Diagonal slash marks
  - **Piercing**: Arrow point
  - **Bludgeoning**: Hammer impact
  - **Fire**: Flame
  - **Cold**: Snowflake
  - **Lightning**: Lightning bolt
  - **Thunder**: Sound waves
  - **Acid**: Dripping droplet
  - **Poison**: Skull with crossbones
  - **Necrotic**: Withered hand/skull
  - **Radiant**: Sunburst
  - **Force**: Purple energy burst
  - **Psychic**: Brain with waves
- **Style**: Color-coded, immediately recognizable

---

### 5. CHARACTER & CREATURE PORTRAITS

#### 5.1 Race Portraits (9 total)
- **Files**: `public/portraits/races/human.png`, `elf.png`, `dwarf.png`, `halfling.png`, `dragonborn.png`, `gnome.png`, `half-elf.png`, `half-orc.png`, `tiefling.png`
- **Size**: 256x256px with transparency
- **Description**: Representative portrait for each race. Neutral expression, front-facing, showing distinctive racial features.
  - **Human**: Average human adventurer
  - **Elf**: Pointed ears, angular features, ethereal beauty
  - **Dwarf**: Broad face, prominent beard, sturdy
  - **Halfling**: Small, cheerful, curly hair
  - **Dragonborn**: Draconic head, scales, no hair
  - **Gnome**: Small, large eyes, wild hair
  - **Half-Elf**: Mix of human and elven features
  - **Half-Orc**: Greenish skin, tusks, strong jaw
  - **Tiefling**: Horns, unusual skin color, tail visible
- **Style**: Painterly fantasy art, consistent lighting from top-left
- **Background**: Transparent or very subtle vignette

#### 5.2 Default Avatar
- **File**: `public/portraits/default-avatar.png`
- **Size**: 128x128px with transparency
- **Description**: Generic adventurer silhouette with question mark, used before portrait is set.
- **Style**: Dark silhouette with gold border

#### 5.3 Monster Portraits (Common enemies)
- **Files**: `public/portraits/monsters/goblin.png`, `orc.png`, `skeleton.png`, `zombie.png`, `wolf.png`, `bandit.png`, `cultist.png`, `dragon.png`
- **Size**: 128x128px with transparency
- **Description**: Combat token style portraits for common enemy types.
- **Style**: Menacing but clear, works at small sizes in initiative tracker

---

### 6. LOGO & BRANDING

#### 6.1 Main Logo
- **File**: `public/logo/arcane-gamemaster-logo.png`
- **Size**: 600x200px with transparency
- **Description**: "Arcane Gamemaster" text in medieval/fantasy font. Incorporates D20 die as the 'O' in Arcane or as a separate element. Gold text with subtle glow effect. Perhaps a magical aura or rune circle behind.
- **Style**: Elegant, readable, mystical

#### 6.2 Logo Icon
- **File**: `public/logo/arcane-icon.png`
- **Size**: 128x128px with transparency
- **Description**: Simplified icon version - D20 with magical runes or glow. Works as favicon and app icon.
- **Style**: Clean, recognizable at small sizes

#### 6.3 Favicon
- **File**: `public/favicon.ico`
- **Size**: 32x32px and 16x16px
- **Description**: Simplified D20 or magic symbol
- **Style**: Clear at tiny size

---

### 7. UI COMPONENT BACKGROUNDS

#### 7.1 Button Background - Primary
- **File**: `public/ui/button-primary.png`
- **Size**: 200x60px with transparency (9-slice scalable)
- **Description**: Ornate button with beveled gold border, dark interior. Medieval wax seal or metal plate aesthetic.
- **Style**: 3D embossed look, tactile feel

#### 7.2 Button Background - Secondary
- **File**: `public/ui/button-secondary.png`
- **Size**: 200x60px with transparency
- **Description**: Simpler button, leather or wood texture with subtle border.
- **Style**: More subdued than primary

#### 7.3 Input Field Background
- **File**: `public/ui/input-bg.png`
- **Size**: 400x50px with transparency
- **Description**: Slightly recessed area with parchment texture, subtle inner shadow.
- **Style**: Looks like writing area on a form

#### 7.4 Card Background
- **File**: `public/ui/card-bg.png`
- **Size**: 400x300px with transparency
- **Description**: Parchment card with slightly curled corners, subtle shadow.
- **Style**: Physical card/note aesthetic

#### 7.5 Health Bar Frame
- **File**: `public/ui/health-bar-frame.png`
- **Size**: 200x30px with transparency
- **Description**: Ornate horizontal frame for health bars. Gold border with gem/crystal accents on ends.
- **Style**: RPG game UI style

#### 7.6 Health Bar Fill
- **Files**: `public/ui/health-fill-green.png`, `health-fill-yellow.png`, `health-fill-red.png`
- **Size**: 180x20px each
- **Description**: Gradient fill textures for health bar at different HP percentages.
- **Style**: Glowing liquid/energy look

---

### 8. ATMOSPHERIC ELEMENTS

#### 8.1 Candlelight Glow
- **File**: `public/effects/candlelight.png`
- **Size**: 400x400px with transparency
- **Description**: Soft warm orange/yellow radial gradient. Used as overlay to create candlelit atmosphere.
- **Style**: Subtle, warm glow

#### 8.2 Magic Particles
- **File**: `public/effects/magic-particles.png`
- **Size**: 200x200px with transparency
- **Description**: Scattered glowing particles/motes. Gold and blue colors.
- **Usage**: Spell effects, magical areas, loading states
- **Style**: Sparkly, mystical

#### 8.3 Smoke/Mist
- **File**: `public/effects/mist.png`
- **Size**: 800x200px with transparency
- **Description**: Wispy horizontal fog/mist layer.
- **Usage**: Bottom of screens, atmospheric depth
- **Style**: Subtle, doesn't obscure content

#### 8.4 Blood Splatter
- **File**: `public/effects/blood-splatter.png`
- **Size**: 100x100px with transparency
- **Description**: Stylized blood splatter for critical hits/damage.
- **Style**: Not too graphic, stylized

---

### 9. MAP & SPATIAL ELEMENTS

#### 9.1 Grid Tile - Stone Floor
- **File**: `public/map/tile-stone.png`
- **Size**: 64x64px (one grid square)
- **Description**: Stone dungeon floor tile, top-down view.
- **Style**: Consistent with stone texture

#### 9.2 Grid Tile - Wood Floor
- **File**: `public/map/tile-wood.png`
- **Size**: 64x64px
- **Description**: Wooden planks, top-down view.

#### 9.3 Grid Tile - Grass
- **File**: `public/map/tile-grass.png`
- **Size**: 64x64px
- **Description**: Outdoor grass tile.

#### 9.4 Character Token Frame
- **File**: `public/map/token-frame-player.png`
- **Size**: 64x64px with transparency
- **Description**: Circular gold frame for player tokens on map.

#### 9.5 Enemy Token Frame
- **File**: `public/map/token-frame-enemy.png`
- **Size**: 64x64px with transparency
- **Description**: Circular red/dark frame for enemy tokens.

---

## Asset Placement Guide

```
public/
├── favicon.ico                          # Browser favicon
├── logo/
│   ├── arcane-gamemaster-logo.png      # Main logo for headers
│   └── arcane-icon.png                 # Square icon for various uses
├── textures/
│   ├── dark-wood-bg.jpg                # Main app background
│   ├── parchment.jpg                   # Message/card backgrounds
│   ├── leather.jpg                     # Sidebar/panel backgrounds
│   └── stone.jpg                       # Combat/dungeon areas
├── frames/
│   ├── gold-frame-large.png            # Main content frames
│   ├── gold-frame-medium.png           # Secondary frames
│   ├── gold-frame-small.png            # Small element frames
│   ├── scroll-frame.png                # Quest/lore displays
│   └── initiative-frame.png            # Combat tracker
├── ornaments/
│   ├── corner-gold.png                 # Generic corner decoration
│   ├── corner-dragon.png               # Premium corner decoration
│   └── divider-sword.png               # Section dividers
├── icons/
│   ├── d4.png through d100.png         # Dice icons
│   ├── conditions/                      # 14 condition icons
│   │   ├── blinded.png
│   │   ├── charmed.png
│   │   └── ... (all conditions)
│   ├── classes/                         # 12 class icons
│   │   ├── barbarian.png
│   │   └── ... (all classes)
│   ├── actions/                         # 10 action icons
│   │   ├── attack.png
│   │   └── ... (all actions)
│   └── damage/                          # 13 damage type icons
│       ├── fire.png
│       └── ... (all damage types)
├── portraits/
│   ├── default-avatar.png              # Placeholder portrait
│   ├── races/                           # 9 race portraits
│   │   ├── human.png
│   │   └── ... (all races)
│   └── monsters/                        # 8 common monster portraits
│       ├── goblin.png
│       └── ... (common monsters)
├── ui/
│   ├── button-primary.png              # Primary button background
│   ├── button-secondary.png            # Secondary button background
│   ├── input-bg.png                    # Text input background
│   ├── card-bg.png                     # Card background
│   ├── health-bar-frame.png            # HP bar frame
│   ├── health-fill-green.png           # HP fill (high)
│   ├── health-fill-yellow.png          # HP fill (medium)
│   └── health-fill-red.png             # HP fill (low)
├── effects/
│   ├── candlelight.png                 # Warm glow overlay
│   ├── magic-particles.png             # Sparkle effects
│   ├── mist.png                        # Atmospheric fog
│   └── blood-splatter.png              # Damage effect
└── map/
    ├── tile-stone.png                  # Dungeon floor
    ├── tile-wood.png                   # Indoor floor
    ├── tile-grass.png                  # Outdoor ground
    ├── token-frame-player.png          # Player map token
    └── token-frame-enemy.png           # Enemy map token
```

---

## Total Asset Count

| Category | Count |
|----------|-------|
| Textures | 4 |
| Frames | 5 |
| Ornaments | 3 |
| Dice Icons | 7 |
| Condition Icons | 14 |
| Class Icons | 12 |
| Action Icons | 10 |
| Damage Icons | 13 |
| Race Portraits | 9 |
| Monster Portraits | 8 |
| Logo/Branding | 3 |
| UI Components | 8 |
| Effects | 4 |
| Map Elements | 5 |
| **TOTAL** | **105 assets** |

---

## Implementation Priority

### Phase 1 (Critical - Do First)
1. Main logo and favicon
2. Background textures (dark-wood, parchment)
3. Gold frame (large, medium)
4. Corner flourish
5. D20 icon
6. Default avatar
7. Button backgrounds
8. Health bar components

### Phase 2 (Important)
1. All class icons
2. All condition icons
3. Race portraits
4. Scroll frame
5. Divider ornament
6. Input/card backgrounds

### Phase 3 (Enhancement)
1. All damage type icons
2. All action icons
3. Monster portraits
4. Atmospheric effects
5. Map tiles and tokens

---

## CSS Implementation Notes

After assets are generated, update `globals.css`:

```css
/* Background with texture overlay */
body {
  background-color: var(--color-background);
  background-image: url('/textures/dark-wood-bg.jpg');
  background-blend-mode: overlay;
  background-size: cover;
}

/* Parchment card style */
.parchment-card {
  background-image: url('/textures/parchment.jpg');
  background-size: cover;
  border-image: url('/frames/gold-frame-medium.png') 40 fill / 40px / 0 round;
}

/* Ornate button */
.btn-ornate {
  background-image: url('/ui/button-primary.png');
  background-size: 100% 100%;
  border: none;
}
```
