# 3D Chaser Snake (v5 Realistic Wildlife Edition)

A 3D serpentine survival and foraging game featuring third-person chase physics, procedural endless terrain, natural lighting, and varied wild foods.

---

## What's New in v5 (Realistic 3D & Wildlife Forage Pass)

### 1. Varied Natural Food (Replaces Crystals Entirely)
- **Crystals Removed**: All artificial arcade crystals and gem pickups have been completely replaced with organic wild forage.
- **Varied Wild Foods**:
  - **Orchard Apple** (+10 score, +1 length): Classic crisp red apple with organic dimpled curvature, natural wooden stem, and foliage leaf.
  - **Red Apple** (+15 score): Plump wild apple found in fertile groves.
  - **Forest Mushroom** (+30 score): Distinctive boletus mushroom with domed chestnut cap and pale stalk.
  - **Wild Berries** (+45 score): Glossy cluster of forest blackberries and blueberries.
  - **Golden Apple** (+90 score): Rare prized golden fruit with rich earthen luster.
- **HUD & Legend Consistency**: HUD counter now tracks **FOOD** foraged; radar minimap and legend display organic food categories. All crystal terminology and references have been removed.

### 2. Realistic 3D Visual Upgrades
- **Believable Serpent Anatomy**:
  - Slender, aerodynamic triangular viper skull with smooth tapered snout.
  - Reptilian golden irises with dark vertical slit pupils and realistic cornea specular gloss.
  - Lifelike forked tongue with natural rhythmic flickers.
  - Removed cartoon pink horns and arcade spots in favor of an organic forest green and olive serpent palette (`#204a22`, `#2e6330`) with a pale ventral underbelly plate.
- **Connected Movement & Spine Alignment**:
  - Body segments are oriented dynamically along the 3D spline tangent to flow with the curve of movement.
  - Tapered ellipsoid segments create an overlapping, continuous muscular serpent body rather than disconnected floating spheres.
  - Smooth anatomical taper from the neck down to a slender natural tail tip.
  - Subtle procedural reptilian scale bump mapping for natural specular sheen without heavy texture files.
- **Natural Atmosphere & Lighting**:
  - Soft directional sunlight (`0xfffaec`) calibrated with PCF soft shadow mapping and normal bias.
  - Balanced sky hemisphere ambient bounce (powder blue sky + warm ground bounce).
  - Realistic atmospheric horizon haze gradient and drifting soft cumulus clouds.
- **Detailed Ground & Restrained Vegetation**:
  - Procedural meadow ground with seamless organic turf and grass blade noise.
  - Swaying tall grass with vertex wind physics and real-time serpent collision parting.
  - Earthy weathered granite boulders, mossy monoliths, and wild clover blooms.
  - Realistic terrain zones: murky peat wetland (swamp), savannah tall grass (conceals snake), and rocky river crags.

### 3. Optimized UI Layout
- **Modern Glassmorphic HUD**: High-contrast, translucent frosted-glass badges with crisp iconography and real-time metrics for Score, Length, and Food.
- **Radar Minimap**: Sleek circular compass radar indicating player heading, terrain regions, obstacles, and natural forage markers.
- **Dynamic Status Badges**: Floating alerts for Speed Surge, Growth, and Terrain Slowdown.
- **Vignette Immersion**: Soft ambient foliage vignette when navigating deep tall grass fields.
- **Refined Game Over Card**: Detailed breakdown with score, length, foraged foods, and responsive replay controls.

---

## Controls

| Key | Action |
| --- | --- |
| **A / Left Arrow** | Turn Left |
| **D / Right Arrow** | Turn Right |
| **W / Up Arrow** | Accelerate Pace |
| **S / Down Arrow** | Slow Pace |
| **Space / Enter** | Restart Game after Game Over |

---

## Pickups & Effects Guide

| Item | Model | Effect |
| --- | --- | --- |
| **Orchard Apple** | Crisp Red Apple with Stem & Leaf | +10 Score, +1 Body Length |
| **Wild Red Apple** | Fresh Wild Apple | +15 Score |
| **Forest Mushroom** | Domed Boletus Cap & Stalk | +30 Score |
| **Wild Berries** | Plump Dark Berry Cluster | +45 Score |
| **Golden Apple** | Rare Golden Fruit | +90 Score |
| **Sun Surge (Power-up)** | Amber Sun Totem | +25 Score, 4.5s Speed Surge (1.45×) |
| **Life Seed (Power-up)** | Emerald Flora Orb | +25 Score, +3 Gradual Segments |

---

## Terrain Zones

- **Normal Meadow**: Standard smooth ground with short tufts and wild clover.
- **Swamp (-50% Speed)**: Murky wetland with peat soil, water puddles, and reeds.
- **Tall Grass (-40% Speed)**: Lush 2-3 unit tall grass blades that sway in the wind, conceal the serpent, and cast edge vignette.
- **Rocky (-35% Speed)**: Weathered granite boulders and crags with stone pebbles.

---

## Project Structure (ZIP Archive Contents)

- `index.html`: Optimized standalone web entry point loading Three.js and the modern UI layout.
- `style.css`: Clean, responsive stylesheet with glassmorphic HUD, radar radar, status badges, and typography.
- `game.js`: Pure Three.js game engine containing the realistic serpent rendering, procedural world generator, and wild food mechanics.
- `README.md`: Complete documentation and changelog.

## How to Run

1. Extract the `.zip` archive.
2. Open `index.html` in any modern web browser (Google Chrome, Mozilla Firefox, Safari, Microsoft Edge).
3. Internet access is needed to load the Three.js r128 CDN script.
