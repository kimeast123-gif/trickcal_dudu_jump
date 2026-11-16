'use strict';
// TEST19 Challenge Mode Hazards (<추억의 인내의 숲> Stage 2 & Stage 3 — USER PLAYTEST REQUIRED):
// - Preserves WebP NPC sprite rendering (`drawChallengeNpcSprite` using `npcMeta`).
// - Gate G3 (P0): `applyChallengeKnockback()` enforces backward chasm-push knockback (`dir = -1` on Stage 2 guard/barrier hits) and disables mid-air jump/dash recovery (`p.airDashUsed = true`, `p.jumps = 2`) during stagger so players can NEVER damage-boost forward across guard bridges!
// - Gate G4 (P0): Fixed Mayo horizontal turrets (`MAYO-C1 = 910 px/s`, `MAYO-C2 = 950 px/s`, `MAYO-C3 = 990 px/s`, `vy = 0`) fire at their true independent seeded intervals (no artificial `conflictWarn` pause) with 120Hz swept segment collision (`~8.25px/step`, 0 tunneling).

let challengeGuards = [];
let challengeBarriers = [];
let challengeTurrets = [];
let challengeDarts = [];
let challengeSpikes = [];
let challengeHazardClock = 0;
window.__challengeSpikes = () => challengeSpikes;
window.__challengeGuards = () => challengeGuards;
window.__challengeTurrets = () => challengeTurrets;
window.__challengeDarts = () => challengeDarts;

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
  challengeSpikes = [];

  if (typeof gameMode === 'undefined' || gameMode !== 'challenge') return;
  const st = (typeof getActiveChallengeStage === 'function') ? getActiveChallengeStage() : challengeLevels[challengeStageIndex];
  if (!st) return;

  const runSeed = (typeof challengeState !== 'undefined' ? challengeState.runSeed : 101) || 101;
  const attemptIdx = (typeof challengeState !== 'undefined' ? challengeState.attemptIndex : 0) || 0;

  for (const gd of (st.guards || [])) {
    const pl = platforms.find(a => a.id === gd.platformId);
    const edgeMargin = gd.edgeMargin || 26;
    const minX = (typeof gd.minX === 'number') ? gd.minX : (pl ? (pl.x + edgeMargin) : gd.startX - 80);
    const maxX = (typeof gd.maxX === 'number') ? gd.maxX : (pl ? (pl.x + pl.w - edgeMargin) : gd.startX + 80);
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
      stateTime: (typeof gd.phase === 'number') ? gd.phase : 0,
      clip: 'move',
      anim: (typeof gd.phase === 'number') ? gd.phase : 0,
      danger: true
    });
  }

  for (const sd of (st.spikes || [])) {
    const pl = platforms.find(a => a.id === sd.platformId);
    if (!pl) continue;
    const orient = sd.orientation === 'down' ? 'down' : 'up';
    const sx = pl.x + (sd.localX || 0);
    const sy = orient === 'down' ? (pl.y + 38) : pl.y;
    challengeSpikes.push({
      ...sd,
      platformRef: pl,
      orientation: orient,
      x: sx,
      y: sy,
      prevX: sx,
      prevY: sy,
      halfW: sd.halfW || 7,
      hitH: sd.hitH || 22,
      displaySize: sd.displaySize || 54,
      anim: 0
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
function applyChallengeKnockback(sourceX, baseForce = 416, stunSec = 1.50, reason = 'guard', forcedDir = null) {
  if (p.invulnerable > 0 || state !== 'playing') return false;
  let dir = forcedDir !== null ? forcedDir : (p.x >= sourceX ? 1 : -1);
  // On narrow Floor 1 spiked platforms (w <= 160), push toward the nearest platform edge so 1st-floor hits reliably drop the player off!
  if (forcedDir === null && p.on && p.on.w <= 160) {
    const platCenter = p.on.x + p.on.w * 0.5;
    dir = (p.x < platCenter) ? -1 : 1;
  }
  // [피드백 5 반영]: 모든 장애물 피격 시 넉백 거리 30% 증가 (기존 margin 안전 클램프 제거 및 넉백 지속시간 0.26s -> 0.34s 확대)
  let force = baseForce || 416;
  p.face = -dir;
  p.invulnerable = 2.15;
  p.guardStun = stunSec;
  p.guardKnock = 0.34;
  p.knock = 0;
  p.knockVX = dir * force;
  p.vx = p.knockVX;
  p.vy = -245;
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
      applyChallengeKnockback(pushSourceX, g.knockVX || 416, 1.50, 'guard');
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
        applyChallengeKnockback(b.x + 4, b.knockVX || 416, 1.50, 'barrier');
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
        applyChallengeKnockback(d.x, 416, 1.50, 'mayo_dart', pushDir);
      }
    }
  }
  challengeDarts = challengeDarts.filter(d => !d.hit);

  // 5. Update Stage 2-2 Spikes / Thorny Sprouts (Top & Underside — never culled or reset off-camera!)
  for (let i = 0; i < challengeSpikes.length; i++) {
    const s = challengeSpikes[i];
    s.anim += dt;
    if (s.platformRef) {
      s.prevX = s.x;
      s.prevY = s.y;
      s.x = s.platformRef.x + (s.localX || 0);
      s.y = s.orientation === 'down' ? (s.platformRef.y + 38) : s.platformRef.y;
    }
    if (p.invulnerable > 0) continue;

    if (s.orientation === 'down') {
      const pLeft = p.x - 13, pRight = p.x + 13;
      const sLeft = s.x - s.halfW, sRight = s.x + s.halfW;
      if (pRight < sLeft || pLeft > sRight) continue;
      // Underside spike hanging below platform bottom `s.y` (`s.y + 2 .. s.y + s.hitH`)
      const pTop = p.y - 60, pBot = p.y - 14;
      const sTop = s.y + 2, sBot = s.y + s.hitH;
      if (p.y > s.y + 8 && pBot >= sTop && pTop <= sBot) {
        const cfg = window.D2_2_HAZARD_CONFIG || {};
        applyChallengeKnockback(s.x, cfg.spikeKnockForce || 416, cfg.spikeStunSec || 1.10, 'under_spike');
      }
    } else {
      // [피드백 1 반영]:
      // 1) 상면 착지/이동 판정 (`p.y <= s.y + 10`): 정밀 가시 폭(`±s.halfW`) 기준 피격
      // 2) 하단에서 이단 점프를 높게 하여 위쪽 플랫폼 가시/뿌리 영역(`s.y - s.hitH .. s.y + 42`)에 머리가 닿는 경우에도 피격·넉백 작동!
      const isFromBelowHighJump = (p.y > s.y + 10 && !p.ground);
      const extraHalfW = isFromBelowHighJump ? 46 : 0;
      const pLeft = p.x - 13, pRight = p.x + 13;
      const sLeft = s.x - (s.halfW + extraHalfW), sRight = s.x + (s.halfW + extraHalfW);
      if (pRight < sLeft || pLeft > sRight) continue;

      const pTop = p.y - 62, pBot = p.y - 1;
      const sTop = s.y - s.hitH;
      const sBot = isFromBelowHighJump ? (s.y + 42) : (s.y - 2);
      if (pBot >= sTop && pTop <= sBot) {
        const cfg = window.D2_2_HAZARD_CONFIG || {};
        const forcedDir = isFromBelowHighJump ? (p.vx >= 0 ? -1 : 1) : null;
        applyChallengeKnockback(s.x, cfg.spikeKnockForce || 416, cfg.spikeStunSec || 1.10, 'spike', forcedDir);
      }
    }
  }
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
  // 0. Draw Stage 2-2 Spikes / Thorny Sprouts (Top & Underside using official `tentacle_idle` asset)
  const tentIm = (typeof npcImages !== 'undefined') ? npcImages['tentacle_idle'] : null;
  const tMeta = (typeof TENTACLE_META !== 'undefined') ? TENTACLE_META : { frames: 41, fps: 30, cols: 8, anchorX: 128, footY: 242 };
  for (let i = 0; i < challengeSpikes.length; i++) {
    const s = challengeSpikes[i];
    if (s.platformRef) {
      const pl = s.platformRef;
      const a = (typeof renderAlpha === 'number') ? renderAlpha : 1;
      const px = (pl.prevX ?? pl.x) + (pl.x - (pl.prevX ?? pl.x)) * a;
      const py = (pl.prevY ?? pl.y) + (pl.y - (pl.prevY ?? pl.y)) * a;
      s.x = px + (s.localX || 0);
      s.y = s.orientation === 'down' ? (py + 38) : py;
    }
    if (s.x < rCam - 90 || s.x > rCam + viewW + 90) continue;
    ctx.save();
    if (s.orientation === 'down') {
      // Underside thorny spike hanging downward from `s.y`
      ctx.fillStyle = 'rgba(28, 20, 16, 0.38)';
      ctx.beginPath();
      ctx.ellipse(Math.round(s.x), Math.round(s.y - 1), s.halfW + 4, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (tentIm && tentIm.complete && tentIm.naturalWidth > 0) {
        const f = Math.floor((s.anim * tMeta.fps + i * 5) % tMeta.frames);
        const sx = (f % tMeta.cols) * 256;
        const sy = Math.floor(f / tMeta.cols) * 256;
        const sz = s.displaySize || 54;
        ctx.translate(Math.round(s.x), Math.round(s.y - 2));
        ctx.scale(1, -1);
        ctx.drawImage(
          tentIm, sx, sy, 256, 256,
          -Math.round((tMeta.anchorX / 256) * sz),
          -Math.round((tMeta.footY / 256) * sz),
          sz, sz
        );
      } else {
        ctx.fillStyle = '#c92a2a';
        ctx.beginPath();
        ctx.moveTo(s.x - s.halfW - 2, s.y);
        ctx.lineTo(s.x, s.y + s.hitH + 3);
        ctx.lineTo(s.x + s.halfW + 2, s.y);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Top surface thorny spike rooted on `s.y`
      ctx.fillStyle = 'rgba(28, 20, 16, 0.34)';
      ctx.beginPath();
      ctx.ellipse(Math.round(s.x), Math.round(s.y + 1), s.halfW + 4, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (tentIm && tentIm.complete && tentIm.naturalWidth > 0) {
        const f = Math.floor((s.anim * tMeta.fps + i * 5) % tMeta.frames);
        const sx = (f % tMeta.cols) * 256;
        const sy = Math.floor(f / tMeta.cols) * 256;
        const sz = s.displaySize || 54;
        const dx = Math.round(s.x - (tMeta.anchorX / 256) * sz);
        const dy = Math.round(s.y - (tMeta.footY / 256) * sz);
        ctx.drawImage(tentIm, sx, sy, 256, 256, dx, dy, sz, sz);
      } else {
        ctx.fillStyle = '#c92a2a';
        ctx.beginPath();
        ctx.moveTo(s.x - s.halfW - 2, s.y);
        ctx.lineTo(s.x, s.y - s.hitH - 3);
        ctx.lineTo(s.x + s.halfW + 2, s.y);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 2. Draw Stage 2 / 2-2 Challenge Guards (suppress patrol line when hidePatrolLine is true per 2-2 Spec §3-1)
  for (const g of challengeGuards) {
    if (g.x < rCam - 180 || g.x > rCam + viewW + 180) continue;
    if (!g.hidePatrolLine) {
      ctx.save();
      ctx.strokeStyle = g.state === 'warn' ? 'rgba(235, 95, 70, 0.55)' : 'rgba(255, 210, 140, 0.28)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(g.minX, g.y - 2);
      ctx.lineTo(g.maxX, g.y - 2);
      ctx.stroke();
      ctx.restore();
    }

    ellipse(g.x, g.y + 2, 22, 4, '#24342838');
    ellipse(g.x, g.y - 2, 26, 5, g.state === 'warn' ? '#ff6b4a66' : '#d9433044');

    drawChallengeNpcSprite(g.kind, g.clip, g.anim, g.x, g.y, g.face);
  }


  // 1. Draw Stage 2 Knockback Shield Barriers ([A-3 Fix]: zero aerial ghost residue when 'off')
  for (const b of challengeBarriers) {
    if (b.x < rCam - 80 || b.x > rCam + viewW + 80) continue;
    ctx.save();
    const bx = Math.round(b.x - b.width * 0.5);
    const by = Math.round(b.y - b.height);
    // Grounded emitter socket on platform surface
    ctx.fillStyle = '#324638';
    ctx.strokeStyle = '#1d2b21';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx - 4, b.y - 7, b.width + 8, 7, 3.5);
    ctx.fill();
    ctx.stroke();

    if (b.state === 'off') {
      // Only a subtle idle indicator strip on the grounded socket; 0% aerial residue!
      ctx.fillStyle = 'rgba(144, 224, 168, 0.65)';
      ctx.fillRect(bx + 2, b.y - 5, Math.max(4, b.width - 4), 2.5);
    } else if (b.state === 'warn') {
      ctx.globalAlpha = b.alpha;
      const wGrad = ctx.createLinearGradient(bx, by + 6, bx, b.y - 7);
      wGrad.addColorStop(0, 'rgba(255, 212, 59, 0.22)');
      wGrad.addColorStop(1, 'rgba(252, 196, 25, 0.85)');
      ctx.fillStyle = wGrad;
      ctx.strokeStyle = '#ffd43b';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.roundRect(bx + 1, by + 4, b.width - 2, b.height - 11, 7);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.globalAlpha = 1;
      const onGrad = ctx.createLinearGradient(bx, by, bx + b.width, b.y - 7);
      onGrad.addColorStop(0, '#ff6b52');
      onGrad.addColorStop(0.5, '#ff8736');
      onGrad.addColorStop(1, '#e84133');
      ctx.fillStyle = onGrad;
      ctx.strokeStyle = '#fff3bf';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.roundRect(bx, by, b.width, b.height - 7, [8, 8, 3, 3]);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#ffffffdd';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(b.x + 5, by + 14);
      ctx.lineTo(b.x - 5, by + 24);
      ctx.lineTo(b.x + 5, by + 34);
      ctx.stroke();
    }
    ctx.restore();
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
