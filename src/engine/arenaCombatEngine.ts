import {
  ARCHETYPE_SPECS,
  ArenaMode,
  Archetype,
  RosterMember,
} from './zeroSumRules';

export interface ArenaPillar {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Combatant {
  id: string;
  name: string;
  team: 'A' | 'B';
  isHuman: boolean;
  archetype: Archetype;
  purchasedItemIDs: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  moveSpeed: number;
  primaryCooldown: number;
  dashCooldown: number;
  dashMaxCooldown: number;
  abilityCooldown: number;
  abilityMaxCooldown: number;
  ultCooldown: number;
  ultMaxCooldown: number;
  alive: boolean;
  hitFlashTimer: number;
  koTimer: number;
  telegraphTimer: number;
  telegraphX: number;
  telegraphY: number;
  telegraphRadius: number;
  telegraphKind: 'slam' | 'burst' | null;
  aiStrafeDir: number;
  aiStrafeTimer: number;
  auraTickTimer: number;
}

interface Projectile {
  active: boolean;
  team: 'A' | 'B';
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  color: string;
}

interface PulseRing {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface PartyHudAllySnapshot {
  id: string;
  name: string;
  archetype: Archetype;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  ultCooldown: number;
  ultMaxCooldown: number;
  alive: boolean;
  isHuman: boolean;
}

export interface CombatHudSnapshot {
  elapsedSeconds: number;
  teamAAlive: number;
  teamBAlive: number;
  playerHp: number;
  playerMaxHp: number;
  playerShield: number;
  playerMaxShield: number;
  dashCooldown: number;
  dashMaxCooldown: number;
  abilityCooldown: number;
  abilityMaxCooldown: number;
  ultCooldown: number;
  ultMaxCooldown: number;
  playerDamageDealt: number;
  playerDamageTaken: number;
  allies: PartyHudAllySnapshot[];
  status: 'running' | 'won' | 'lost';
}

export interface CombatFinishResult {
  didWin: boolean;
  damageDealt: number;
  damageTaken: number;
  durationSeconds: number;
}

export const ARENA_WIDTH = 960;
export const ARENA_HEIGHT = 560;

export function getArenaPillars(mode: ArenaMode): ArenaPillar[] {
  if (mode === '1v1') {
    return [
      { x: 320, y: 210, w: 68, h: 140 },
      { x: 572, y: 210, w: 68, h: 140 },
    ];
  }
  if (mode === '2v2') {
    return [
      { x: 265, y: 120, w: 72, h: 96 },
      { x: 265, y: 344, w: 72, h: 96 },
      { x: 623, y: 120, w: 72, h: 96 },
      { x: 623, y: 344, w: 72, h: 96 },
    ];
  }
  return [
    { x: 230, y: 110, w: 64, h: 92 },
    { x: 230, y: 358, w: 64, h: 92 },
    { x: 448, y: 224, w: 64, h: 112 },
    { x: 666, y: 110, w: 64, h: 92 },
    { x: 666, y: 358, w: 64, h: 92 },
  ];
}

export class ArenaCombatSimulation {
  readonly mode: ArenaMode;
  readonly pillars: ArenaPillar[];
  combatants: Combatant[] = [];
  private projectiles: Projectile[];
  private rings: PulseRing[];
  private particles: Particle[];
  private projectileCursor = 0;
  private ringCursor = 0;
  private particleCursor = 0;

  private elapsed = 0;
  private hitstopTimer = 0;
  private shakeTrauma = 0;
  private finishDelayTimer = -1;
  private finishWinner: 'A' | 'B' | null = null;
  private notifiedFinish = false;

  playerDamageDealt = 0;
  playerDamageTaken = 0;

  // Input state
  keysHeld = new Set<string>();
  pointerWorldX = ARENA_WIDTH * 0.65;
  pointerWorldY = ARENA_HEIGHT * 0.5;
  pointerDown = false;
  private pendingDash = false;
  private pendingAbility = false;
  private pendingUlt = false;

  private onFinish?: (result: CombatFinishResult) => void;

  constructor(
    mode: ArenaMode,
    roster: RosterMember[],
    onFinish?: (result: CombatFinishResult) => void
  ) {
    this.mode = mode;
    this.pillars = getArenaPillars(mode);
    this.onFinish = onFinish;

    // Zero-GC pre-allocated pools
    this.projectiles = Array.from({ length: 96 }, () => ({
      active: false,
      team: 'A',
      ownerId: '',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 5,
      damage: 10,
      life: 0,
      color: '#111111',
    }));

    this.rings = Array.from({ length: 24 }, () => ({
      active: false,
      x: 0,
      y: 0,
      radius: 10,
      maxRadius: 100,
      life: 0,
      maxLife: 0.4,
      color: '#16A34A',
    }));

    this.particles = Array.from({ length: 160 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.4,
      size: 3,
      color: '#111111',
    }));

    const teamA = roster.filter((m) => m.team === 'A');
    const teamB = roster.filter((m) => m.team === 'B');

    const teamAHasAegis = teamA.some((m) =>
      m.purchasedItemIDs.includes('aura_aegis_shield')
    );
    const teamBHasAegis = teamB.some((m) =>
      m.purchasedItemIDs.includes('aura_aegis_shield')
    );

    const spawnTeam = (members: RosterMember[], team: 'A' | 'B', bonusShield: number) => {
      const startX = team === 'A' ? 115 : ARENA_WIDTH - 115;
      const stepY = ARENA_HEIGHT / (members.length + 1);
      members.forEach((m, idx) => {
        const spec = ARCHETYPE_SPECS[m.archetype];
        const hasBlink = m.purchasedItemIDs.includes('perk_blink_dash');
        const hasCatalyst = m.purchasedItemIDs.includes('perk_overcharge_ult');
        const maxShield = spec.maxShield + bonusShield;
        const ultMax = hasCatalyst ? spec.ultimateCooldown * 0.75 : spec.ultimateCooldown;

        this.combatants.push({
          id: m.id,
          name: m.name,
          team,
          isHuman: m.isHuman,
          archetype: m.archetype,
          purchasedItemIDs: m.purchasedItemIDs,
          x: startX,
          y: stepY * (idx + 1),
          vx: 0,
          vy: 0,
          angle: team === 'A' ? 0 : Math.PI,
          radius: m.archetype === 'Tank' ? 20 : 16,
          hp: spec.maxHealth,
          maxHp: spec.maxHealth,
          shield: maxShield,
          maxShield,
          moveSpeed: hasBlink ? spec.moveSpeed * 1.12 : spec.moveSpeed,
          primaryCooldown: 0,
          dashCooldown: 0,
          dashMaxCooldown: hasBlink ? 2.6 : 4.0,
          abilityCooldown: 0,
          abilityMaxCooldown: 6.5,
          ultCooldown: 3.5, // Ready early in the duel for tactical timing
          ultMaxCooldown: ultMax,
          alive: true,
          hitFlashTimer: 0,
          koTimer: 0,
          telegraphTimer: 0,
          telegraphX: 0,
          telegraphY: 0,
          telegraphRadius: 0,
          telegraphKind: null,
          aiStrafeDir: idx % 2 === 0 ? 1 : -1,
          aiStrafeTimer: 1.2 + idx * 0.4,
          auraTickTimer: 1.5,
        });
      });
    };

    spawnTeam(teamA, 'A', teamAHasAegis ? 25 : 0);
    spawnTeam(teamB, 'B', teamBHasAegis ? 25 : 0);
  }

  queueDash(): void {
    this.pendingDash = true;
  }

  queueAbility(): void {
    this.pendingAbility = true;
  }

  queueUltimate(): void {
    this.pendingUlt = true;
  }

  clearInputs(): void {
    this.keysHeld.clear();
    this.pointerDown = false;
    this.pendingDash = false;
    this.pendingAbility = false;
    this.pendingUlt = false;
  }

  // Allows instant resolution in tests or when simulating an outcome
  forceResolve(teamAWins: boolean): void {
    for (const c of this.combatants) {
      if ((teamAWins && c.team === 'B') || (!teamAWins && c.team === 'A')) {
        c.hp = 0;
        c.shield = 0;
        c.alive = false;
      }
    }
    this.finishWinner = teamAWins ? 'A' : 'B';
    this.finishDelayTimer = 0;
  }

  step(rawDt: number): void {
    const dt = Math.min(rawDt, 0.05);
    this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.4);

    // Update particles & visual timers even during hitstop
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
    }

    for (const r of this.rings) {
      if (!r.active) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.active = false;
        continue;
      }
      const progress = 1 - r.life / r.maxLife;
      r.radius = r.maxRadius * progress;
    }

    for (const c of this.combatants) {
      if (c.hitFlashTimer > 0) c.hitFlashTimer = Math.max(0, c.hitFlashTimer - dt);
      if (!c.alive && c.koTimer > 0) c.koTimer = Math.max(0, c.koTimer - dt);
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    if (this.finishWinner !== null) {
      this.finishDelayTimer -= dt;
      if (this.finishDelayTimer <= 0 && !this.notifiedFinish) {
        this.notifiedFinish = true;
        this.onFinish?.({
          didWin: this.finishWinner === 'A',
          damageDealt: Math.round(this.playerDamageDealt),
          damageTaken: Math.round(this.playerDamageTaken),
          durationSeconds: Math.round(this.elapsed * 10) / 10,
        });
      }
      return;
    }

    this.elapsed += dt;

    for (const c of this.combatants) {
      if (!c.alive) continue;

      c.primaryCooldown = Math.max(0, c.primaryCooldown - dt);
      c.dashCooldown = Math.max(0, c.dashCooldown - dt);
      c.abilityCooldown = Math.max(0, c.abilityCooldown - dt);
      c.ultCooldown = Math.max(0, c.ultCooldown - dt);

      // Aura de Soin passive tick
      if (c.purchasedItemIDs.includes('aura_mending_pulse')) {
        c.auraTickTimer -= dt;
        if (c.auraTickTimer <= 0) {
          c.auraTickTimer = 2.0;
          this.pulseHealAround(c, 125, 10);
        }
      }

      // Resolve telegraphed attacks (e.g. Tank Slam)
      if (c.telegraphTimer > 0) {
        c.telegraphTimer -= dt;
        if (c.telegraphTimer <= 0) {
          this.triggerTelegraphImpact(c);
        }
      }

      if (c.isHuman) {
        this.updateHuman(c, dt);
      } else {
        this.updateAI(c, dt);
      }

      // Apply velocity + wall/pillar collision
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vx *= 0.82;
      c.vy *= 0.82;

      c.x = Math.max(c.radius + 18, Math.min(ARENA_WIDTH - c.radius - 18, c.x));
      c.y = Math.max(c.radius + 36, Math.min(ARENA_HEIGHT - c.radius - 18, c.y));
      this.resolvePillarCollision(c);
    }

    this.updateProjectiles(dt);

    // Check team wipe condition (State_Combat -> State_Resolution)
    const teamAAlive = this.combatants.some((c) => c.team === 'A' && c.alive);
    const teamBAlive = this.combatants.some((c) => c.team === 'B' && c.alive);
    if (!teamAAlive || !teamBAlive) {
      this.finishWinner = teamAAlive ? 'A' : 'B';
      this.finishDelayTimer = 0.55;
    }
  }

  private updateHuman(c: Combatant, _dt: number): void {
    let moveX = 0;
    let moveY = 0;
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) moveY -= 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) moveY += 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) moveX -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) moveX += 1;

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.hypot(moveX, moveY);
      c.vx = (moveX / len) * c.moveSpeed;
      c.vy = (moveY / len) * c.moveSpeed;
    }

    c.angle = Math.atan2(this.pointerWorldY - c.y, this.pointerWorldX - c.x);

    if (this.pendingDash) {
      this.pendingDash = false;
      if (c.dashCooldown <= 0) {
        const dashAngle =
          moveX !== 0 || moveY !== 0 ? Math.atan2(moveY, moveX) : c.angle;
        c.vx = Math.cos(dashAngle) * 760;
        c.vy = Math.sin(dashAngle) * 760;
        c.dashCooldown = c.dashMaxCooldown;
        this.spawnBurst(c.x, c.y, 8, '#3B82F6');
      }
    }

    if (this.pointerDown && c.primaryCooldown <= 0) {
      this.firePrimary(c);
    }

    if (this.pendingAbility) {
      this.pendingAbility = false;
      if (c.abilityCooldown <= 0) {
        this.castClassAbility(c);
      }
    }

    if (this.pendingUlt) {
      this.pendingUlt = false;
      if (c.ultCooldown <= 0) {
        this.castUltimate(c);
      }
    }
  }

  private updateAI(c: Combatant, dt: number): void {
    const enemies = this.combatants.filter((o) => o.team !== c.team && o.alive);
    const allies = this.combatants.filter((o) => o.team === c.team && o.alive && o.id !== c.id);
    if (enemies.length === 0) return;

    // Nearest enemy
    let target = enemies[0];
    let bestDist = Infinity;
    for (const e of enemies) {
      const d = Math.hypot(e.x - c.x, e.y - c.y);
      if (d < bestDist) {
        bestDist = d;
        target = e;
      }
    }

    const dx = target.x - c.x;
    const dy = target.y - c.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    c.angle = Math.atan2(dy, dx);

    c.aiStrafeTimer -= dt;
    if (c.aiStrafeTimer <= 0) {
      c.aiStrafeDir *= -1;
      c.aiStrafeTimer = 1.3 + Math.random() * 1.1;
    }

    const perpX = -dy / dist;
    const perpY = dx / dist;

    // Policy 1: Support (Positions behind lowest-HP ally, heals team, pokes safely)
    if (c.archetype === 'Support') {
      const injuredAlly = allies
        .slice()
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (injuredAlly && injuredAlly.hp / injuredAlly.maxHp < 0.82 && c.abilityCooldown <= 0) {
        const adx = injuredAlly.x - c.x;
        const ady = injuredAlly.y - c.y;
        const adist = Math.max(1, Math.hypot(adx, ady));
        if (adist > 130) {
          c.vx = (adx / adist) * c.moveSpeed;
          c.vy = (ady / adist) * c.moveSpeed;
        } else {
          this.castClassAbility(c);
        }
      } else {
        const desiredDist = 290;
        const push = dist < desiredDist ? -0.75 : dist > desiredDist + 70 ? 0.55 : 0;
        c.vx = ((dx / dist) * push + perpX * c.aiStrafeDir * 0.65) * c.moveSpeed;
        c.vy = ((dy / dist) * push + perpY * c.aiStrafeDir * 0.65) * c.moveSpeed;
      }

      if (c.primaryCooldown <= 0 && dist < 440) {
        this.firePrimary(c);
      }
      if (c.ultCooldown <= 0 && (c.hp < c.maxHp * 0.65 || (injuredAlly && injuredAlly.hp < injuredAlly.maxHp * 0.6))) {
        this.castUltimate(c);
      }
      return;
    }

    // Policy 2: Tank (Advances aggressively, casts shield, executes telegraphed ground slam)
    if (c.archetype === 'Tank') {
      if (dist > 105) {
        c.vx = ((dx / dist) * 0.92 + perpX * c.aiStrafeDir * 0.25) * c.moveSpeed;
        c.vy = ((dy / dist) * 0.92 + perpY * c.aiStrafeDir * 0.25) * c.moveSpeed;
      } else {
        c.vx = perpX * c.aiStrafeDir * c.moveSpeed * 0.5;
        c.vy = perpY * c.aiStrafeDir * c.moveSpeed * 0.5;
      }

      if (c.abilityCooldown <= 0 && c.shield < c.maxShield * 0.5) {
        this.castClassAbility(c);
      }
      if (c.ultCooldown <= 0 && dist < 145 && c.telegraphTimer <= 0) {
        this.castUltimate(c);
      } else if (c.primaryCooldown <= 0 && dist < 240) {
        this.firePrimary(c);
      }
      return;
    }

    // Policy 3: DPS (Kiter / Skirmisher — maintains 240px lane, strafes, bursts on cooldown)
    const desired = 240;
    const radial = dist < desired - 40 ? -0.8 : dist > desired + 55 ? 0.8 : 0.1;
    c.vx = ((dx / dist) * radial + perpX * c.aiStrafeDir * 0.78) * c.moveSpeed;
    c.vy = ((dy / dist) * radial + perpY * c.aiStrafeDir * 0.78) * c.moveSpeed;

    if (c.primaryCooldown <= 0 && dist < 480) {
      this.firePrimary(c);
    }
    if (c.abilityCooldown <= 0 && dist < 380) {
      this.castClassAbility(c);
    }
    if (c.ultCooldown <= 0 && dist < 420) {
      this.castUltimate(c);
    }
  }

  private firePrimary(c: Combatant): void {
    const spec = ARCHETYPE_SPECS[c.archetype];
    const hasCarbine = c.purchasedItemIDs.includes('wpn_pulse_carbine');
    const hasShotgun = c.purchasedItemIDs.includes('wpn_breach_shotgun');

    const baseDamage = hasCarbine ? spec.primaryDamage * 1.2 : spec.primaryDamage;
    const speed = hasCarbine ? 580 : 480;
    const color = c.team === 'A' ? '#16A34A' : '#DC2626';

    if (hasShotgun) {
      c.primaryCooldown = 0.62;
      for (const offset of [-0.16, 0, 0.16]) {
        this.spawnProjectile(
          c,
          c.angle + offset,
          440,
          baseDamage * 0.55,
          0.55,
          color
        );
      }
    } else {
      c.primaryCooldown = c.archetype === 'DPS' ? 0.36 : 0.52;
      this.spawnProjectile(c, c.angle, speed, baseDamage, 1.15, color);
    }
  }

  private castClassAbility(c: Combatant): void {
    c.abilityCooldown = c.abilityMaxCooldown;
    if (c.archetype === 'Support') {
      this.pulseHealAround(c, 170, 32);
    } else if (c.archetype === 'Tank') {
      c.shield = Math.min(c.maxShield, c.shield + 45);
      this.spawnRing(c.x, c.y, 90, '#2563EB');
    } else {
      // DPS triple burst
      const color = c.team === 'A' ? '#16A34A' : '#DC2626';
      for (const spread of [-0.11, 0, 0.11]) {
        this.spawnProjectile(c, c.angle + spread, 620, 20, 1.1, color);
      }
    }
  }

  private castUltimate(c: Combatant): void {
    c.ultCooldown = c.ultMaxCooldown;
    if (c.archetype === 'Support') {
      // Team-wide Sanctuary Heal + Shield
      this.pulseHealAround(c, 320, 48);
      for (const ally of this.combatants) {
        if (ally.team === c.team && ally.alive) {
          ally.shield = Math.min(ally.maxShield, ally.shield + 30);
        }
      }
      this.spawnRing(c.x, c.y, 240, '#16A34A');
    } else if (c.archetype === 'Tank') {
      // Telegraphed Seismic Shockwave (0.45s windup)
      c.telegraphTimer = 0.45;
      c.telegraphX = c.x;
      c.telegraphY = c.y;
      c.telegraphRadius = 140;
      c.telegraphKind = 'slam';
    } else {
      // DPS High-velocity execution rail shot
      const color = c.team === 'A' ? '#D97706' : '#DC2626';
      this.spawnProjectile(c, c.angle, 780, 56, 1.25, color, 8);
      this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.35);
    }
  }

  private triggerTelegraphImpact(c: Combatant): void {
    if (c.telegraphKind === 'slam') {
      this.spawnRing(c.telegraphX, c.telegraphY, c.telegraphRadius, '#D97706');
      this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.45);
      for (const target of this.combatants) {
        if (target.team === c.team || !target.alive) continue;
        const d = Math.hypot(target.x - c.telegraphX, target.y - c.telegraphY);
        if (d <= c.telegraphRadius + target.radius) {
          this.applyDamage(c, target, 42);
        }
      }
    }
    c.telegraphKind = null;
  }

  private pulseHealAround(source: Combatant, radius: number, amount: number): void {
    this.spawnRing(source.x, source.y, radius, '#16A34A');
    for (const ally of this.combatants) {
      if (ally.team !== source.team || !ally.alive) continue;
      if (Math.hypot(ally.x - source.x, ally.y - source.y) <= radius) {
        ally.hp = Math.min(ally.maxHp, ally.hp + amount);
      }
    }
  }

  private spawnProjectile(
    owner: Combatant,
    angle: number,
    speed: number,
    damage: number,
    life: number,
    color: string,
    radius = 5
  ): void {
    const p = this.projectiles[this.projectileCursor];
    this.projectileCursor = (this.projectileCursor + 1) % this.projectiles.length;
    p.active = true;
    p.team = owner.team;
    p.ownerId = owner.id;
    p.x = owner.x + Math.cos(angle) * (owner.radius + 6);
    p.y = owner.y + Math.sin(angle) * (owner.radius + 6);
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.radius = radius;
    p.damage = damage;
    p.life = life;
    p.color = color;
  }

  private spawnRing(x: number, y: number, maxRadius: number, color: string): void {
    const r = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % this.rings.length;
    r.active = true;
    r.x = x;
    r.y = y;
    r.radius = 8;
    r.maxRadius = maxRadius;
    r.life = 0.35;
    r.maxLife = 0.35;
    r.color = color;
  }

  private spawnBurst(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const pt = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.particles.length;
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 70 + Math.random() * 140;
      pt.active = true;
      pt.x = x;
      pt.y = y;
      pt.vx = Math.cos(a) * spd;
      pt.vy = Math.sin(a) * spd;
      pt.life = 0.25 + Math.random() * 0.2;
      pt.maxLife = pt.life;
      pt.size = 2.5 + Math.random() * 2.5;
      pt.color = color;
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < 10 || p.x > ARENA_WIDTH - 10 || p.y < 10 || p.y > ARENA_HEIGHT - 10) {
        p.active = false;
        continue;
      }

      let hitWall = false;
      for (const pillar of this.pillars) {
        if (
          p.x + p.radius > pillar.x &&
          p.x - p.radius < pillar.x + pillar.w &&
          p.y + p.radius > pillar.y &&
          p.y - p.radius < pillar.y + pillar.h
        ) {
          hitWall = true;
          break;
        }
      }
      if (hitWall) {
        this.spawnBurst(p.x, p.y, 4, '#71717A');
        p.active = false;
        continue;
      }

      for (const target of this.combatants) {
        if (!target.alive || target.team === p.team) continue;
        const d = Math.hypot(target.x - p.x, target.y - p.y);
        if (d <= target.radius + p.radius) {
          const attacker = this.combatants.find((c) => c.id === p.ownerId);
          this.applyDamage(attacker, target, p.damage);
          p.active = false;
          break;
        }
      }
    }
  }

  private applyDamage(
    attacker: Combatant | undefined,
    target: Combatant,
    amount: number
  ): void {
    if (!target.alive) return;

    if (attacker?.isHuman) {
      this.playerDamageDealt += amount;
    }
    if (target.isHuman) {
      this.playerDamageTaken += amount;
      this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.25);
    }

    let remaining = amount;
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, remaining);
      target.shield -= absorbed;
      remaining -= absorbed;
    }
    if (remaining > 0) {
      target.hp = Math.max(0, target.hp - remaining);
    }

    target.hitFlashTimer = 0.07;
    this.spawnBurst(target.x, target.y, amount >= 40 ? 14 : 6, target.team === 'A' ? '#DC2626' : '#D97706');

    if (amount >= 40) {
      this.hitstopTimer = 0.04;
    }

    if (target.hp <= 0) {
      target.alive = false;
      target.koTimer = 0.4;
      this.hitstopTimer = 0.055;
      this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.4);
      this.spawnBurst(target.x, target.y, 18, '#DC2626');
    }
  }

  private resolvePillarCollision(c: Combatant): void {
    for (const pillar of this.pillars) {
      const closestX = Math.max(pillar.x, Math.min(c.x, pillar.x + pillar.w));
      const closestY = Math.max(pillar.y, Math.min(c.y, pillar.y + pillar.h));
      const dx = c.x - closestX;
      const dy = c.y - closestY;
      const distSq = dx * dx + dy * dy;
      if (distSq < c.radius * c.radius) {
        const dist = Math.sqrt(distSq) || 0.001;
        const push = c.radius - dist;
        c.x += (dx / dist) * push;
        c.y += (dy / dist) * push;
      }
    }
  }

  getHudSnapshot(): CombatHudSnapshot {
    const human = this.combatants.find((c) => c.isHuman) ?? this.combatants[0];
    const teamAAlive = this.combatants.filter((c) => c.team === 'A' && c.alive).length;
    const teamBAlive = this.combatants.filter((c) => c.team === 'B' && c.alive).length;

    return {
      elapsedSeconds: this.elapsed,
      teamAAlive,
      teamBAlive,
      playerHp: Math.round(human?.hp ?? 0),
      playerMaxHp: Math.round(human?.maxHp ?? 100),
      playerShield: Math.round(human?.shield ?? 0),
      playerMaxShield: Math.round(human?.maxShield ?? 50),
      dashCooldown: human?.dashCooldown ?? 0,
      dashMaxCooldown: human?.dashMaxCooldown ?? 4,
      abilityCooldown: human?.abilityCooldown ?? 0,
      abilityMaxCooldown: human?.abilityMaxCooldown ?? 6.5,
      ultCooldown: human?.ultCooldown ?? 0,
      ultMaxCooldown: human?.ultMaxCooldown ?? 16,
      playerDamageDealt: Math.round(this.playerDamageDealt),
      playerDamageTaken: Math.round(this.playerDamageTaken),
      allies: this.combatants
        .filter((c) => c.team === 'A')
        .map((c) => ({
          id: c.id,
          name: c.name,
          archetype: c.archetype,
          hp: Math.round(c.hp),
          maxHp: Math.round(c.maxHp),
          shield: Math.round(c.shield),
          maxShield: Math.round(c.maxShield),
          ultCooldown: c.ultCooldown,
          ultMaxCooldown: c.ultMaxCooldown,
          alive: c.alive,
          isHuman: c.isHuman,
        })),
      status:
        this.finishWinner === null
          ? 'running'
          : this.finishWinner === 'A'
            ? 'won'
            : 'lost',
    };
  }

  render(ctx: CanvasRenderingContext2D, isDark: boolean): void {
    ctx.save();

    // Subtle trauma camera shake
    if (this.shakeTrauma > 0) {
      const mag = this.shakeTrauma * this.shakeTrauma * 9;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    // Swiss architectural floor grid
    ctx.fillStyle = isDark ? '#09090B' : '#F4F4F5';
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    ctx.strokeStyle = isDark ? '#18181B' : '#E4E4E7';
    ctx.lineWidth = 1;
    const gridSize = 40;
    ctx.beginPath();
    for (let x = gridSize; x < ARENA_WIDTH; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ARENA_HEIGHT);
    }
    for (let y = gridSize; y < ARENA_HEIGHT; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(ARENA_WIDTH, y);
    }
    ctx.stroke();

    // Arena center symmetry line & circle
    ctx.strokeStyle = isDark ? '#27272A' : '#D4D4D8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ARENA_WIDTH / 2, 16);
    ctx.lineTo(ARENA_WIDTH / 2, ARENA_HEIGHT - 16);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 64, 0, Math.PI * 2);
    ctx.stroke();

    // Outer arena bounds
    ctx.strokeStyle = isDark ? '#3F3F46' : '#A1A1AA';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, ARENA_WIDTH - 24, ARENA_HEIGHT - 24);

    // Line-of-sight pillars (Greybox architectural blocks)
    for (const pillar of this.pillars) {
      ctx.fillStyle = isDark ? '#18181B' : '#FFFFFF';
      ctx.fillRect(pillar.x, pillar.y, pillar.w, pillar.h);
      ctx.strokeStyle = isDark ? '#3F3F46' : '#A1A1AA';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pillar.x, pillar.y, pillar.w, pillar.h);

      // Subtle diagonal architectural hatch
      ctx.strokeStyle = isDark ? '#27272A' : '#E4E4E7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pillar.x, pillar.y);
      ctx.lineTo(pillar.x + pillar.w, pillar.y + pillar.h);
      ctx.stroke();
    }

    // Pulse rings (Heals / Shields / Shockwaves)
    for (const r of this.rings) {
      if (!r.active) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.life / r.maxLife);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Attack telegraphs
    for (const c of this.combatants) {
      if (c.alive && c.telegraphTimer > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(217, 119, 6, 0.14)';
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.telegraphX, c.telegraphY, c.telegraphRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // Combatants
    for (const c of this.combatants) {
      if (!c.alive && c.koTimer <= 0) continue;
      ctx.save();
      if (!c.alive) {
        ctx.globalAlpha = c.koTimer / 0.4;
      }

      const baseFill =
        c.hitFlashTimer > 0
          ? '#FFFFFF'
          : c.team === 'A'
            ? c.isHuman
              ? isDark
                ? '#F4F4F5'
                : '#111111'
              : '#16A34A'
            : '#DC2626';

      // Aim vector line for player
      if (c.isHuman && c.alive) {
        ctx.strokeStyle = isDark ? 'rgba(244,244,245,0.28)' : 'rgba(17,17,17,0.24)';
        ctx.lineWidth = 1.25;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(
          c.x + Math.cos(c.angle) * 72,
          c.y + Math.sin(c.angle) * 72
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Distinct geometric silhouette per archetype (Tank = square/octagonal, DPS = diamond/circle, Support = ringed circle)
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);

      ctx.fillStyle = baseFill;
      ctx.strokeStyle = isDark ? '#FAFAFA' : '#18181B';
      ctx.lineWidth = c.isHuman ? 2.5 : 1.5;

      if (c.archetype === 'Tank') {
        ctx.beginPath();
        ctx.rect(-c.radius * 0.85, -c.radius * 0.85, c.radius * 1.7, c.radius * 1.7);
        ctx.fill();
        ctx.stroke();
      } else if (c.archetype === 'DPS') {
        ctx.beginPath();
        ctx.moveTo(c.radius * 1.15, 0);
        ctx.lineTo(-c.radius * 0.85, -c.radius * 0.85);
        ctx.lineTo(-c.radius * 0.45, 0);
        ctx.lineTo(-c.radius * 0.85, c.radius * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, c.radius * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        ctx.moveTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.stroke();
      }

      ctx.restore();

      // Overhead crisp HP + Shield bar & Name
      if (c.alive) {
        const barW = 46;
        const barX = c.x - barW / 2;
        const barY = c.y - c.radius - 16;

        ctx.fillStyle = isDark ? '#27272A' : '#D4D4D8';
        ctx.fillRect(barX, barY, barW, 5);

        const hpRatio = Math.max(0, c.hp / c.maxHp);
        ctx.fillStyle = c.team === 'A' ? '#16A34A' : '#DC2626';
        ctx.fillRect(barX, barY, barW * hpRatio, 5);

        if (c.shield > 0) {
          const shieldRatio = Math.max(0, c.shield / c.maxShield);
          ctx.fillStyle = '#2563EB';
          ctx.fillRect(barX, barY - 3, barW * shieldRatio, 2);
        }

        ctx.fillStyle = isDark ? '#E4E4E7' : '#18181B';
        ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${c.name}`, c.x, barY - 6);
      }
    }

    // Projectiles
    for (const p of this.projectiles) {
      if (!p.active) continue;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Particles
    for (const pt of this.particles) {
      if (!pt.active) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      ctx.restore();
    }

    ctx.restore();
  }
}
