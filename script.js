    // === CONFIG ===
const CONFIG = {
  MAX_PARTICLES: 300,
  MAX_SPARKS: 200,
  MAX_EMBERS: 150,
  MAX_LIGHTNING: 25,
  MANDALA_SEGMENTS: 24,
  PORTAL_RINGS: 6,
  ENERGY_THREADS: 8
};

// === MYSTICAL SYMBOLS ===
const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟᚪᚫᚣᛠ';
const SYMBOLS = '⍟⎈⌬⏣⎔⏢⌖⍜⎊⏥◈◇△▽⬡⬢✧⚝☉☽♄♃♂☿♀⚹✴❋';
const SACRED = '☯☸✡⚛⚕♾∞◎⊕⊗⊙◉⦿⊚⊛⊜⊝';

// === SETUP ===
const cam = document.getElementById('cam');
const fx = document.getElementById('fx');
const glow = document.getElementById('glow');
const sparksCanvas = document.getElementById('sparks');
const c = fx.getContext('2d');
const g = glow.getContext('2d');
const s = sparksCanvas.getContext('2d');

let W, H;
function resize() {
  W = innerWidth; H = innerHeight;
  fx.width = W; fx.height = H;
  sparksCanvas.width = W; sparksCanvas.height = H;
  glow.width = W >> 1; glow.height = H >> 1;
}
resize();
addEventListener('resize', resize);

// === STATE ===
let time = 0;
let leftHand = null, rightHand = null;
let leftData = null, rightData = null;
let prevLeftPos = null, prevRightPos = null;

// Effects
let particles = [];
let sparks = [];
let embers = [];
let portals = [];
let lightnings = [];

// Screen effects
let flash = 0;
let shake = 0;

// Pulling state
let pullState = { active: false, distance: 0, energy: 0, startDist: 0 };

// FPS counter
let frames = 0, lastSec = 0;

// === HAND DATA PROCESSING ===
function getHandData(landmarks) {
  if (!landmarks) return null;
  
  const palm = landmarks[9];
  const wrist = landmarks[0];
  const thumb = landmarks[4];
  const index = landmarks[8];
  const middle = landmarks[12];
  const ring = landmarks[16];
  const pinky = landmarks[20];
  
  const fingerTips = [thumb, index, middle, ring, pinky];
  const fingerBases = [landmarks[2], landmarks[5], landmarks[9], landmarks[13], landmarks[17]];
  
  const fingersExtended = [];
  
  // Thumb
  const thumbExtended = Math.abs(thumb.x - wrist.x) > Math.abs(landmarks[2].x - wrist.x) * 1.2;
  fingersExtended.push(thumbExtended);
  
  // Other fingers
  for (let i = 1; i < 5; i++) {
    const tipY = fingerTips[i].y;
    const pipY = landmarks[5 + (i-1) * 4 + 1].y;
    fingersExtended.push(tipY < pipY - 0.02);
  }
  
  const extendedCount = fingersExtended.filter(Boolean).length;
  
  let gesture = 'none';
  if (extendedCount === 0) {
    gesture = 'fist';
  } else if (extendedCount === 1 && fingersExtended[1]) {
    gesture = 'pointing';
  } else if (extendedCount >= 4) {
    gesture = 'openPalm';
  } else if (extendedCount === 2 && fingersExtended[1] && fingersExtended[2]) {
    gesture = 'peace';
  } else {
    gesture = 'partial';
  }
  
  const palmPos = { x: (1 - palm.x) * W, y: palm.y * H };
  const indexPos = { x: (1 - index.x) * W, y: index.y * H };
  const wristPos = { x: (1 - wrist.x) * W, y: wrist.y * H };
  
  const palmSize = Math.hypot(
    (landmarks[5].x - landmarks[17].x) * W,
    (landmarks[5].y - landmarks[17].y) * H
  );
  
  return {
    palm: palmPos,
    index: indexPos,
    wrist: wristPos,
    gesture,
    extendedCount,
    fingersExtended,
    palmSize,
    landmarks
  };
}

// === PARTICLE SYSTEMS ===
function addParticle(x, y, vx, vy, size, life, hue, type = 'normal') {
  if (particles.length >= CONFIG.MAX_PARTICLES) particles.shift();
  particles.push({ 
    x, y, vx, vy, size, life, maxLife: life, hue, type,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.2,
    flickerPhase: Math.random() * Math.PI * 2
  });
}

function addSpark(x, y, vx, vy, hue, size = 3) {
  if (sparks.length >= CONFIG.MAX_SPARKS) sparks.shift();
  sparks.push({ 
    x, y, vx, vy, life: 1, hue, size,
    trail: [{ x, y }],
    flickerSpeed: 5 + Math.random() * 10
  });
}

function addEmber(x, y, vx, vy) {
  if (embers.length >= CONFIG.MAX_EMBERS) embers.shift();
  embers.push({
    x, y, vx, vy,
    life: 1,
    size: 2 + Math.random() * 4,
    hue: 25 + Math.random() * 30,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 2 + Math.random() * 3
  });
}

function addLightning(x1, y1, x2, y2, branches = 3) {
  if (lightnings.length >= CONFIG.MAX_LIGHTNING) lightnings.shift();
  lightnings.push({
    points: generateLightningPoints(x1, y1, x2, y2, branches),
    life: 1,
    hue: 35 + Math.random() * 15
  });
}

function generateLightningPoints(x1, y1, x2, y2, depth) {
  if (depth === 0) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
  
  const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * Math.abs(x2 - x1) * 0.5;
  const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * Math.abs(y2 - y1) * 0.5;
  
  const left = generateLightningPoints(x1, y1, midX, midY, depth - 1);
  const right = generateLightningPoints(midX, midY, x2, y2, depth - 1);
  
  return [...left, ...right.slice(1)];
}

// === PORTAL CLASS ===
class Portal {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = 0;
    this.targetR = Math.max(100, Math.min(250, r));
    this.rot = 0;
    this.life = 1;
    this.age = 0;
    this.runeOffset = Math.random() * RUNES.length;
    this.symbolOffset = Math.random() * SYMBOLS.length;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }
  
  update(dt) {
    this.age += dt;
    this.rot += 0.025;
    this.r += (this.targetR - this.r) * 0.08;
    
    if (this.age > 8) this.life -= 0.015;
    
    // Emit ambient sparks
    if (Math.random() < 0.5 && this.life > 0.3) {
      const angle = Math.random() * Math.PI * 2;
      const dist = this.r * (0.9 + Math.random() * 0.3);
      addEmber(
        this.x + Math.cos(angle) * dist,
        this.y + Math.sin(angle) * dist,
        Math.cos(angle) * 2 + (Math.random() - 0.5) * 2,
        Math.sin(angle) * 2 - Math.random() * 3
      );
    }
  }
  
  draw() {
    if (this.life <= 0) return;
    
    const { x, y, r, rot, life, age } = this;
    const pulse = 1 + Math.sin(time * 4 + this.pulsePhase) * 0.03;
    const rr = r * pulse;
    
    c.save();
    c.globalAlpha = Math.min(1, life, this.r / 40);
    c.translate(x, y);
    
    // === OUTER FIRE RING ===
    const flames = 48;
    for (let i = 0; i < flames; i++) {
      const a = (i / flames) * Math.PI * 2 + time * 0.3;
      const flicker = Math.sin(time * 12 + i * 2.1) * 0.4 + 0.6;
      const h = (30 + Math.sin(time * 6 + i * 1.3) * 15) * flicker;
      
      c.save();
      c.rotate(a);
      c.translate(rr, 0);
      c.rotate(Math.PI / 2);
      
      for (let layer = 0; layer < 4; layer++) {
        const grad = c.createLinearGradient(0, 0, 0, h * (1 - layer * 0.15));
        const alpha = (1 - layer * 0.25) * life * flicker;
        grad.addColorStop(0, `hsla(${55 - layer * 12}, 100%, ${95 - layer * 15}%, ${alpha})`);
        grad.addColorStop(0.3, `hsla(${40 - layer * 8}, 100%, ${70 - layer * 12}%, ${alpha * 0.8})`);
        grad.addColorStop(0.7, `hsla(${25 - layer * 5}, 100%, ${50 - layer * 10}%, ${alpha * 0.4})`);
        grad.addColorStop(1, 'transparent');
        
        c.fillStyle = grad;
        c.beginPath();
        const w = 10 - layer * 2;
        c.moveTo(-w, 0);
        c.bezierCurveTo(-w * 0.5, h * 0.3, -w * 0.3, h * 0.7, 0, h * (1 - layer * 0.15));
        c.bezierCurveTo(w * 0.3, h * 0.7, w * 0.5, h * 0.3, w, 0);
        c.fill();
      }
      c.restore();
    }
    
    // === CONCENTRIC RINGS ===
    for (let i = 0; i < CONFIG.PORTAL_RINGS; i++) {
      const ringR = rr * (0.4 + i * 0.1);
      const ringRot = rot * (2 - i * 0.25) * (i % 2 ? 1 : -1);
      const ringAlpha = (1 - i * 0.12) * life;
      
      c.save();
      c.rotate(ringRot);
      
      c.shadowColor = `hsla(${40 + i * 3}, 100%, 60%, 0.8)`;
      c.shadowBlur = 15 - i * 2;
      
      c.strokeStyle = `hsla(${35 + i * 5}, 100%, ${75 - i * 5}%, ${ringAlpha})`;
      c.lineWidth = 4 - i * 0.4;
      c.setLineDash([ringR * 0.15, ringR * 0.05, ringR * 0.05, ringR * 0.05]);
      c.lineDashOffset = time * 50 * (i % 2 ? 1 : -1);
      c.beginPath();
      c.arc(0, 0, ringR, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      
      const notches = 8 + i * 4;
      for (let j = 0; j < notches; j++) {
        const na = (j / notches) * Math.PI * 2;
        c.save();
        c.rotate(na);
        c.fillStyle = `hsla(45, 100%, 80%, ${ringAlpha * 0.8})`;
        c.fillRect(ringR - 6, -1.5, 12, 3);
        c.restore();
      }
      
      c.restore();
    }
    
    // === RUNE RING ===
    c.save();
    c.rotate(-rot * 0.4);
    const runeR = rr * 0.75;
    const runeCount = 16;
    c.font = `bold ${rr * 0.08}px Georgia`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    
    for (let i = 0; i < runeCount; i++) {
      const a = (i / runeCount) * Math.PI * 2;
      const rx = Math.cos(a) * runeR;
      const ry = Math.sin(a) * runeR;
      const runeIdx = Math.floor(this.runeOffset + i) % RUNES.length;
      const glow = Math.sin(time * 3 + i * 0.5) * 0.3 + 0.7;
      
      c.save();
      c.translate(rx, ry);
      c.rotate(a + Math.PI / 2);
      c.fillStyle = `hsla(45, 100%, ${70 + glow * 20}%, ${life * glow})`;
      c.shadowColor = `hsla(40, 100%, 70%, ${life})`;
      c.shadowBlur = 10;
      c.fillText(RUNES[runeIdx], 0, 0);
      c.restore();
    }
    c.restore();
    
    // === SYMBOL RING ===
    c.save();
    c.rotate(rot * 0.6);
    const symR = rr * 0.55;
    const symCount = 12;
    c.font = `${rr * 0.1}px serif`;
    
    for (let i = 0; i < symCount; i++) {
      const a = (i / symCount) * Math.PI * 2;
      const sx = Math.cos(a) * symR;
      const sy = Math.sin(a) * symR;
      const symIdx = Math.floor(this.symbolOffset + i) % SYMBOLS.length;
      
      c.fillStyle = `hsla(50, 100%, 85%, ${life * 0.9})`;
      c.fillText(SYMBOLS[symIdx], sx, sy);
    }
    c.restore();
    
    // === SACRED GEOMETRY CENTER ===
    c.save();
    c.rotate(rot * 0.8);
    
    for (let i = 0; i < 2; i++) {
      c.rotate(i * Math.PI / 6);
      c.strokeStyle = `hsla(45, 100%, 75%, ${life * 0.7})`;
      c.lineWidth = 2;
      c.beginPath();
      for (let j = 0; j < 3; j++) {
        const ta = (j / 3) * Math.PI * 2 - Math.PI / 2;
        const tx = Math.cos(ta) * rr * 0.35;
        const ty = Math.sin(ta) * rr * 0.35;
        j === 0 ? c.moveTo(tx, ty) : c.lineTo(tx, ty);
      }
      c.closePath();
      c.stroke();
    }
    c.restore();
    
    // === CENTER VORTEX ===
    const vortexGrad = c.createRadialGradient(0, 0, 0, 0, 0, rr * 0.4);
    vortexGrad.addColorStop(0, `hsla(55, 100%, 98%, ${life})`);
    vortexGrad.addColorStop(0.2, `hsla(50, 100%, 85%, ${life * 0.8})`);
    vortexGrad.addColorStop(0.5, `hsla(40, 100%, 50%, ${life * 0.4})`);
    vortexGrad.addColorStop(1, 'transparent');
    c.fillStyle = vortexGrad;
    c.beginPath();
    c.arc(0, 0, rr * 0.4, 0, Math.PI * 2);
    c.fill();
    
    c.save();
    c.rotate(time * 2);
    for (let i = 0; i < 6; i++) {
      const sa = (i / 6) * Math.PI * 2;
      c.strokeStyle = `hsla(50, 100%, 90%, ${life * 0.5})`;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(0, 0, rr * 0.25, sa, sa + Math.PI / 4);
      c.stroke();
    }
    c.restore();
    
    c.restore();
    
    // Glow layer
    g.save();
    g.fillStyle = `hsla(35, 100%, 55%, ${life * 0.7})`;
    g.beginPath();
    g.arc(x / 2, y / 2, rr / 2, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

// === MANDALA SHIELD CLASS - INSTANT RESPONSE ===
class Mandala {
  constructor(x, y, size, isLeft) {
    this.x = x;
    this.y = y;
    this.size = size * 0.5; // Start at half size for quick appearance
    this.targetSize = size;
    this.rot = 0;
    this.life = 0.8; // Start mostly visible
    this.isLeft = isLeft;
    this.active = true;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }
  
  update(x, y, size, active) {
    this.x = x;
    this.y = y;
    this.targetSize = size;
    this.active = active;
    this.rot += 0.05;
    
    if (active) {
      // FAST appearance
      this.size += (this.targetSize - this.size) * 0.3;
      this.life = Math.min(1, this.life + 0.2);
    } else {
      // Slower fade out
      this.life -= 0.06;
      this.size *= 0.92;
    }
    
    // Emit particles when active
    if (active && Math.random() < 0.5) {
      const angle = Math.random() * Math.PI * 2;
      addEmber(
        this.x + Math.cos(angle) * this.size * 0.95,
        this.y + Math.sin(angle) * this.size * 0.95,
        Math.cos(angle) * 3,
        Math.sin(angle) * 3 - 1
      );
    }
  }
  
  draw() {
    if (this.life <= 0 || this.size < 10) return;
    
    const { x, y, size, rot, life } = this;
    
    c.save();
    c.globalAlpha = life;
    c.translate(x, y);
    
    // === OUTER GLOW ===
    const outerGlow = c.createRadialGradient(0, 0, size * 0.6, 0, 0, size * 1.4);
    outerGlow.addColorStop(0, 'transparent');
    outerGlow.addColorStop(0.5, `hsla(35, 100%, 50%, 0.25)`);
    outerGlow.addColorStop(1, 'transparent');
    c.fillStyle = outerGlow;
    c.beginPath();
    c.arc(0, 0, size * 1.4, 0, Math.PI * 2);
    c.fill();
    
    // === HEXAGONAL PATTERN ===
    c.save();
    c.rotate(rot);
    
    c.strokeStyle = `hsla(40, 100%, 70%, ${life})`;
    c.lineWidth = 3;
    c.shadowColor = `hsla(40, 100%, 60%, 0.8)`;
    c.shadowBlur = 15;
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const hx = Math.cos(a) * size * 0.95;
      const hy = Math.sin(a) * size * 0.95;
      i === 0 ? c.moveTo(hx, hy) : c.lineTo(hx, hy);
    }
    c.closePath();
    c.stroke();
    c.shadowBlur = 0;
    
    for (let layer = 1; layer <= 3; layer++) {
      const layerSize = size * (1 - layer * 0.2);
      c.rotate(Math.PI / 12);
      c.strokeStyle = `hsla(${45 + layer * 5}, 100%, ${65 + layer * 5}%, ${life * (1 - layer * 0.2)})`;
      c.lineWidth = 2.5 - layer * 0.5;
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const hx = Math.cos(a) * layerSize;
        const hy = Math.sin(a) * layerSize;
        i === 0 ? c.moveTo(hx, hy) : c.lineTo(hx, hy);
      }
      c.closePath();
      c.stroke();
    }
    c.restore();
    
    // === SACRED TRIANGLES ===
    c.save();
    c.rotate(-rot * 1.5);
    for (let i = 0; i < 2; i++) {
      c.rotate(Math.PI / 6);
      c.strokeStyle = `hsla(50, 100%, 75%, ${life * 0.8})`;
      c.lineWidth = 2;
      c.beginPath();
      for (let j = 0; j < 3; j++) {
        const ta = (j / 3) * Math.PI * 2 - Math.PI / 2;
        const tx = Math.cos(ta) * size * 0.6;
        const ty = Math.sin(ta) * size * 0.6;
        j === 0 ? c.moveTo(tx, ty) : c.lineTo(tx, ty);
      }
      c.closePath();
      c.stroke();
    }
    c.restore();
    
    // === CONCENTRIC CIRCLES ===
    c.save();
    c.rotate(rot * 0.5);
    for (let i = 0; i < 4; i++) {
      const cr = size * (0.3 + i * 0.15);
      c.strokeStyle = `hsla(${40 + i * 5}, 100%, 70%, ${life * (0.8 - i * 0.15)})`;
      c.lineWidth = 2 - i * 0.3;
      c.setLineDash([cr * 0.1, cr * 0.05]);
      c.lineDashOffset = time * 30 * (i % 2 ? 1 : -1);
      c.beginPath();
      c.arc(0, 0, cr, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
    }
    c.restore();
    
    // === RUNES AROUND EDGE ===
    c.save();
    c.rotate(-rot * 0.3);
    const runeCount = CONFIG.MANDALA_SEGMENTS;
    c.font = `bold ${size * 0.08}px Georgia`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    
    for (let i = 0; i < runeCount; i++) {
      const a = (i / runeCount) * Math.PI * 2;
      const rx = Math.cos(a) * size * 0.8;
      const ry = Math.sin(a) * size * 0.8;
      const glow = Math.sin(time * 4 + i) * 0.3 + 0.7;
      
      c.fillStyle = `hsla(45, 100%, ${70 + glow * 20}%, ${life * glow})`;
      c.fillText(RUNES[i % RUNES.length], rx, ry);
    }
    c.restore();
    
    // === CENTER ===
    const centerGrad = c.createRadialGradient(0, 0, 0, 0, 0, size * 0.25);
    centerGrad.addColorStop(0, `hsla(55, 100%, 95%, ${life})`);
    centerGrad.addColorStop(0.5, `hsla(45, 100%, 70%, ${life * 0.6})`);
    centerGrad.addColorStop(1, 'transparent');
    c.fillStyle = centerGrad;
    c.beginPath();
    c.arc(0, 0, size * 0.25, 0, Math.PI * 2);
    c.fill();
    
    c.font = `${size * 0.15}px serif`;
    c.fillStyle = `hsla(50, 100%, 90%, ${life})`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(SACRED[Math.floor(time) % SACRED.length], 0, 0);
    
    // === ENERGY SPOKES ===
    c.save();
    c.rotate(rot * 2);
    const spokes = 12;
    for (let i = 0; i < spokes; i++) {
      const sa = (i / spokes) * Math.PI * 2;
      const gradient = c.createLinearGradient(0, 0, Math.cos(sa) * size, Math.sin(sa) * size);
      gradient.addColorStop(0, `hsla(50, 100%, 80%, ${life * 0.8})`);
      gradient.addColorStop(0.5, `hsla(40, 100%, 60%, ${life * 0.4})`);
      gradient.addColorStop(1, 'transparent');
      
      c.strokeStyle = gradient;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(Math.cos(sa) * size * 0.2, Math.sin(sa) * size * 0.2);
      c.lineTo(Math.cos(sa) * size * 0.9, Math.sin(sa) * size * 0.9);
      c.stroke();
    }
    c.restore();
    
    c.restore();
    
    // Glow canvas
    g.fillStyle = `hsla(35, 100%, 55%, ${life * 0.6})`;
    g.beginPath();
    g.arc(x / 2, y / 2, size / 2, 0, Math.PI * 2);
    g.fill();
  }
}

// === REALISTIC FIRE TRAIL FOR PORTAL DRAWING ===
let circleTrail = [];
let trailEmbers = [];

function drawRealisticFireTrail(trail) {
  if (trail.length < 2) return;
  
  // Add embers along trail
  for (let i = Math.max(0, trail.length - 5); i < trail.length; i++) {
    if (Math.random() < 0.6) {
      const p = trail[i];
      addEmber(
        p.x + (Math.random() - 0.5) * 20,
        p.y + (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 4,
        -2 - Math.random() * 5
      );
    }
  }
  
  // === MULTIPLE FIRE LAYERS ===
  for (let layer = 4; layer >= 0; layer--) {
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    
    // Create gradient path
    c.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      // Add slight wobble for realism
      const wobbleX = Math.sin(time * 15 + i * 0.5) * (layer * 2);
      const wobbleY = Math.cos(time * 12 + i * 0.7) * (layer * 2);
      
      if (i === 0) {
        c.moveTo(p.x + wobbleX, p.y + wobbleY);
      } else {
        // Smooth curve
        const prev = trail[i - 1];
        const cpx = (prev.x + p.x) / 2 + wobbleX;
        const cpy = (prev.y + p.y) / 2 + wobbleY;
        c.quadraticCurveTo(prev.x + wobbleX, prev.y + wobbleY, cpx, cpy);
      }
    }
    
    // Layer properties
    const layerAlpha = (1 - layer * 0.18);
    const hue = 55 - layer * 12;
    const lightness = 90 - layer * 15;
    const width = 4 + layer * 8;
    
    // Outer glow
    if (layer === 4) {
      c.strokeStyle = `hsla(25, 100%, 40%, 0.15)`;
      c.lineWidth = 60;
      c.filter = 'blur(20px)';
      c.stroke();
      c.filter = 'none';
    }
    
    c.strokeStyle = `hsla(${hue}, 100%, ${lightness}%, ${layerAlpha})`;
    c.lineWidth = width;
    
    if (layer > 2) {
      c.filter = `blur(${layer * 2}px)`;
    }
    
    c.stroke();
    c.filter = 'none';
    c.restore();
  }
  
  // === BRIGHT CORE LINE ===
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  for (let i = 0; i < trail.length; i++) {
    const t = i / trail.length;
    const p = trail[i];
    if (i === 0) {
      c.moveTo(p.x, p.y);
    } else {
      c.lineTo(p.x, p.y);
    }
  }
  c.strokeStyle = `hsla(55, 100%, 97%, 0.95)`;
  c.lineWidth = 3;
  c.stroke();
  c.restore();
  
  // === FLICKERING SPARKS ALONG TRAIL ===
  for (let i = 0; i < trail.length; i += 2) {
    const p = trail[i];
    const t = i / trail.length;
    const flicker = Math.sin(time * 20 + i * 2) * 0.5 + 0.5;
    
    if (flicker > 0.6) {
      const sparkGrad = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8 + flicker * 8);
      sparkGrad.addColorStop(0, `hsla(55, 100%, 98%, ${t * flicker})`);
      sparkGrad.addColorStop(0.5, `hsla(45, 100%, 70%, ${t * flicker * 0.5})`);
      sparkGrad.addColorStop(1, 'transparent');
      c.fillStyle = sparkGrad;
      c.beginPath();
      c.arc(p.x, p.y, 8 + flicker * 8, 0, Math.PI * 2);
      c.fill();
    }
  }
  
  // === TIP INTENSE GLOW ===
  if (trail.length > 0) {
    const tip = trail[trail.length - 1];
    const tipPulse = Math.sin(time * 15) * 0.2 + 0.8;
    
    // Multiple glow layers
    for (let i = 3; i >= 0; i--) {
      const size = (50 - i * 10) * tipPulse;
      const tipGrad = c.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, size);
      tipGrad.addColorStop(0, `hsla(${55 - i * 5}, 100%, ${98 - i * 5}%, ${1 - i * 0.2})`);
      tipGrad.addColorStop(0.4, `hsla(${45 - i * 5}, 100%, ${70 - i * 10}%, ${0.6 - i * 0.1})`);
      tipGrad.addColorStop(1, 'transparent');
      c.fillStyle = tipGrad;
      c.beginPath();
      c.arc(tip.x, tip.y, size, 0, Math.PI * 2);
      c.fill();
    }
    
    // Bright white core
    c.fillStyle = 'rgba(255, 255, 255, 0.95)';
    c.beginPath();
    c.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
    c.fill();
    
    // Random sparks from tip
    if (Math.random() < 0.7) {
      const angle = Math.random() * Math.PI * 2;
      addSpark(
        tip.x,
        tip.y,
        Math.cos(angle) * (3 + Math.random() * 5),
        Math.sin(angle) * (3 + Math.random() * 5) - 2,
        40 + Math.random() * 15,
        2 + Math.random() * 2
      );
    }
  }
  
  // Glow layer
  if (trail.length > 1) {
    g.strokeStyle = `hsla(35, 100%, 55%, 0.5)`;
    g.lineWidth = 25;
    g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      if (i === 0) g.moveTo(p.x / 2, p.y / 2);
      else g.lineTo(p.x / 2, p.y / 2);
    }
    g.stroke();
  }
}

// === CIRCLE DETECTION ===
function detectCircle(trail) {
  if (trail.length < 35) return null;
  
  let cx = 0, cy = 0;
  trail.forEach(p => { cx += p.x; cy += p.y; });
  cx /= trail.length;
  cy /= trail.length;
  
  let avgR = 0;
  trail.forEach(p => avgR += Math.hypot(p.x - cx, p.y - cy));
  avgR /= trail.length;
  
  if (avgR < 60) return null;
  
  let variance = 0;
  trail.forEach(p => variance += Math.abs(Math.hypot(p.x - cx, p.y - cy) - avgR));
  variance /= trail.length;
  const circularity = 1 - variance / avgR;
  
  let totalAngle = 0;
  for (let i = 1; i < trail.length; i++) {
    let a1 = Math.atan2(trail[i-1].y - cy, trail[i-1].x - cx);
    let a2 = Math.atan2(trail[i].y - cy, trail[i].x - cx);
    let da = a2 - a1;
    if (da > Math.PI) da -= Math.PI * 2;
    if (da < -Math.PI) da += Math.PI * 2;
    totalAngle += da;
  }
  const coverage = Math.abs(totalAngle) / (Math.PI * 2);
  
  if (circularity > 0.55 && coverage > 0.7) {
    return { cx, cy, r: avgR };
  }
  
  return null;
}

// === ENERGY STREAM BETWEEN HANDS ===
function drawEnergyStream(x1, y1, x2, y2, intensity) {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const px = -dy / dist, py = dx / dist;
  
  // === MAIN ENERGY THREADS ===
  for (let t = 0; t < CONFIG.ENERGY_THREADS; t++) {
    const amplitude = (50 + t * 25) * intensity;
    const frequency = 0.012 + t * 0.004;
    const phase = t * 1.5;
    const offset = (t - CONFIG.ENERGY_THREADS / 2) * 10;
    
    for (let layer = 0; layer < 3; layer++) {
      c.beginPath();
      c.moveTo(x1 + px * offset, y1 + py * offset);
      
      const steps = 60;
      for (let i = 1; i <= steps; i++) {
        const frac = i / steps;
        const wave = Math.sin(frac * dist * frequency + time * 12 + phase) * amplitude * Math.sin(frac * Math.PI);
        const noise = Math.sin(frac * 25 + time * 18 + t) * 8;
        const wx = x1 + dx * frac + px * (wave + noise + offset);
        const wy = y1 + dy * frac + py * (wave + noise + offset);
        c.lineTo(wx, wy);
      }
      
      c.lineTo(x2 + px * offset, y2 + py * offset);
      
      if (layer === 0) {
        c.strokeStyle = `hsla(${30 + t * 3}, 100%, 40%, ${intensity * 0.25})`;
        c.lineWidth = 18 - t;
      } else if (layer === 1) {
        c.strokeStyle = `hsla(${35 + t * 3}, 100%, 65%, ${intensity * 0.65})`;
        c.lineWidth = 7 - t * 0.5;
      } else {
        c.strokeStyle = `hsla(50, 100%, 92%, ${intensity})`;
        c.lineWidth = 2.5;
      }
      c.stroke();
    }
  }
  
  // === LIGHTNING BOLTS ===
  if (Math.random() < 0.18 * intensity) {
    addLightning(x1, y1, x2, y2, 4);
  }
  
  // === CENTER ENERGY ORB ===
  const orbSize = 60 + intensity * 100;
  const orbPulse = 1 + Math.sin(time * 10) * 0.12;
  
  for (let i = 4; i >= 0; i--) {
    const layerSize = orbSize * orbPulse * (1 + i * 0.35);
    const gradient = c.createRadialGradient(mx, my, 0, mx, my, layerSize);
    gradient.addColorStop(0, `hsla(55, 100%, ${98 - i * 8}%, ${intensity * (1 - i * 0.18)})`);
    gradient.addColorStop(0.3, `hsla(45, 100%, ${70 - i * 10}%, ${intensity * (0.6 - i * 0.1)})`);
    gradient.addColorStop(1, 'transparent');
    c.fillStyle = gradient;
    c.beginPath();
    c.arc(mx, my, layerSize, 0, Math.PI * 2);
    c.fill();
  }
  
  // Rotating rings around center
  c.save();
  c.translate(mx, my);
  for (let i = 0; i < 3; i++) {
    c.rotate(time * (2.5 + i) * (i % 2 ? 1 : -1));
    c.strokeStyle = `hsla(${40 + i * 10}, 100%, 75%, ${intensity * 0.7})`;
    c.lineWidth = 2.5;
    c.beginPath();
    c.ellipse(0, 0, orbSize * 0.7, orbSize * 0.25, i * Math.PI / 3, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
  
  // === END POINT ENERGY SPHERES ===
  [{ x: x1, y: y1 }, { x: x2, y: y2 }].forEach((p, idx) => {
    const endSize = 50 + intensity * 50;
    
    const endGrad = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, endSize * 1.6);
    endGrad.addColorStop(0, `hsla(50, 100%, 97%, ${intensity})`);
    endGrad.addColorStop(0.3, `hsla(40, 100%, 65%, ${intensity * 0.6})`);
    endGrad.addColorStop(0.6, `hsla(30, 100%, 45%, ${intensity * 0.3})`);
    endGrad.addColorStop(1, 'transparent');
    c.fillStyle = endGrad;
    c.beginPath();
    c.arc(p.x, p.y, endSize * 1.6, 0, Math.PI * 2);
    c.fill();
    
    c.fillStyle = `hsla(55, 100%, 98%, ${intensity})`;
    c.beginPath();
    c.arc(p.x, p.y, 10, 0, Math.PI * 2);
    c.fill();
    
    for (let i = 0; i < 5; i++) {
      const oa = time * 7 + i * Math.PI * 2 / 5 + idx * Math.PI;
      const ox = p.x + Math.cos(oa) * endSize * 0.75;
      const oy = p.y + Math.sin(oa) * endSize * 0.75;
      c.fillStyle = `hsla(45, 100%, 85%, ${intensity})`;
      c.beginPath();
      c.arc(ox, oy, 6, 0, Math.PI * 2);
      c.fill();
    }
  });
  
  // Emit particles
  if (Math.random() < 0.5 * intensity) {
    const t = Math.random();
    addEmber(
      x1 + dx * t + (Math.random() - 0.5) * 50,
      y1 + dy * t + (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 4,
      -3 - Math.random() * 4
    );
  }
  
  // Glow
  g.strokeStyle = `hsla(35, 100%, 55%, ${intensity * 0.5})`;
  g.lineWidth = 50;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x1 / 2, y1 / 2);
  g.lineTo(x2 / 2, y2 / 2);
  g.stroke();
  
  g.fillStyle = `hsla(35, 100%, 60%, ${intensity * 0.6})`;
  g.beginPath();
  g.arc(mx / 2, my / 2, orbSize / 2, 0, Math.PI * 2);
  g.fill();
}

// === EXPLOSION EFFECT ===
function triggerExplosion(x, y, power) {
  const particleCount = Math.floor(80 * power);
  const sparkCount = Math.floor(60 * power);
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const speed = (12 + Math.random() * 25) * power;
    const spread = (Math.random() - 0.5) * 0.6;
    addParticle(
      x, y,
      Math.cos(angle + spread) * speed,
      Math.sin(angle + spread) * speed,
      25 + Math.random() * 35,
      1.2 + Math.random() * 0.5,
      25 + Math.random() * 30,
      'burst'
    );
  }
  
  for (let i = 0; i < sparkCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 12 + Math.random() * 30;
    addSpark(
      x + (Math.random() - 0.5) * 30,
      y + (Math.random() - 0.5) * 30,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 4,
      35 + Math.random() * 20,
      4 + Math.random() * 4
    );
  }
  
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const dist = 180 + Math.random() * 120;
    addLightning(x, y, x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 4);
  }
  
  flash = power;
  shake = 60 * power;
}

// === UPDATE ===
function update(dt) {
  time += dt;
  
  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += 0.25;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotSpeed;
    p.life -= dt / p.maxLife;
    if (p.life <= 0) particles.splice(i, 1);
  }
  
  // Update sparks
  for (let i = sparks.length - 1; i >= 0; i--) {
    const sp = sparks[i];
    sp.trail.push({ x: sp.x, y: sp.y });
    if (sp.trail.length > 15) sp.trail.shift();
    sp.vy += 0.18;
    sp.vx *= 0.97;
    sp.vy *= 0.97;
    sp.x += sp.vx;
    sp.y += sp.vy;
    sp.life -= 0.02;
    if (sp.life <= 0) sparks.splice(i, 1);
  }
  
  // Update embers
  for (let i = embers.length - 1; i >= 0; i--) {
    const e = embers[i];
    e.wobble += e.wobbleSpeed * dt;
    e.x += e.vx + Math.sin(e.wobble) * 0.5;
    e.y += e.vy;
    e.vy -= 0.05; // Float upward
    e.vx *= 0.99;
    e.life -= 0.015;
    if (e.life <= 0 || e.y < -50) embers.splice(i, 1);
  }
  
  // Update lightnings
  for (let i = lightnings.length - 1; i >= 0; i--) {
    lightnings[i].life -= 0.12;
    if (lightnings[i].life <= 0) lightnings.splice(i, 1);
  }
  
  // Update portals
  for (let i = portals.length - 1; i >= 0; i--) {
    portals[i].update(dt);
    if (portals[i].life <= 0) portals.splice(i, 1);
  }
  
  // Screen effects decay
  flash *= 0.85;
  shake *= 0.88;
}

// === RENDER ===
let leftMandala = null;
let rightMandala = null;

function render() {
  c.clearRect(0, 0, W, H);
  s.clearRect(0, 0, W, H);
  g.clearRect(0, 0, W >> 1, H >> 1);
  
  // Apply screen shake
  c.save();
  s.save();
  if (shake > 0.5) {
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    c.translate(sx, sy);
    s.translate(sx, sy);
  }
  
  // === DRAW PORTALS ===
  portals.forEach(p => p.draw());
  
  // === DRAW FIRE TRAIL ===
  if (circleTrail.length > 2) {
    drawRealisticFireTrail(circleTrail);
  }
  
  // === DRAW MANDALAS ===
  if (leftMandala && leftMandala.life > 0) leftMandala.draw();
  if (rightMandala && rightMandala.life > 0) rightMandala.draw();
  
  // === DRAW ENERGY STREAM ===
  if (pullState.active && leftData && rightData) {
    drawEnergyStream(
      leftData.palm.x, leftData.palm.y,
      rightData.palm.x, rightData.palm.y,
      pullState.energy
    );
  }
  
  // === DRAW LIGHTNINGS ===
  lightnings.forEach(l => {
    if (l.points.length < 2) return;
    
    for (let layer = 0; layer < 3; layer++) {
      s.beginPath();
      s.moveTo(l.points[0].x, l.points[0].y);
      for (let i = 1; i < l.points.length; i++) {
        s.lineTo(l.points[i].x, l.points[i].y);
      }
      
      if (layer === 0) {
        s.strokeStyle = `hsla(${l.hue}, 100%, 50%, ${l.life * 0.3})`;
        s.lineWidth = 10;
      } else if (layer === 1) {
        s.strokeStyle = `hsla(${l.hue + 10}, 100%, 70%, ${l.life * 0.7})`;
        s.lineWidth = 4;
      } else {
        s.strokeStyle = `hsla(55, 100%, 95%, ${l.life})`;
        s.lineWidth = 1.5;
      }
      s.stroke();
    }
  });
  
  // === DRAW EMBERS ===
  embers.forEach(e => {
    const flicker = Math.sin(time * e.wobbleSpeed * 3 + e.wobble) * 0.3 + 0.7;
    const emberGrad = s.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 2);
    emberGrad.addColorStop(0, `hsla(${e.hue + 20}, 100%, 90%, ${e.life * flicker})`);
    emberGrad.addColorStop(0.4, `hsla(${e.hue}, 100%, 60%, ${e.life * flicker * 0.6})`);
    emberGrad.addColorStop(1, 'transparent');
    s.fillStyle = emberGrad;
    s.beginPath();
    s.arc(e.x, e.y, e.size * 2, 0, Math.PI * 2);
    s.fill();
  });
  
  // === DRAW SPARKS ===
  sparks.forEach(sp => {
    if (sp.trail.length > 1) {
      for (let i = 1; i < sp.trail.length; i++) {
        const t = i / sp.trail.length;
        s.strokeStyle = `hsla(${sp.hue}, 100%, 70%, ${t * sp.life * 0.7})`;
        s.lineWidth = sp.size * t;
        s.lineCap = 'round';
        s.beginPath();
        s.moveTo(sp.trail[i-1].x, sp.trail[i-1].y);
        s.lineTo(sp.trail[i].x, sp.trail[i].y);
        s.stroke();
      }
    }
    
    const flicker = Math.sin(time * sp.flickerSpeed) * 0.3 + 0.7;
    const sparkGrad = s.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.size * 4);
    sparkGrad.addColorStop(0, `hsla(55, 100%, 97%, ${sp.life * flicker})`);
    sparkGrad.addColorStop(0.4, `hsla(${sp.hue}, 100%, 70%, ${sp.life * flicker * 0.5})`);
    sparkGrad.addColorStop(1, 'transparent');
    s.fillStyle = sparkGrad;
    s.beginPath();
    s.arc(sp.x, sp.y, sp.size * 4, 0, Math.PI * 2);
    s.fill();
  });
  
  // === DRAW PARTICLES ===
  particles.forEach(p => {
    const alpha = Math.min(1, p.life * 2);
    const size = p.size * p.life;
    const flicker = Math.sin(time * 10 + p.flickerPhase) * 0.2 + 0.8;
    
    const grad = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
    grad.addColorStop(0, `hsla(55, 100%, 95%, ${alpha * flicker})`);
    grad.addColorStop(0.3, `hsla(${p.hue}, 100%, 65%, ${alpha * flicker * 0.7})`);
    grad.addColorStop(0.7, `hsla(${p.hue - 10}, 100%, 45%, ${alpha * flicker * 0.3})`);
    grad.addColorStop(1, 'transparent');
    
    c.fillStyle = grad;
    c.beginPath();
    c.arc(p.x, p.y, size, 0, Math.PI * 2);
    c.fill();
    
    g.fillStyle = `hsla(${p.hue}, 100%, 50%, ${alpha * 0.3})`;
    g.beginPath();
    g.arc(p.x / 2, p.y / 2, size / 2, 0, Math.PI * 2);
    g.fill();
  });
  
  c.restore();
  s.restore();
  
  // === FLASH OVERLAY ===
  if (flash > 0.01) {
    c.fillStyle = `rgba(255, 200, 100, ${flash * 0.7})`;
    c.fillRect(0, 0, W, H);
  }
}

// === PROCESS HANDS ===
function processHands() {
  leftData = getHandData(leftHand);
  rightData = getHandData(rightHand);
  
  // Update gesture display
  let gestureText = 'None';
  if (leftData) gestureText = `L: ${leftData.gesture}`;
  if (rightData) gestureText += ` R: ${rightData.gesture}`;
  document.getElementById('gestureType').textContent = gestureText;
  
  // Calculate velocities
  let leftVel = 0, rightVel = 0;
  
  if (leftData && prevLeftPos) {
    leftVel = Math.hypot(leftData.palm.x - prevLeftPos.x, leftData.palm.y - prevLeftPos.y);
  }
  if (rightData && prevRightPos) {
    rightVel = Math.hypot(rightData.palm.x - prevRightPos.x, rightData.palm.y - prevRightPos.y);
  }
  
  prevLeftPos = leftData ? { ...leftData.palm } : null;
  prevRightPos = rightData ? { ...rightData.palm } : null;
  
  // === POINTING GESTURE - DRAW PORTAL ===
  let drawingPortal = false;
  
  const isLeftPointing = leftData && leftData.gesture === 'pointing' && !rightData;
  const isRightPointing = rightData && rightData.gesture === 'pointing' && !leftData;
  
  if (isLeftPointing || isRightPointing) {
    const drawHand = isLeftPointing ? leftData : rightData;
    circleTrail.push({ x: drawHand.index.x, y: drawHand.index.y });
    if (circleTrail.length > 100) circleTrail.shift();
    drawingPortal = true;
    
    // Check for completed circle
    const result = detectCircle(circleTrail);
    if (result) {
      if (portals.length >= 4) portals.shift();
      portals.push(new Portal(result.cx, result.cy, result.r));
      circleTrail = [];
      flash = 0.7;
      
      // Celebration burst
      for (let i = 0; i < 80; i++) {
        const a = (i / 80) * Math.PI * 2;
        const spd = 6 + Math.random() * 8;
        addSpark(
          result.cx + Math.cos(a) * result.r,
          result.cy + Math.sin(a) * result.r,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          35 + Math.random() * 20
        );
      }
    }
  } else {
    circleTrail = [];
  }
  
  // === OPEN PALM - MANDALA SHIELD (INSTANT) ===
  if (leftData && leftData.gesture === 'openPalm') {
    const size = Math.max(140, leftData.palmSize * 2.8);
    if (!leftMandala || leftMandala.life <= 0) {
      leftMandala = new Mandala(leftData.palm.x, leftData.palm.y, size, true);
    } else {
      leftMandala.update(leftData.palm.x, leftData.palm.y, size, true);
    }
  } else if (leftMandala && leftMandala.life > 0) {
    leftMandala.update(leftMandala.x, leftMandala.y, leftMandala.size, false);
  }
  
  if (rightData && rightData.gesture === 'openPalm') {
    const size = Math.max(140, rightData.palmSize * 2.8);
    if (!rightMandala || rightMandala.life <= 0) {
      rightMandala = new Mandala(rightData.palm.x, rightData.palm.y, size, false);
    } else {
      rightMandala.update(rightData.palm.x, rightData.palm.y, size, true);
    }
  } else if (rightMandala && rightMandala.life > 0) {
    rightMandala.update(rightMandala.x, rightMandala.y, rightMandala.size, false);
  }
  
  // === TWO HANDS ENERGY PULL ===
  pullState.active = false;
  
  if (leftData && rightData) {
    const dist = Math.hypot(
      leftData.palm.x - rightData.palm.x,
      leftData.palm.y - rightData.palm.y
    );
    
    if (dist < 120) {
      pullState.startDist = dist;
      pullState.energy = 0;
    } else if (dist < 600) {
      pullState.active = true;
      pullState.distance = dist;
      pullState.energy = Math.min(1, (dist - 120) / 400);
      
      if (Math.random() < 0.12 * pullState.energy) {
        addLightning(
          leftData.palm.x, leftData.palm.y,
          rightData.palm.x, rightData.palm.y,
          3
        );
      }
    } else {
      if (pullState.energy > 0.3) {
        const cx = (leftData.palm.x + rightData.palm.x) / 2;
        const cy = (leftData.palm.y + rightData.palm.y) / 2;
        
        if (leftVel > 20 || rightVel > 20) {
          triggerExplosion(cx, cy, pullState.energy);
        }
      }
      pullState.energy = 0;
    }
  }
  
  // === FIST + WAVE = ENERGY BLAST ===
  if (!pullState.active && !drawingPortal) {
    if (leftData && leftData.gesture === 'fist' && leftVel > 40) {
      triggerExplosion(leftData.palm.x, leftData.palm.y, 0.75);
    }
    if (rightData && rightData.gesture === 'fist' && rightVel > 40) {
      triggerExplosion(rightData.palm.x, rightData.palm.y, 0.75);
    }
  }
}

// === ANIMATION LOOP ===
let lastTime = 0;

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  
  frames++;
  if (now - lastSec >= 1000) {
    document.getElementById('fps').textContent = frames;
    frames = 0;
    lastSec = now;
  }
  
  processHands();
  update(dt);
  render();
  
  requestAnimationFrame(loop);
}

// === MEDIAPIPE SETUP ===
const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.75,
  minTrackingConfidence: 0.75
});

hands.onResults(res => {
  leftHand = null;
  rightHand = null;
  
  if (res.multiHandLandmarks && res.multiHandedness) {
    for (let i = 0; i < res.multiHandLandmarks.length; i++) {
      const label = res.multiHandedness[i].label;
      if (label === 'Right') leftHand = res.multiHandLandmarks[i];
      else rightHand = res.multiHandLandmarks[i];
    }
  }
});

const camera = new Camera(cam, {
  onFrame: async () => { await hands.send({ image: cam }); },
  width: 1280,
  height: 720
});

camera.start().then(() => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hide');
    requestAnimationFrame(loop);
  }, 2000);
});