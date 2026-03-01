# Forage — Asset Spec for Cofounder
> Design brief based on confirmed game design decisions. Build these assets and hand off as PNG spritesheets or SVG.

---

## Game Flow (Context for Designer)

```
Forage discovers vendors
        ↓
Vendors wait INSIDE HQ (not on map)
        ↓
Vendor replies → 🔔 Notification bell in HUD
        ↓
Player walks into HQ → sees batch review list → approves/rejects
        ↓
Approved vendor: CUTSCENE — walks from HQ to empty lot → house builds
        ↓
NPC lives in village, wanders near their house
        ↓
Deal closed → ⭐ Gold star appears on their house
```

---

## 1. Buildings

### 1a. HQ (Town Hall)
The central building. Forage agent lives here. Vendors wait inside before approval.

| State | Description |
|-------|-------------|
| **Exterior — default** | Cozy town hall, warm lighting, green roof, wooden sign "HQ" |
| **Exterior — vendors waiting** | Light on inside, silhouettes visible through window, small "!" badge on door |
| **Exterior — new reply** | Mailbox flag up outside |

**Animations:**
- Chimney smoke idle loop
- Window light flicker (warm, subtle)
- Door open/close when player enters (2-frame)

---

### 1b. Animal Houses (10 types)
Each vendor gets a house styled after their animal type. Same function, different aesthetic.

| Animal | House Style |
|--------|------------|
| 🦊 Fox | Clever urban den — brick, arched doorway, smart letterbox |
| 🦝 Raccoon | Cozy cabin — timber, mismatched windows, little porch |
| 🐻 Bear | Big log cabin — chunky, wide, stone chimney |
| 🐸 Frog | Lily pad cottage — round, green roof, sits slightly low |
| 🐰 Rabbit | Burrow cottage — small, round door in a grassy mound |
| 🐿️ Squirrel | Treehouse — elevated, rope ladder, built into a tree trunk |
| 🦌 Deer | Elegant cottage — tall, white walls, flower window boxes |
| 🦉 Owl | Stone tower — cylindrical, ivy-covered, lantern at top |
| 🦔 Hedgehog | Neat bungalow — tidy garden, small fence, very orderly |
| 🐱 Cat | Stylish modern — flat roof, big windows, minimalist |

**Each house needs 2 states:**
- **Base state** — moved in, active
- **Gold star state** — deal closed, ⭐ flag on roof, warm glow, small bunting

**Animations (per house):**
- Idle: subtle smoke/light flicker loop (~4 frames)
- Build: construction sequence — empty lot → foundation → walls → roof → done (~8 frames, plays once on move-in)
- Star appear: ⭐ flag pops up, small sparkle burst (~4 frames, plays once on deal close)

---

### 1c. Empty Lot
Where a house will be built. Appears on the map as soon as a vendor is approved but before the cutscene completes.

- Wooden stakes in ground with string boundary
- Small sign: "[Animal emoji] Coming soon!"
- No animation needed

---

## 2. NPC Characters (10 animals)

Every animal needs the following animation states. Style: top-down slight angle (like ACNH), cute + round, ~64×64px or ~96×96px sprite.

| Animation | Frames | Description |
|-----------|--------|-------------|
| **Idle** | 4 | Subtle body bob, blink every ~3s |
| **Walk** | 6–8 | Walk cycle, left/right (mirror for direction) |
| **Wave** | 6 | Arm raises and waves — greeting player |
| **Arrive** | 10–12 | Walk in from off-screen, stop, look around, wave — plays once on move-in |
| **Cheer** | 6 | Jump + arms up — plays on deal close |
| **Sad/Dead** | 4 | Slumped, slow bob, greyscale — vendor went cold |
| **Talk** | 4 | Mouth open/close — plays during dialogue typewriter |

**10 animals:** Fox, Raccoon, Bear, Frog, Rabbit, Squirrel, Deer, Owl, Hedgehog, Cat

**Total NPC sprites:** 10 animals × 7 states = 70 animation sequences

---

## 3. Forage Agent (Mascot)

The Forage agent lives in HQ. Represents the AI. Has a distinct look — leaf-themed, friendly, slightly magical.

**Design direction:** Small creature with a leaf on its head, glowing green eyes, warm and approachable. Think: a forest spirit that works as a real estate agent.

| Animation | Frames | Description |
|-----------|--------|-------------|
| **Idle** | 4 | Leaf sways, soft glow pulse |
| **Talk** | 4 | Bounces while speaking, leaf waves |
| **Think** | 6 | Taps chin, leaf droops, thinking expression |
| **Excited** | 6 | Spins, sparkles burst off — "Found vendors!" |
| **Point** | 4 | Points toward HQ interior / vendor list |

---

## 4. UI Elements

### 4a. Notification Bell (HUD top-right)
- Bell icon — default state (no notifications)
- Bell icon — active state with badge number (🔔 + red circle with count)
- Bell ring animation: 3-frame shake when new notification arrives

### 4b. Dialogue Box
- ACNH-style bottom panel (cream, thick green border, rounded corners)
- NPC name plate: colored pill matching animal color, sits top-left of panel
- Typewriter cursor: blinking `▌`

### 4c. HQ Interior — Batch Review Screen
- Warm interior backdrop (wooden walls, bulletin board, cozy desk)
- Vendor cards lined up on a board/table
- Each card: animal emoji + company name + brief spec + [✅ Invite] [❌ Pass] buttons

### 4d. Particles & Effects
| Effect | Trigger | Description |
|--------|---------|-------------|
| ✨ Sparkle burst | Vendor approved | Gold sparkles from NPC |
| 🎉 Confetti | Deal closed | Multi-color confetti falls |
| 💨 Walk dust | NPC walking | Tiny dust puffs behind feet |
| 🌟 Star pop | ⭐ appears on house | Star scales up with bounce |
| 🔔 Bell ring | New notification | Bell shakes, small ripple |

---

## 5. Map / Village

### Village Layout
- Grass field with soft texture — no hard grid, organic placement
- HQ at center
- Houses spread outward naturally as more vendors join (first few near HQ, later ones further out)
- Dirt paths auto-generate between HQ and each house (already done in code)

### Decorative Elements (already in code, may want proper sprites)
🌲 Trees · 🌸 Cherry blossoms · 🌼 Flowers · 🪨 Rocks · 🌿 Bushes

---

## 6. Delivery Format

| Asset | Format | Size |
|-------|--------|------|
| NPC sprites | PNG spritesheet (horizontal strip) | 64×64px per frame |
| Houses | PNG, transparent bg | 120×120px |
| Forage mascot | PNG spritesheet | 64×64px per frame |
| UI elements | SVG preferred, PNG fallback | — |
| Particles | PNG spritesheet or Lottie JSON | — |

**Naming convention:**
```
npc_fox_idle.png
npc_fox_walk.png
npc_fox_wave.png
house_fox_base.png
house_fox_star.png
hq_exterior_default.png
hq_exterior_waiting.png
forage_idle.png
```

---

## Priority Order

1. **HQ exterior** (2 states) — needed for map
2. **NPC walk + idle** for all 10 animals — needed for village life
3. **House base state** for all 10 — needed for move-in cutscene
4. **NPC arrive + wave** — needed for move-in cutscene
5. **NPC talk** — needed for dialogue
6. **House build animation** — move-in ceremony
7. **House star state** — deal closed moment
8. **NPC cheer** — deal closed moment
9. **Forage mascot** — HQ interior
10. **HQ interior backdrop** — batch review screen
11. **Particles** — polish layer
