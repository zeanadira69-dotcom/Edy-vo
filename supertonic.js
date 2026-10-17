// Mode "Standar+": Supertonic 3 (ONNX) yang berjalan di browser. Mendukung Indonesia dan Inggris.
// Model (±400 MB) diunduh sekali dari Hugging Face lalu disimpan di Cache Storage browser.
import * as ort from 'onnxruntime-web';
import { UnicodeProcessor, TextToSpeech, loadVoiceStyle } from './helper.js';

const REV = 'aafc6e32416a594460b32413efc49d7fe4ce6d46'; // revisi model yang dipatok
const HF = `https://huggingface.co/supertone-oss-archive/supertonic-3/resolve/${REV}`;
const CACHE_NAMA = 'supertonic3-v1';
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

export const MODEL = [
  { nama: 'Prediktor durasi', file: 'onnx/duration_predictor.onnx', mb: 3.7 },
  { nama: 'Encoder teks', file: 'onnx/text_encoder.onnx', mb: 36.4 },
  { nama: 'Estimator vektor', file: 'onnx/vector_estimator.onnx', mb: 257 },
  { nama: 'Vocoder', file: 'onnx/vocoder.onnx', mb: 101 },
];
const TOTAL_MB = MODEL.reduce((a, m) => a + m.mb, 0);

let tts = null;
let sedangSiap = null;
const gayaCache = new Map();
const mb = (b) => (b / 1048576).toFixed(b > 10485760 ? 0 : 1);

async function bukaCache() {
  try { return await caches.open(CACHE_NAMA); } catch (e) { return null; }
}

export async function modelTersimpan() {
  const c = await bukaCache();
  if (!c) return false;
  for (const m of MODEL) if (!(await c.match(`${HF}/${m.file}`))) return false;
  return true;
}

async function pastikanDiCache(url, perkiraan, onProgress) {
  const cache = await bukaCache();
  if (!cache) return null;
  if (await cache.match(url)) return cache;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Unduhan gagal (${res.status}) untuk ${url.split('/').pop()}`);
  const total = +res.headers.get('content-length') || perkiraan;
  let sudah = 0;
  const hitung = new TransformStream({
    transform(potongan, ctl) { sudah += potongan.byteLength; onProgress(sudah, total); ctl.enqueue(potongan); },
  });
  // dialirkan langsung ke penyimpanan, tidak ditahan di memori
  await cache.put(url, new Response(res.body.pipeThrough(hitung), {
    headers: { 'content-type': res.headers.get('content-type') || 'application/octet-stream' },
  }));
  return cache;
}

async function ambilBuffer(url, perkiraan, onProgress) {
  const cache = await pastikanDiCache(url, perkiraan, onProgress);
  if (cache) {
    const hit = await cache.match(url);
    if (hit) return await hit.arrayBuffer();
  }
  // cadangan bila Cache Storage tidak tersedia: unduh ke memori
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Unduhan gagal (${res.status}) untuk ${url.split('/').pop()}`);
  const total = +res.headers.get('content-length') || perkiraan;
  const reader = res.body.getReader();
  const bagian = []; let sudah = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bagian.push(value); sudah += value.length; onProgress(sudah, total);
  }
  return await new Blob(bagian).arrayBuffer();
}

async function ambilJson(path) {
  const url = `${HF}/${path}`;
  const cache = await bukaCache();
  if (cache) {
    const hit = await cache.match(url);
    if (hit) return hit.json();
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal mengambil ${path} (${res.status})`);
  if (cache) { try { await cache.put(url, res.clone()); } catch (e) {} }
  return res.json();
}

async function buatSesi(buf) {
  const urut = navigator.gpu ? ['webgpu', 'wasm'] : ['wasm'];
  let galat;
  for (const ep of urut) {
    try {
      return await ort.InferenceSession.create(new Uint8Array(buf), {
        executionProviders: [ep], graphOptimizationLevel: 'all',
      });
    } catch (e) { galat = e; console.warn('Gagal memuat dengan', ep, e); }
  }
  throw galat;
}

export function siap() { return !!tts; }

// Unduh (bila perlu) dan muat model. Aman dipanggil berulang.
export function siapkan(onStatus = () => {}, onProgress = () => {}) {
  if (tts) return Promise.resolve();
  if (sedangSiap) return sedangSiap;
  sedangSiap = (async () => {
    onStatus('Mengambil konfigurasi model...');
    const cfgs = await ambilJson('onnx/tts.json');
    const indexer = await ambilJson('onnx/unicode_indexer.json');
    const sesi = [];
    let selesaiMb = 0;
    for (let i = 0; i < MODEL.length; i++) {
      const m = MODEL[i];
      const buf = await ambilBuffer(`${HF}/${m.file}`, m.mb * 1048576, (g, t) => {
        onStatus(`Mengunduh ${m.nama} (${i + 1}/${MODEL.length}): ${mb(g)} dari ${mb(t)} MB`);
        onProgress((selesaiMb + Math.min(g, t) / 1048576) / TOTAL_MB * 100);
      });
      selesaiMb += m.mb;
      onStatus(`Menyiapkan ${m.nama} (${i + 1}/${MODEL.length})...`);
      sesi.push(await buatSesi(buf));
    }
    tts = new TextToSpeech(cfgs, new UnicodeProcessor(indexer), ...sesi);
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  })();
  sedangSiap.catch(() => { sedangSiap = null; });
  return sedangSiap;
}

async function ambilGaya(kode) {
  if (!gayaCache.has(kode)) {
    gayaCache.set(kode, await loadVoiceStyle([`${HF}/voice_styles/${kode}.json`], false));
  }
  return gayaCache.get(kode);
}

// Satu potongan teks -> { samples: Float32Array, rate }
export async function sintesis(teks, lang, kodeSuara, kecepatan = 1.05, langkah = 8, onLangkah = null) {
  if (!tts) throw new Error('Model Supertonic belum siap.');
  const gaya = await ambilGaya(kodeSuara);
  const { wav, duration } = await tts._infer([teks], [lang], gaya, langkah, kecepatan, onLangkah);
  const n = Math.floor(tts.sampleRate * duration[0]);
  return { samples: Float32Array.from(wav.slice(0, n)), rate: tts.sampleRate };
}
