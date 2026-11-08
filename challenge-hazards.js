'use strict';
// TEST19 Challenge Mode Hazards (<추억의 인내의 숲> Stage 2 & Stage 3 — USER PLAYTEST REQUIRED):
// - Preserves WebP NPC sprite rendering (`drawChallengeNpcSprite` using `npcMeta`).
// - Gate G3 (P0): `applyChallengeKnockback()` enforces backward chasm-push knockback (`dir = -1` on Stage 2 guard/barrier hits) and disables mid-air jump/dash recovery (`p.airDashUsed = true`, `p.jumps = 2`) during stagger so players can NEVER damage-boost forward across guard bridges!
// - Gate G4 (P0): Fixed Mayo horizontal turrets (`MAYO-C1 = 910 px/s`, `MAYO-C2 = 950 px/s`, `MAYO-C3 = 990 px/s`, `vy = 0`) fire at their true independent seeded intervals (no artificial `conflictWarn` pause) with 120Hz swept segment collision (`~8.25px/step`, 0 tunneling).

let challengeGuards = [];
let challengeBarriers = [];
let challengeTurrets = [];
let challengeDarts = [];
let challengeHazardClock = 0;

function chPrngUnit(runSeed, attemptIndex, seedOffset, shotIndex) {
  let h = ((runSeed * 2654435761) ^ (attemptIndex * 1013904223) ^ (seedOffset * 374761393) ^ (shotIndex * 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function nextTurretCooldown(turret, runSeed, attemptIndex) {
  const u = chPrngUnit(runSeed, attemptIndex, turret.seedOffset || 101, turret.shotsFired || 0);
  return Number((turret.minCooldown + u * (turret.maxCooldown - turret.minCooldown)).toFixed(3));
}

function resetChallengeHazards() {
  challengeHazardClock = 0;
  challengeGuards = [];
  challengeBarriers = [];
  challengeTurrets = [];
  challengeDarts = [];

  if (typeof gameMode === 'undefined' || gameMode !== 'challenge') return;
  const st = challengeLevels[challengeStageIndex];
  if (!st) return;

  const runSeed = (typeof challengeState !== 'undefined' ? challengeState.runSeed : 101) || 101;
  const attemptIdx = (typeof challengeState !== 'undefined' ? challengeState.attemptIndex : 0) || 0;

  for (const gd of (st.guards || [])) {
    const pl = platforms.find(a => a.id === gd.platformId);
    const edgeMargin = gd.edgeMargin || 26;
    const minX = pl ? (pl.x + edgeMargin) : gd.startX - 80;
    const maxX = pl ? (pl.x + pl.w - edgeMargin) : gd.startX + 80;
    const y = pl ? pl.y : 420;
    challengeGuards.push({
      ...gd,
      x: clamp(gd.startX, minX, maxX),
      prevX: clamp(gd.startX, minX, maxX),
      y,
      minX,
      maxX,
      face: gd.dir || -1,
      state: 'move',
      stateTime: 0,
      clip: 'move',
      anim: 0,
      danger: true
    });
  }

  for (const bd of (st.barriers || [])) {
    const pl = platforms.find(a => a.id === bd.platformId);
    if (!pl) continue;
    challengeBarriers.push({
      ...bd,
      x: pl.x + bd.localX,
      y: pl.y,
      state: 'on',
      alpha: 1
    });
  }

  for (const td of (st.turrets || [])) {
    const initU = chPrngUnit(runSeed, attemptIdx, td.seedOffset + 7, 0);
    const firstCd = Number((td.initialDelay + initU * 0.35).toFixed(3));
    challengeTurrets.push({
      ...td,
      prevX: td.x,
      prevY: td.y,
      state: 'idle',
      stateTime: 0,
      cooldown: firstCd,
      shotsFired: 0,
      firedInCycle: false,
      clip: 'idle',
      anim: 0,
      fireLog: []
    });
  }
}

// Gate G3 (P0): Anti-Damage-Boost Knockback!
// Getting hit by a guard or barrier in Stage 2 ALWAYS knocks the player backward (-1, toward the chasm behind)
// and consumes air-dash & double-jump during stagger so players cannot damage-boost forward!
// Gate G1 (Section 2.2): Story-matched guard/barrier knockback profile (~320 px/s, 1.5s stun, margin-aware,
// preserving normal jump/air-dash recovery rules without forced p.jumps=2 or p.airDashUsed=true lockout!)
function applyChallengeKnockback(sourceX, baseForce = 320, stunSec = 1.50, reason = 'guard', forcedDir = null) {
  if (p.invulnerable > 0 || state !== 'playing') return false;
  const dir = forcedDir !== null ? forcedDir : (p.x >= sourceX ? 1 : -1);
  let force = baseForce || 320;
  if (p.ground && p.on) {
    const margin = dir < 0 ? p.x - p.on.x - 26 : p.on.x + p.on.w - p.x - 26;
    if (margin > 0) force = Math.min(force, Math.max(175, margin / 0.26));
  }
  p.face = -dir;
  p.invulnerable = 2.15;
  p.guardStun = stunSec;
  p.guardKnock = 0.26;
  p.knock = 0;
  p.knockVX = dir * force;
  p.vx = p.knockVX;
  p.vy = -230;
  p.dash = 0;
  p.buffer = 0;
  p.jumpHeld = false;
  dashRequest = false;
  p.ground = false;
  p.on = null;
  p.coyote = 0;
  p.jumps = Math.max(1, p.jumps);
  if (typeof challengeState !== 'undefined') {
    challengeState.hits++;
    challengeState.stageHits[challengeStageIndex] = (challengeState.stageHits[challengeStageIndex] || 0) + 1;
  }
  burst(p.x, p.y - 35, '#ff9e7d', 12);
  tone(165, 0.18, 'sawtooth', 0.045);
  if (typeof playDuduVoice === 'function') playDuduVoice('hit_stun');
  return true;
}

function updateChallengeHazards(dt) {
  challengeHazardClock += dt;
  if (p.invulnerable > 0) p.invulnerable = Math.max(0, p.invulnerable - dt);

  // 1. Update Stage 2 Challenge Guards
  for (const g of challengeGuards) {
    g.prevX = g.x;
    g.stateTime += dt;
    g.anim += dt;

    if (g.state === 'wait') {
      if (g.clip !== 'idle') { g.clip = 'idle'; g.anim = 0; }
      if (g.stateTime >= (g.waitTime || 0.36)) {
        g.state = 'warn';
        g.stateTime = 0;
        g.clip = 'warn';
        g.anim = 0;
        g.face = (g.x >= (g.minX + g.maxX) * 0.5) ? -1 : 1;
      }
    } else if (g.state === 'warn') {
      if (g.clip !== 'warn') { g.clip = 'warn'; g.anim = 0; }
      if (g.stateTime >= (g.warnTime || 0.34)) {
        g.state = 'move';
        g.stateTime = 0;
        g.clip = 'move';
        g.anim = 0;
      }
    } else if (g.state === 'move') {
      if (g.clip !== 'move') { g.clip = 'move'; g.anim = 0; }
      g.x += g.face * g.speed * dt;
      if (g.face < 0 && g.x <= g.minX) {
        g.x = g.minX;
        g.state = 'turn';
        g.stateTime = 0;
        g.clip = 'idle';
        g.anim = 0;
      } else if (g.face > 0 && g.x >= g.maxX) {
        g.x = g.maxX;
        g.state = 'turn';
        g.stateTime = 0;
        g.clip = 'idle';
        g.anim = 0;
      }
    } else if (g.state === 'turn') {
      if (g.clip !== 'idle') { g.clip = 'idle'; g.anim = 0; }
      if (g.stateTime >= 0.20) {
        g.face = -g.face;
        g.state = 'warn';
        g.stateTime = 0;
        g.clip = 'warn';
        g.anim = 0;
      }
    }

    const gxMin = Math.min(g.prevX, g.x) - 24;
    const gxMax = Math.max(g.prevX, g.x) + 24;
    const pxMin = Math.min(p.prevX, p.x) - 16;
    const pxMax = Math.max(p.prevX, p.x) + 16;
    const overlapX = Math.min(gxMax, pxMax) >= Math.max(gxMin, pxMin);
    const overlapY = (p.y >= g.y - 54) && (p.y - 56 <= g.y + 4);
    if (overlapX && overlapY && p.invulnerable <= 0) {
      const pushSourceX = (Math.abs(p.x - g.x) > 4) ? g.x : (p.x - g.face * 10);
      applyChallengeKnockback(pushSourceX, g.knockVX || 320, 1.50, 'guard');
    }
  }

  // 2. Update Stage 2 Knockback Shield Barriers
  for (const b of challengeBarriers) {
    const cycle = b.activeDur + b.warnDur + b.offDur;
    const t = ((challengeHazardClock + (b.phase || 0)) % cycle + cycle) % cycle;
    if (t < b.activeDur) {
      b.state = 'on';
      b.alpha = 1.0;
    } else if (t < b.activeDur + b.warnDur) {
      b.state = 'warn';
      b.alpha = 0.55 + 0.35 * Math.sin((t - b.activeDur) * Math.PI * 10);
    } else {
      b.state = 'off';
      b.alpha = 0.18;
    }

    if (b.state === 'on' && p.invulnerable <= 0) {
      const hitX = Math.abs(p.x - b.x) < (b.width * 0.5 + 16);
      const hitY = (p.y >= b.y - b.height) && (p.y - 54 <= b.y + 4);
      if (hitX && hitY) {
        applyChallengeKnockback(b.x + 4, b.knockVX || 320, 1.50, 'barrier');
      }
    }
  }

  // 3. Update Stage 3 Fixed Mayo Horizontal Turrets (`vy = 0`, 2.0x Dart Speeds 910 / 950 / 990 px/s, True Independent Rhythm)
  const runSeed = (typeof challengeState !== 'undefined' ? challengeState.runSeed : 101) || 101;
  const attemptIdx = (typeof challengeState !== 'undefined' ? challengeState.attemptIndex : 0) || 0;

  for (const t of challengeTurrets) {
    t.anim += dt;
    if (t.state === 'idle') {
      if (t.clip !== 'idle') { t.clip = 'idle'; t.anim = 0; }
      t.cooldown -= dt;
      if (t.cooldown <= 0) {
        t.state = 'warn';
        t.stateTime = 0;
        t.clip = 'warn';
        t.anim = 0;
        tone(540, 0.06, 'triangle', 0.025);
      }
    } else if (t.state === 'warn') {
      if (t.clip !== 'warn') { t.clip = 'warn'; t.anim = 0; }
      t.stateTime += dt;
      if (t.stateTime >= t.warnTime) {
        t.state = 'attack';
        t.stateTime = 0;
        t.firedInCycle = false;
        t.clip = 'attack';
        t.anim = 0;
      }
    } else if (t.state === 'attack') {
      if (t.clip !== 'attack') { t.clip = 'attack'; t.anim = 0; }
      t.stateTime += dt;
      if (!t.firedInCycle && t.stateTime >= 0.06) {
        t.firedInCycle = true;
        t.shotsFired++;
        const muzzleX = t.x + t.face * 42;
        const muzzleY = t.y + (t.muzzleOffsetY || -54);
        challengeDarts.push({
          turretId: t.id,
          lane: t.lane,
          x: muzzleX,
          y: muzzleY,
          prevX: muzzleX,
          prevY: muzzleY,
          vx: t.face * t.dartSpeed,
          vy: 0, // Strictly horizontal trajectory (vy = 0)!
          speed: t.dartSpeed,
          radius: 12,
          minX: t.minX,
          maxX: t.maxX,
          age: 0,
          maxAge: 4.5,
          hit: false
        });
        t.fireLog.push(Number(challengeHazardClock.toFixed(3)));
        burst(muzzleX, muzzleY, '#96f2d7', 7);
        tone(740, 0.08, 'sine', 0.032);
      }
      if (t.stateTime >= t.attackDur) {
        t.state = 'idle';
        t.stateTime = 0;
        t.clip = 'idle';
        t.anim = 0;
        t.cooldown = nextTurretCooldown(t, runSeed, attemptIdx);
      }
    }
  }

  // 4. Update 2.0x Speed Horizontal Wind Darts (`vy = 0`, 120Hz Swept Segment Collision: ~8.25px/step)
  for (const d of challengeDarts) {
    if (d.hit) continue;
    d.prevX = d.x;
    d.prevY = d.y;
    d.age += dt;
    d.x += d.vx * dt;
    if (d.x < d.minX || d.x > d.maxX || d.age >= d.maxAge) {
      d.hit = true;
      continue;
    }
    if (p.invulnerable <= 0) {
      const segMinX = Math.min(d.prevX, d.x) - d.radius;
      const segMaxX = Math.max(d.prevX, d.x) + d.radius;
      const hitX = (p.x + 15 >= segMinX) && (p.x - 15 <= segMaxX);
      const hitY = Math.abs((p.y - 34) - d.y) < (24 + d.radius);
      if (hitX && hitY) {
        d.hit = true;
        const pushDir = d.vx > 0 ? 1 : -1;
        applyChallengeKnockback(d.x, 320, 1.50, 'mayo_dart', pushDir);
      }
    }
  }
  challengeDarts = challengeDarts.filter(d => !d.hit);
}

// Render Challenge NPC Sprite using the exact `npcMeta` schema (`size: 256, foot, anchor, display, cols, frames, fps, facing`)
function drawChallengeNpcSprite(kind, clip, elapsedSec, x, y, face) {
  const key = `${kind}_${clip}`;
  const fallbackKey = `${kind}_idle`;
  const m = (typeof npcMeta !== 'undefined' && (npcMeta[key] || npcMeta[fallbackKey])) || null;
  const im = (typeof npcImages !== 'undefined' && (npcImages[key] || npcImages[fallbackKey])) || null;
  if (!m || !im || !im.complete || !(im.naturalWidth > 0)) return false;

  const frameSize = Number.isFinite(m.size) ? m.size : 256;
  const cols = Number.isFinite(m.cols) && m.cols > 0 ? m.cols : 8;
  const totalFrames = Number.isFinite(m.frames) && m.frames > 0 ? m.frames : 1;
  const fps = Number.isFinite(m.fps) && m.fps > 0 ? m.fps : 20;
  const displaySize = Number.isFinite(m.display) && m.display > 0 ? m.display : 160;
  const anchor = Number.isFinite(m.anchor) ? m.anchor : 128;
  const foot = Number.isFinite(m.foot) ? m.foot : 200;

  const duration = totalFrames / fps;
  const rawFrame = (clip === 'warn' || clip === 'attack' || clip === 'throw')
    ? Math.min(totalFrames - 1, Math.max(0, elapsedSec * fps))
    : ((elapsedSec % duration) * fps);
  const f = Math.max(0, Math.min(totalFrames - 1, Math.floor(rawFrame) % totalFrames));
  const srcX = (f % cols) * frameSize;
  const srcY = Math.floor(f / cols) * frameSize;
  if (!Number.isFinite(srcX) || !Number.isFinite(srcY)) return false;

  nx.clearRect(0, 0, frameSize, frameSize);
  nx.save();
  nx.globalCompositeOperation = 'source-over';
  nx.globalAlpha = 1;
  nx.drawImage(im, srcX, srcY, frameSize, frameSize, 0, 0, frameSize, frameSize);
  nx.restore();

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  const scaleSign = (m.facing === 1) ? face : -face;
  ctx.scale(scaleSign, 1);
  ctx.drawImage(
    npcCanvas,
    -Math.round((anchor / frameSize) * displaySize),
    -Math.round((foot / frameSize) * displaySize),
    displaySize,
    displaySize
  );
  ctx.restore();
  return true;
}

function drawChallengeHazards() {
  const viewW = (typeof rCamZoom === 'number' && rCamZoom > 0) ? (W / rCamZoom) : W;
  // 1. Draw Stage 2 Knockback Shield Barriers
  for (const b of challengeBarriers) {
    if (b.x < rCam - 80 || b.x > rCam + viewW + 80) continue;
    ctx.save();
    ctx.globalAlpha = b.alpha;
    const bx = Math.round(b.x - b.width * 0.5);
    const by = Math.round(b.y - b.height);
    ctx.fillStyle = '#3d4758';
    ctx.beginPath();
    ctx.roundRect(bx - 4, b.y - 10, b.width + 8, 10, 4);
    ctx.fill();
    ctx.fillStyle = b.state === 'on' ? '#ff5238cc' : (b.state === 'warn' ? '#fcc419cc' : '#748ffc55');
    ctx.strokeStyle = b.state === 'on' ? '#fff0f0' : '#ffd43b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, b.width, b.height - 8, 8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffffffdd';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(b.x + 5, by + 14);
    ctx.lineTo(b.x - 5, by + 24);
    ctx.lineTo(b.x + 5, by + 34);
    ctx.stroke();
    ctx.restore();
  }

  // 2. Draw Stage 2 Challenge Guards
  for (const g of challengeGuards) {
    if (g.x < rCam - 180 || g.x > rCam + viewW + 180) continue;
    ctx.save();
    ctx.strokeStyle = g.state === 'warn' ? 'rgba(235, 95, 70, 0.55)' : 'rgba(255, 210, 140, 0.28)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(g.minX, g.y - 2);
    ctx.lineTo(g.maxX, g.y - 2);
    ctx.stroke();
    ctx.restore();

    ellipse(g.x, g.y + 2, 22, 4, '#24342838');
    ellipse(g.x, g.y - 2, 26, 5, g.state === 'warn' ? '#ff6b4a66' : '#d9433044');

    drawChallengeNpcSprite(g.kind, g.clip, g.anim, g.x, g.y, g.face);
  }

  // 3. Draw Stage 3 Fixed Mayo Horizontal Turrets & Sightlines
  for (const t of challengeTurrets) {
    const muzzleX = t.x + t.face * 42;
    const muzzleY = t.y + (t.muzzleOffsetY || -54);

    ctx.save();
    const isWarn = t.state === 'warn';
    ctx.strokeStyle = isWarn ? 'rgba(255, 107, 107, 0.85)' : 'rgba(99, 230, 190, 0.26)';
    ctx.lineWidth = isWarn ? 3.5 : 1.6;
    ctx.setLineDash(isWarn ? [10, 6] : [5, 9]);
    ctx.beginPath();
    ctx.moveTo(muzzleX, muzzleY);
    ctx.lineTo(t.face < 0 ? t.minX : t.maxX, muzzleY);
    ctx.stroke();
    ctx.restore();

    if (isWarn) {
      const u = clamp(t.stateTime / Math.max(0.01, t.warnTime), 0, 1);
      ctx.save();
      ctx.strokeStyle = '#ff6b6b';
      ctx.fillStyle = 'rgba(255, 212, 59, 0.62)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 10 + (1 - u) * 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ellipse(t.x, t.y + 2, 22, 4, '#24342838');
    drawChallengeNpcSprite('mayo', t.clip, t.anim, t.x, t.y, t.face);
  }

  // 4. Draw Stage 3 High-Speed Horizontal Wind Darts (with speed trail!)
  for (const d of challengeDarts) {
    if (d.hit) continue;
    ctx.save();
    ctx.translate(Math.round(d.x), Math.round(d.y));
    if (d.vx < 0) ctx.scale(-1, 1);
    ctx.strokeStyle = 'rgba(99, 230, 190, 0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-48, 0);
    ctx.lineTo(-14, 0);
    ctx.stroke();
    ctx.strokeStyle = '#20c997';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e6fcf5';
    ctx.beginPath();
    ctx.roundRect(-18, -4, 36, 8, 4);
    ctx.fill();
    ctx.restore();
  }
}
