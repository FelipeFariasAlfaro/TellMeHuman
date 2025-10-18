//VELOCIMETRO
// ---------- Gauge con control de orientación (up / down) ----------
let gauge = {
    canvas: null,
    ctx: null,
    cssW: 300,
    cssH: 160,
    dpr: 1,
    currentValue: 0,
    animId: null,
    flippedX: false,
    arcUp: true
};

// Detecta si algún transform CSS tiene scaleX negativo
function getCssTransformScaleX(el) {
    try {
        const cs = window.getComputedStyle(el);
        const tf = cs.transform || cs.webkitTransform || 'none';
        if (!tf || tf === 'none') return 1;
        const m = tf.match(/matrix\(([-0-9.e]+),\s*([-0-9.e]+),\s*([-0-9.e]+),\s*([-0-9.e]+),/);
        if (m) {
            const a = parseFloat(m[1]);
            return isNaN(a) ? 1 : a;
        }
        const m3 = tf.match(/matrix3d\(([-0-9.e, ]+)\)/);
        if (m3) {
            const parts = m3[1].split(',').map(s => parseFloat(s.trim()));
            if (parts.length >= 1 && !isNaN(parts[0])) return parts[0];
        }
        return 1;
    } catch (e) {
        return 1;
    }
}

export function initGauge(canvasId = 'gaugeCanvas', cssW = 300, cssH = 160, opts = { arc: 'up' }) {
    gauge.canvas = document.getElementById(canvasId);
    if (!gauge.canvas) return;
    gauge.cssW = cssW;
    gauge.cssH = cssH;
    gauge.dpr = window.devicePixelRatio || 1;

    // detectar flip horizontal en CSS y si el arco debe ser 'up' (concavidad hacia arriba)
    const scaleX = getCssTransformScaleX(gauge.canvas);
    gauge.flippedX = (scaleX < 0);
    gauge.arcUp = (opts && opts.arc === 'up');

    // tamaño físico del canvas (device pixels) y tamaño CSS
    gauge.canvas.style.width = gauge.cssW + 'px';
    gauge.canvas.style.height = gauge.cssH + 'px';
    gauge.canvas.width = Math.round(gauge.cssW * gauge.dpr);
    gauge.canvas.height = Math.round(gauge.cssH * gauge.dpr);

    gauge.ctx = gauge.canvas.getContext('2d');
    // reset transform and scale for HiDPI: draw in CSS pixels
    gauge.ctx.setTransform(1, 0, 0, 1, 0, 0);
    gauge.ctx.scale(gauge.dpr, gauge.dpr);

    gauge.currentValue = 0;
    drawGaugeFrame(0);
}

// color helpers
function hexToRgb(hex) {
    const c = hex.replace('#', '');
    return { r: parseInt(c.substring(0, 2), 16), g: parseInt(c.substring(2, 4), 16), b: parseInt(c.substring(4, 6), 16) };
}

function lerpColor(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    const r = Math.round(A.r + (B.r - A.r) * t);
    const g = Math.round(A.g + (B.g - A.g) * t);
    const bl = Math.round(A.b + (B.b - A.b) * t);
    return `rgb(${r},${g},${bl})`;
}

function valueToColor(v) {
    v = Math.max(0, Math.min(100, v));
    if (v <= 50) {
        const t = v / 50;
        return lerpColor('#28a745', '#ffc107', t);
    } else {
        const t = (v - 50) / 50;
        return lerpColor('#ffc107', '#dc3545', t);
    }
}


export function drawGaugeFrame(value) {
    if (!gauge.ctx || !gauge.canvas) return;
    const ctx = gauge.ctx;
    const w = gauge.cssW;
    const h = gauge.cssH;

    ctx.clearRect(0, 0, w, h);

    // geometría
    const cx = w / 2;
    const cy = gauge.arcUp ? (h * 0.86) : (h * 0.14);
    const radius = Math.min(w * 0.42, h * 0.72);
    const arcWidth = Math.max(10, radius * 0.12);

    // mapping visual: 0 (izq) -> leftAngle = PI ; 100 (der) -> rightAngle = 0
    const leftAngle = Math.PI;
    const rightAngle = 0;

    // normaliza y respeta flippedX
    const pct = Math.max(0, Math.min(100, value)) / 100;
    const effectivePct = gauge.flippedX ? (1 - pct) : pct;
    const targetAngle = leftAngle + (rightAngle - leftAngle) * effectivePct;

    // dibuja arco de fondo (completo) según arcUp/arcDown
    const drawStart = gauge.arcUp ? Math.PI : 0;
    const drawEnd = gauge.arcUp ? 0 : Math.PI;
    ctx.lineWidth = arcWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#e6e6e6';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, drawStart, drawEnd, false);
    ctx.stroke();

    // ---------- dibujar arco coloreado por segmentos (si target > leftAngle visualmente) ----------
    // calculamos el span entre leftAngle y rightAngle (puede ser negativo)
    const angleSpan = rightAngle - leftAngle; // normalmente negative (-PI)
    // fraction to draw (0..1)
    const frac = effectivePct;
    if (frac > 0) {
        // cuantos segmentos: dinámico según radio para suavidad
        const segCount = Math.max(32, Math.round(radius * 1.2));
        ctx.lineWidth = arcWidth;
        ctx.lineCap = 'butt'; // para que segmentos encajen sin redondeos
        // dibujar segmentos desde leftAngle hacia targetAngle
        for (let i = 0; i < segCount; i++) {
            const t0 = (i / segCount) * frac;
            const t1 = ((i + 1) / segCount) * frac;
            if (t1 <= t0) continue;
            const ang0 = leftAngle + angleSpan * t0;
            const ang1 = leftAngle + angleSpan * t1;
            // color del segmento (midpoint)
            const midPct = (t0 + t1) / 2;
            const color = valueToColor(midPct * 100);
            ctx.strokeStyle = color;
            // si angleSpan < 0, debemos dibujar anticlockwise = true para ir por la ruta corta
            const anticlockwise = angleSpan < 0;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, ang0, ang1, anticlockwise);
            ctx.stroke();
        }
        // restaurar lineCap
        ctx.lineCap = 'round';
    }

    // ---------- dibujar ticks y labels POR ENCIMA del arco coloreado ----------
    const outerArc = radius + (arcWidth / 2);
    for (let t = 0; t <= 100; t += 5) {
        const tickPct = gauge.flippedX ? (1 - t / 100) : (t / 100);
        // mapping visual: leftAngle -> rightAngle
        const ang = leftAngle + (rightAngle - leftAngle) * tickPct;
        const isBig = (t % 10 === 0);
        const tickLen = isBig ? Math.max(12, radius * 0.12) : Math.max(7, radius * 0.07);
        const inner = outerArc - tickLen;
        const outer = outerArc + 2;

        const x1 = cx + Math.cos(ang) * inner;
        const y1 = cy + Math.sin(ang) * inner;
        const x2 = cx + Math.cos(ang) * outer;
        const y2 = cy + Math.sin(ang) * outer;

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#666';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        if (isBig) {
            const labelRadius = inner - Math.max(10, radius * 0.12);
            const lx = cx + Math.cos(ang) * labelRadius;
            const ly = cy + Math.sin(ang) * labelRadius;
            ctx.fillStyle = '#222';
            ctx.font = `${Math.max(10, radius * 0.11)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(t), lx, ly);
        }
    }

    // ---------- aguja (al final, para quedar encima) ----------
    const innerArc = radius - (arcWidth / 2);
    const needleMargin = 6;
    const needleLen = Math.max(0, innerArc - needleMargin);
    const nx = cx + Math.cos(targetAngle) * needleLen;
    const ny = cy + Math.sin(targetAngle) * needleLen;

    ctx.fillStyle = '#222';
    ctx.beginPath();
    const baseWidth = Math.max(4, radius * 0.03);
    const perpX = -Math.sin(targetAngle);
    const perpY = Math.cos(targetAngle);
    const tipX = nx, tipY = ny;
    const baseLeftX = cx + perpX * (baseWidth / 2);
    const baseLeftY = cy + perpY * (baseWidth / 2);
    const baseRightX = cx - perpX * (baseWidth / 2);
    const baseRightY = cy - perpY * (baseWidth / 2);
    ctx.moveTo(baseLeftX, baseLeftY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(baseRightX, baseRightY);

    const tailLen = Math.max(10, radius * 0.06);
    const tailX = cx - Math.cos(targetAngle) * tailLen;
    const tailY = cy - Math.sin(targetAngle) * tailLen;
    ctx.lineTo(tailX - perpX * (baseWidth / 2), tailY - perpY * (baseWidth / 2));
    ctx.lineTo(tailX + perpX * (baseWidth / 2), tailY + perpY * (baseWidth / 2));
    ctx.closePath();
    ctx.fill();

    // centro
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(5, radius * 0.06), 0, Math.PI * 2);
    ctx.fill();
}


export function animateGaugeTo(target, duration = 700) {
    if (!gauge.ctx) return;
    target = Math.max(0, Math.min(100, target));
    if (gauge.animId) cancelAnimationFrame(gauge.animId);

    const start = performance.now();
    const from = gauge.currentValue;
    const delta = target - from;

    function step(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = from + delta * eased;
        gauge.currentValue = v;
        drawGaugeFrame(v);
        const pEl = document.getElementById('gaugePercent');
        if (pEl) pEl.innerText = `${Math.round(v)}%`;
        if (t < 1) gauge.animId = requestAnimationFrame(step);
        else { gauge.currentValue = target; gauge.animId = null; }
    }
    gauge.animId = requestAnimationFrame(step);
}
