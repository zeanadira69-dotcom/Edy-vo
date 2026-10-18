// Pustaka gambar teknik untuk Studio: garis putih tipis di atas hitam, label mono, panah, animasi bergerak.
// DLIB(g) dijalankan di Web Worker (lihat studio.html). Koordinat logis 360x640, skala ke 720x1280 otomatis.
// Setiap adegan = function(d,t,D): d = alat gambar, t = detik sejak adegan mulai, D = durasi adegan.
function DLIB(g) {
  const cl = x => Math.min(1, Math.max(0, x));
  const ramp = (t, a, b) => cl((t - a) / (b - a));
  const eo = p => 1 - Math.pow(1 - cl(p), 3);
  const ei = p => cl(p) * cl(p);
  const eio = p => { p = cl(p); return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; };
  const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
  const SANS = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const st = o => {
    o = o || {};
    g.globalAlpha = cl(o.a === undefined ? 1 : o.a);
    g.strokeStyle = o.c || "#fff"; g.lineWidth = o.w || 1.2;
    g.setLineDash(o.dash || []); g.lineJoin = "round"; g.lineCap = "round";
    return o;
  };
  const fillIt = o => {
    if (o.fill) { g.save(); g.globalAlpha = cl(o.fill); g.fillStyle = o.fc || "#fff"; g.fill(); g.restore(); }
    g.globalAlpha = cl(o.a === undefined ? 1 : o.a);
  };
  const d = {
    cl, ramp, eo, ei, eio,
    line(x1, y1, x2, y2, o) { o = st(o); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]); },
    poly(p, o) {
      o = st(o); g.beginPath();
      p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]));
      if (!o.open) g.closePath();
      fillIt(o); g.stroke(); g.setLineDash([]);
    },
    rect(x, y, w, h, o) { d.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o); },
    // batang berarah: persegi panjang di sepanjang garis (x1,y1)-(x2,y2) selebar w
    bar(x1, y1, x2, y2, w, o) {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2;
      d.poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]], o);
    },
    circ(x, y, r, o) {
      o = st(o); g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, Math.PI * 2);
      fillIt(o); g.stroke(); g.setLineDash([]);
    },
    arc(cx, cy, r, a0, a1, o) {
      o = st(o); g.beginPath(); g.arc(cx, cy, r, a0 * Math.PI / 180, a1 * Math.PI / 180, a1 < a0); g.stroke(); g.setLineDash([]);
    },
    head(x, y, ang, o) {
      o = st(o); const s = o.s || 6; g.fillStyle = o.c || "#fff";
      g.beginPath(); g.moveTo(x, y);
      g.lineTo(x - s * Math.cos(ang - .4), y - s * Math.sin(ang - .4));
      g.lineTo(x - s * Math.cos(ang + .4), y - s * Math.sin(ang + .4));
      g.closePath(); g.fill();
    },
    arrow(x1, y1, x2, y2, o) {
      if (Math.abs(x2 - x1) + Math.abs(y2 - y1) < 3) return;
      d.line(x1, y1, x2, y2, o); d.head(x2, y2, Math.atan2(y2 - y1, x2 - x1), o);
    },
    arcArrow(cx, cy, r, a0, a1, o) {
      d.arc(cx, cy, r, a0, a1, o);
      const e = a1 * Math.PI / 180, sg = a1 < a0 ? -1 : 1;
      d.head(cx + r * Math.cos(e), cy + r * Math.sin(e), Math.atan2(Math.cos(e) * sg, -Math.sin(e) * sg), o);
    },
    dot(x, y, o) {
      o = st(o); g.beginPath(); g.arc(x, y, o.r || 3.4, 0, Math.PI * 2);
      if (o.hollow) { g.fillStyle = "#000"; g.fill(); g.stroke(); } else { g.fillStyle = o.c || "#fff"; g.fill(); }
    },
    txt(s, x, y, o) {
      o = o || {}; g.globalAlpha = cl(o.a === undefined ? 1 : o.a);
      const sans = o.f === "s";
      g.font = (sans ? (o.wt || 300) : (o.wt || 400)) + " " + (o.size || 10) + "px " + (sans ? SANS : MONO);
      g.fillStyle = o.c || "#fff"; g.textBaseline = "alphabetic"; g.textAlign = "left";
      const sp = o.sp || 0, ch = Array.from(String(s)), ws = ch.map(c => g.measureText(c).width);
      const tot = ws.reduce((a, b) => a + b + sp, 0) - sp;
      let sx = o.al === "c" ? x - tot / 2 : o.al === "r" ? x - tot : x;
      ch.forEach((c, i) => { g.fillText(c, sx, y); sx += ws[i] + sp; });
    },
    // roda gigi: pusat (x,y), jari-jari r, n gigi, sudut putar rot (radian)
    gear(x, y, r, n, rot, o) {
      const ti = Math.PI * 2 / n, rb = r * .82, p = [];
      for (let i = 0; i < n; i++) {
        const a = rot + i * ti;
        [[0, rb], [.14, r], [.46, r], [.6, rb]].forEach(q => p.push([x + Math.cos(a + q[0] * ti) * q[1], y + Math.sin(a + q[0] * ti) * q[1]]));
      }
      d.poly(p, o);
      d.circ(x, y, r * .22, o);
      d.line(x, y, x + Math.cos(rot) * r * .66, y + Math.sin(rot) * r * .66, Object.assign({}, o, { a: (o && o.a === undefined ? 1 : (o && o.a)) * .6 }));
    },
    // silinder hidrolik dari (x1,y1) ke (x2,y2): laras tetap, batang memanjang
    cyl(x1, y1, x2, y2, lb, o) {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
      const b = Math.min(lb, L * .9), w = (o && o.bw) || 4.5;
      d.poly([[x1 + nx * w, y1 + ny * w], [x1 + ux * b + nx * w, y1 + uy * b + ny * w], [x1 + ux * b - nx * w, y1 + uy * b - ny * w], [x1 - nx * w, y1 - ny * w]], o);
      d.line(x1 + ux * b, y1 + uy * b, x2, y2, Object.assign({}, o, { w: ((o && o.w) || 1.2) * 1.7 }));
      d.dot(x1, y1, { hollow: 1, a: o && o.a, r: 2.6 }); d.dot(x2, y2, { hollow: 1, a: o && o.a, r: 2.6 });
    },
    // garis acuan dengan teks
    label(s, x, y, tx, ty, a, o) {
      o = o || {};
      d.line(x, y, tx, ty, { c: "#8a8a8a", a: .9 * a, w: 1 });
      d.dot(x, y, { a: a, r: 2.2 });
      d.txt(s, tx + (o.dx || 0), ty + (o.dy || 0), { size: o.size || 9, sp: 2.2, al: o.al || "c", a: a });
    },
    clip(x, y, w, h) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); },
    unclip() { g.restore(); },
    tf(x, y, s) { g.save(); g.translate(x, y); g.scale(s, s); },
    end() { g.restore(); },
    // arsiran tanah miring
    soil(x, y, w, h, off, a) {
      d.clip(x, y, w, h);
      for (let k = -h; k < w + h; k += 14) d.line(x + k - off, y + h, x + k - off + h, y, { c: "#5a5a5a", a: a === undefined ? 1 : a, w: 1 });
      d.unclip();
    }
  };
  return d;
}

const PRESET = {};
const PRESET_LABEL = {
  ekskavator: "Ekskavator (boom, lengan, bucket)",
  hidrolik: "Prinsip hidrolik (Pascal)",
  roda_gigi: "Roda gigi dan rasio",
  roda_timba: "Ekskavator roda timba",
  tbm: "Mesin bor terowongan (TBM)"
};
// kata kunci pemilih otomatis (urutan penting: yang lebih spesifik dulu)
const PRESET_KATA = [
  ["roda_timba", /roda timba|bagger|bucket.?wheel|rotary excavator/i],
  ["tbm", /terowongan|tunnel|\btbm\b|mesin bor/i],
  ["hidrolik", /hidrolik|hydraulic|pascal|piston|dongkrak/i],
  ["roda_gigi", /roda gigi|gigi transmisi|\bgear\b|transmisi/i],
  ["ekskavator", /ekskavator|excavator|beko|backhoe|\bboom\b|bucket|lengan alat/i]
];

PRESET.ekskavator = function (d, t, D) {
  const R = Math.PI / 180, DIM = "#7d7d7d", gy = 372, fin = d.eo(d.ramp(t, 0, .8));
  d.txt("EKSKAVATOR", 24, 52, { size: 9, sp: 3, c: DIM, a: fin });
  const SC = 1.18, OX = -40, OY = -52, X = p => [OX + SC * p[0], OY + SC * p[1]];
  d.tf(OX, OY, SC);
  d.line(0, gy, 360, gy, { c: "#8a8a8a", a: .8 * fin, dash: [4, 5] });
  // crawler dan badan
  d.rect(62, 346, 124, 26, { a: .95 * fin, fill: .04 });
  [80, 108, 136, 164].forEach(x => d.circ(x, 359, 8, { a: .8 * fin }));
  d.poly([[74, 346], [74, 322], [88, 314], [190, 314], [190, 346]], { a: .95 * fin, fill: .03 });
  d.poly([[80, 314], [80, 282], [114, 282], [128, 300], [128, 314]], { a: .95 * fin, fill: .03 });
  d.line(86, 290, 108, 290, { c: "#8a8a8a", a: .7 * fin, w: 1 });
  d.rect(62, 320, 14, 24, { a: .8 * fin, fill: .08 });
  const mv = d.eio(d.ramp(t, 1.4, 2.8)), c = t * Math.PI * 2 / 6;
  const a1 = (-34 + 12 * Math.sin(c) * mv) * R, a2 = (52 + 30 * Math.sin(c - 1.2) * mv) * R, a3 = (92 + 48 * Math.sin(c - 2.3) * mv) * R;
  const P0 = [176, 316], L1 = 84, L2 = 58, L3 = 26;
  const P1 = [P0[0] + L1 * Math.cos(a1), P0[1] + L1 * Math.sin(a1)];
  const P2 = [P1[0] + L2 * Math.cos(a2), P1[1] + L2 * Math.sin(a2)];
  const u1 = [Math.cos(a1), Math.sin(a1)], u2 = [Math.cos(a2), Math.sin(a2)], u3 = [Math.cos(a3), Math.sin(a3)];
  const up = u => [u[1], -u[0]];
  const pb = d.ramp(t, .5, 1.1), pa = d.ramp(t, .8, 1.4), pk = d.ramp(t, 1.1, 1.7), pc = d.ramp(t, 1.5, 2.1);
  // silinder (di belakang)
  const U1 = up(u1), U2 = up(u2), U3 = up(u3);
  const bcA = [150, 330], bcB = [P0[0] + .42 * (P1[0] - P0[0]) + U1[0] * 10, P0[1] + .42 * (P1[1] - P0[1]) + U1[1] * 10];
  d.cyl(bcA[0], bcA[1], bcB[0], bcB[1], 40, { a: .85 * pc });
  const acA = [P0[0] + .66 * (P1[0] - P0[0]) + U1[0] * 11, P0[1] + .66 * (P1[1] - P0[1]) + U1[1] * 11];
  const acB = [P1[0] + .3 * (P2[0] - P1[0]) + U2[0] * 9, P1[1] + .3 * (P2[1] - P1[1]) + U2[1] * 9];
  d.cyl(acA[0], acA[1], acB[0], acB[1], 30, { a: .85 * pc });
  const kcA = [P1[0] + .62 * (P2[0] - P1[0]) + U2[0] * 8, P1[1] + .62 * (P2[1] - P1[1]) + U2[1] * 8];
  const kcB = [P2[0] + u3[0] * 9 + U3[0] * 9, P2[1] + u3[1] * 9 + U3[1] * 9];
  d.cyl(kcA[0], kcA[1], kcB[0], kcB[1], 18, { a: .85 * pc, bw: 3.5 });
  // boom, lengan, bucket
  d.bar(P0[0], P0[1], P1[0], P1[1], 11, { a: .95 * pb, fill: .05 });
  d.bar(P1[0], P1[1], P2[0], P2[1], 8, { a: .95 * pa, fill: .05 });
  const lp = (a, b) => [P2[0] + u3[0] * a + U3[0] * -b, P2[1] + u3[1] * a + U3[1] * -b];
  d.poly([lp(0, -8), lp(L3, -10), lp(L3 + 7, 7), lp(2, 10)], { a: .95 * pk, fill: .08 });
  [P0, P1, P2].forEach(p => d.dot(p[0], p[1], { hollow: 1, a: pk, r: 3 }));
  d.end();
  // label (koordinat layar)
  const l1 = d.ramp(t, 2.4, 2.9), l2 = d.ramp(t, 3.2, 3.7), l3 = d.ramp(t, 4.0, 4.5), l4 = d.ramp(t, 5.0, 5.5);
  const mid = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  const m1 = X(mid(P0, P1, .5)), m2 = X(mid(P1, P2, .6)), pb3 = X([P2[0] + u3[0] * 16, P2[1] + u3[1] * 16]);
  const cm = X([(bcA[0] + bcB[0]) / 2, (bcA[1] + bcB[1]) / 2]);
  d.label("BOOM", m1[0], m1[1], 96, 150, l1, { al: "c", dy: -6 });
  d.label("LENGAN", m2[0], m2[1], 250, 130, l2, { al: "c", dy: -6 });
  d.label("BUCKET", pb3[0], pb3[1], 296, 418, l3, { al: "c", dy: 14 });
  d.label("SILINDER HIDROLIK", cm[0], cm[1], 120, 418, l4, { al: "c", dy: 14 });
};

PRESET.hidrolik = function (d, t, D) {
  const DIM = "#7d7d7d", fin = d.eo(d.ramp(t, 0, .8));
  const s = d.eio((1 - Math.cos(Math.max(0, t - 1.6) * Math.PI * 2 / 6)) / 2) * d.ramp(t, 1.6, 2.2);
  const lx = 70, lw = 40, rx = 190, rw = 100, top = 170, base = 340, ch = 304;
  const dL = 64 * s, dR = dL * lw / rw, yL = 210 + dL, yR = 262 - dR;
  d.txt("PRINSIP HIDROLIK", 24, 52, { size: 9, sp: 3, c: DIM, a: fin });
  d.txt("TEKANAN SAMA KE SEGALA ARAH", 24, 74, { size: 9, sp: 2, c: DIM, a: fin * d.ramp(t, .6, 1.2) });
  d.tf(0, 40, 1);
  // cairan
  d.poly([[lx, yL + 8], [lx + lw, yL + 8], [lx + lw, ch], [rx, ch], [rx, yR + 8], [rx + rw, yR + 8], [rx + rw, base], [lx, base]], { w: 0, fill: .14 * fin });
  // wadah
  d.poly([[lx, top], [lx, base], [rx + rw, base], [rx + rw, top]], { a: fin, open: true });
  d.poly([[lx + lw, top], [lx + lw, ch], [rx, ch], [rx, top]], { a: fin, open: true });
  // piston kecil + batang
  d.rect(lx + 1, yL, lw - 2, 8, { a: fin, fill: .3 });
  d.line(lx + lw / 2, yL, lx + lw / 2, 118, { a: fin, w: 2 });
  // piston besar + beban
  d.rect(rx + 1, yR, rw - 2, 8, { a: fin, fill: .3 });
  d.rect(rx + 22, yR - 46, rw - 44, 46, { a: fin, fill: .06 });
  d.txt("BEBAN", rx + rw / 2, yR - 18, { size: 9, sp: 2.5, al: "c", a: fin * d.ramp(t, 1.0, 1.5) });
  // panah tekanan di dalam cairan
  const pr = d.ramp(t, 2.4, 3.0);
  [[lx + 20, (yL + 8 + base) / 2], [150, ch + 14], [rx + 25, (yR + 8 + base) / 2], [rx + 75, (yR + 8 + base) / 2]].forEach((p, i) => {
    const w = (Math.sin(t * 2.2 + i) * .5 + .5) * .4 + .5;
    d.arrow(p[0], p[1], p[0] - 10, p[1] - 0, { a: .55 * pr * w, w: 1 });
    d.arrow(p[0], p[1], p[0] + 10, p[1], { a: .55 * pr * w, w: 1 });
    d.arrow(p[0], p[1], p[0], p[1] + 10, { a: .55 * pr * w, w: 1 });
  });
  // gaya
  const f = d.ramp(t, 1.2, 1.8);
  d.arrow(lx + lw / 2, 80 + 8 * s, lx + lw / 2, 112 + 8 * s, { a: f });
  d.txt("F1", lx + lw / 2 + 10, 98, { size: 10, a: f });
  d.txt("A1 KECIL", lx + lw / 2, top - 10 + 0, { size: 8, sp: 2, al: "c", c: DIM, a: f });
  d.arrow(rx + rw + 22, 250, rx + rw + 22, 168, { a: f, w: 1.8 });
  d.txt("F2", rx + rw + 30, 205, { size: 10, a: f });
  d.txt("A2 BESAR", rx + rw / 2, top - 10, { size: 8, sp: 2, al: "c", c: DIM, a: f });
  // rumus
  const e = d.ramp(t, 3.4, 4.0);
  d.txt("F2 = F1 × A2 / A1", 180, 392, { size: 12, sp: 2, al: "c", a: e });
  d.txt("GAYA KECIL, BEBAN BESAR", 180, 418, { size: 9, sp: 3, al: "c", c: DIM, a: e });
  d.end();
};

PRESET.roda_gigi = function (d, t, D) {
  const DIM = "#7d7d7d", fin = d.eo(d.ramp(t, 0, .8)), w = 1.1;
  d.txt("RODA GIGI", 24, 52, { size: 9, sp: 3, c: DIM, a: fin });
  const nA = 18, nB = 10, nC = 14, rA = 54, rB = 30, rC = 42;
  const A = [110, 250], B = [A[0] + (rA + rB) * .91, 250], C = [B[0] + (rB + rC) * .91, 250];
  const rot = Math.max(0, t - .4) * d.eio(d.ramp(t, .4, 1.6));
  const tiB = Math.PI * 2 / nB, tiC = Math.PI * 2 / nC;
  const rotB = Math.PI - rot * nA / nB - .1 * tiB, rotC = Math.PI - rotB * nB / nC - .1 * tiC;
  d.gear(A[0], A[1], rA, nA, rot, { a: .95 * fin });
  d.gear(B[0], B[1], rB, nB, rotB, { a: .95 * fin });
  d.gear(C[0], C[1], rC, nC, rotC, { a: .95 * fin });
  const a1 = d.ramp(t, 1.8, 2.4), a2 = d.ramp(t, 2.6, 3.2), a3 = d.ramp(t, 3.6, 4.2);
  d.arcArrow(A[0], A[1], rA + 14, -150, -100, { a: a1, w: 1.2 });
  d.arcArrow(B[0], B[1], rB + 14, -30, -80, { a: a1, w: 1.2 });
  d.txt(nA + " GIGI", A[0], A[1] + rA + 32, { size: 9, sp: 1.5, al: "c", a: a1 });
  d.txt(nB + " GIGI", B[0], B[1] + rB + 32, { size: 9, sp: 1.5, al: "c", a: a1 });
  d.txt(nC + " GIGI", C[0], C[1] + rC + 32, { size: 9, sp: 1.5, al: "c", a: a1 });
  // rpm menghitung naik
  const k = d.eo(d.ramp(t, 2.6, 3.8));
  const rp = [Math.round(100), Math.round(100 * nA / nB * k), Math.round(100 * nA / nC * k)];
  [[A, rA], [B, rB], [C, rC]].forEach((q, n) => d.txt(rp[n] + " RPM", q[0][0], q[0][1] + q[1] + 50, { size: 10, wt: 500, sp: 1, al: "c", a: a2 }));
  d.txt("GIGI KECIL BERPUTAR LEBIH CEPAT", 180, 410, { size: 9, sp: 2.5, al: "c", a: a3 });
  d.txt("RASIO = " + nA + " : " + nB, 180, 436, { size: 13, wt: 500, sp: 3, al: "c", a: a3 });
};

PRESET.roda_timba = function (d, t, D) {
  const DIM = "#7d7d7d", gy = 392, fin = d.eo(d.ramp(t, 0, .8));
  d.txt("RODA TIMBA", 24, 52, { size: 9, sp: 3, c: DIM, a: fin });
  d.line(16, gy, 344, gy, { c: "#8a8a8a", a: .8 * fin, dash: [4, 5] });
  // tebing galian
  const bench = d.eo(d.ramp(t, .2, 1.0));
  d.poly([[326, gy], [326, 318], [338, 312], [360, 312], [360, gy]], { a: .9 * bench, fill: .04 });
  d.soil(326, 312, 34, gy - 312, 0, .6 * bench);
  // crawler dan badan
  d.rect(50, 362, 112, 30, { a: .95 * fin, fill: .04 });
  [68, 98, 128, 150].forEach(x => d.circ(x, 377, 8, { a: .8 * fin }));
  d.rect(66, 326, 80, 36, { a: .95 * fin, fill: .03 });
  // tiang dan boom
  const Pb = [106, 300], M = [106, 196], Wc = [284, 330], C = [30, 288];
  d.poly([[78, 326], [M[0], M[1]], [134, 326]], { a: .9 * fin, fill: .02 });
  d.line(M[0], M[1], Wc[0], Wc[1], { c: "#8a8a8a", a: .8 * fin, w: 1 });
  d.line(M[0], M[1], C[0], C[1], { c: "#8a8a8a", a: .8 * fin, w: 1 });
  d.bar(C[0], C[1], Pb[0], Pb[1], 8, { a: .95 * fin, fill: .04 });
  d.rect(14, 292, 28, 26, { a: .9 * fin, fill: .1 });
  d.bar(Pb[0], Pb[1], Wc[0] - 10, Wc[1] - 2, 12, { a: .95 * fin, fill: .04 });
  // konveyor: bongkahan bergerak ke arah mesin
  const cv = d.ramp(t, 1.6, 2.2);
  const bx = Wc[0] - 10 - Pb[0], by = Wc[1] - 2 - Pb[1];
  for (let i = 0; i < 9; i++) {
    const p = (i / 9 + t * .14) % 1, x = Pb[0] + bx * (1 - p), y = Pb[1] + by * (1 - p);
    d.circ(x, y - 9, 2.4 + (i % 3) * .5, { a: .85 * cv * Math.min(1, p * 8) * Math.min(1, (1 - p) * 8) + 0, fill: .5 });
  }
  // roda
  const rot = Math.max(0, t - .6) * .9 * d.eio(d.ramp(t, .6, 1.8)), r = 38, wa = d.ramp(t, .4, 1.0);
  d.circ(Wc[0], Wc[1], r, { a: .95 * wa, fill: .03 });
  d.circ(Wc[0], Wc[1], 7, { a: .95 * wa });
  for (let i = 0; i < 8; i++) {
    const a = rot + i * Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
    d.line(Wc[0] + ca * 7, Wc[1] + sa * 7, Wc[0] + ca * r, Wc[1] + sa * r, { a: .6 * wa, w: 1 });
    const o1 = [Wc[0] + Math.cos(a - .16) * r, Wc[1] + Math.sin(a - .16) * r], o2 = [Wc[0] + Math.cos(a + .16) * r, Wc[1] + Math.sin(a + .16) * r];
    const p1 = [Wc[0] + Math.cos(a - .2) * (r + 11), Wc[1] + Math.sin(a - .2) * (r + 11)], p2 = [Wc[0] + Math.cos(a + .1) * (r + 11), Wc[1] + Math.sin(a + .1) * (r + 11)];
    d.poly([o1, p1, p2, o2], { a: .95 * wa, fill: .14 });
  }
  d.arcArrow(Wc[0], Wc[1], r + 24, -140, -60, { a: d.ramp(t, 1.8, 2.4), w: 1.2 });
  // label
  d.label("RODA TIMBA", Wc[0] - 8, Wc[1] - r - 11, 250, 238, d.ramp(t, 2.4, 2.9), { al: "c", dy: -6 });
  d.label("KONVEYOR", 190, 316, 190, 252, d.ramp(t, 3.2, 3.7), { al: "c", dy: -6 });
  d.label("KONTRA BERAT", 28, 292, 62, 244, d.ramp(t, 4.0, 4.5), { al: "c", dy: -6 });
  d.txt("TANAH DIKIKIS, DIANGKUT, DIBUANG", 180, 436, { size: 9, sp: 2, al: "c", a: d.ramp(t, 4.8, 5.4) });
};

PRESET.tbm = function (d, t, D) {
  const DIM = "#7d7d7d", fin = d.eo(d.ramp(t, 0, .8)), off = t * 10;
  d.txt("MESIN BOR TEROWONGAN", 24, 52, { size: 9, sp: 3, c: DIM, a: fin });
  const y0 = 196, y1 = 344;
  // tanah di atas dan bawah terowongan
  d.soil(16, 96, 328, y0 - 96, off, .9 * fin);
  d.soil(16, y1, 328, 120, off, .9 * fin);
  d.line(16, y0, 344, y0, { a: .9 * fin }); d.line(16, y1, 344, y1, { a: .9 * fin });
  // lapisan beton (segmen) di belakang mesin, bertambah seiring waktu
  const nseg = 6, cyc = (t * .5) % 1, grow = Math.floor((t * .5) % nseg);
  for (let i = 0; i < nseg; i++) {
    const x = 36 + i * 14, ap = d.ramp(t, .6 + i * .12, .9 + i * .12);
    d.rect(x, y0 + 1, 12, 12, { a: .9 * ap, fill: .16 }); d.rect(x, y1 - 13, 12, 12, { a: .9 * ap, fill: .16 });
  }
  // badan perisai
  const adv = Math.sin(t * 1.3) * 1.5;
  d.rect(122, 214, 150 + adv, 112, { a: .95 * fin, fill: .04 });
  d.line(122, 270, 272 + adv, 270, { c: "#8a8a8a", a: .6 * fin, w: 1, dash: [3, 4] });
  // kepala potong berputar (tampak samping: gigi bergerak naik turun)
  const hx = 272 + adv, ha = d.ramp(t, .5, 1.1);
  d.poly([[hx, 206], [hx + 16, 214], [hx + 16, 326], [hx, 334]], { a: .95 * ha, fill: .1 });
  for (let i = 0; i < 7; i++) {
    const y = 216 + ((i * 17 + t * 46) % 112), s = 1 - Math.abs(y - 270) / 140;
    d.poly([[hx + 16, y - 5], [hx + 26 + s * 3, y], [hx + 16, y + 5]], { a: .95 * ha, fill: .5 });
  }
  d.arcArrow(hx + 6, 270, 58, -40, 40, { a: d.ramp(t, 1.6, 2.2), w: 1.2 });
  // dongkrak dorong
  const jk = d.ramp(t, 1.0, 1.6), ex = 8 + 6 * Math.sin(t * 1.3);
  [236, 270, 304].forEach(y => d.cyl(98, y, 126 + ex * .3, y, 16, { a: .8 * jk, bw: 3.5 }));
  // konveyor pembuang tanah
  const cv = d.ramp(t, 1.6, 2.2);
  d.line(hx + 4, 296, 30, 296, { a: .8 * cv, w: 1.4 });
  for (let i = 0; i < 12; i++) {
    const p = (i / 12 + t * .16) % 1, x = hx + 4 - (hx - 26) * p;
    d.circ(x, 290, 2.6 + (i % 3) * .6, { a: .9 * cv * Math.min(1, p * 8), fill: .5 });
  }
  // label
  d.label("KEPALA POTONG", hx + 12, 226, 262, 160, d.ramp(t, 2.4, 2.9), { al: "c", dy: -6 });
  d.label("SEGMEN BETON", 70, y0 + 7, 70, 140, d.ramp(t, 3.2, 3.7), { al: "c", dy: -6 });
  d.label("DONGKRAK DORONG", 134, 270, 134, 400, d.ramp(t, 4.0, 4.5), { al: "c", dy: 14 });
  d.label("KONVEYOR", 90, 296, 56, 440, d.ramp(t, 4.8, 5.3), { al: "c", dy: 14 });
};
