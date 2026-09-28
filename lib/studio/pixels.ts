import { clamp, type Selection } from './types';
export function createCanvas(w: number, h: number) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
export function context(c: HTMLCanvasElement) { const ctx = c.getContext('2d', { willReadFrequently: true }); if (!ctx)
    throw new Error('Canvas is not available in this browser'); return ctx; }
export function hexRgb(h: string) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
export function traceSelection(ctx: CanvasRenderingContext2D, s: Selection, w: number, h: number) { ctx.beginPath(); if (s.inverted)
    ctx.rect(0, 0, w, h); if (s.kind === 'ellipse')
    ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w / 2), Math.abs(s.h / 2), 0, 0, Math.PI * 2);
else if (s.kind === 'polygon' && s.points?.length) {
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (const p of s.points.slice(1))
        ctx.lineTo(p.x, p.y);
    ctx.closePath();
}
else
    ctx.rect(s.x, s.y, s.w, s.h); }
export function floodMask(image: ImageData, x: number, y: number, tolerance: number): Uint8Array { const { width: w, height: h, data: d } = image; const mask = new Uint8Array(w * h); x = clamp(Math.floor(x), 0, w - 1); y = clamp(Math.floor(y), 0, h - 1); const seed = y * w + x, base = seed * 4; const target = [d[base], d[base + 1], d[base + 2], d[base + 3]]; const stack = new Int32Array(w * h); let head = 0, tail = 0; stack[tail++] = seed; mask[seed] = 1; const limit = Math.max(1, tolerance) * 2.55; while (head < tail) {
    const p = stack[head++], px = p % w, py = (p / w) | 0;
    for (const n of [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1]) {
        if (n < 0 || mask[n])
            continue;
        const k = n * 4;
        if (Math.max(Math.abs(d[k] - target[0]), Math.abs(d[k + 1] - target[1]), Math.abs(d[k + 2] - target[2]), Math.abs(d[k + 3] - target[3])) <= limit) {
            mask[n] = 1;
            stack[tail++] = n;
        }
    }
} return mask; }
export function maskCanvas(mask: Uint8Array, w: number, h: number) { const c = createCanvas(w, h), ctx = context(c), im = ctx.createImageData(w, h); for (let i = 0; i < mask.length; i++) {
    im.data[i * 4] = 255;
    im.data[i * 4 + 1] = 255;
    im.data[i * 4 + 2] = 255;
    im.data[i * 4 + 3] = mask[i] ? 255 : 0;
} ctx.putImageData(im, 0, 0); return c; }
/** Fill from the nearest unselected boundary, then diffuse the seam. No generated content or network requests. */
export function inpaint(image: ImageData, mask: Uint8Array) { const { width: w, height: h, data: d } = image; const known = new Uint8Array(mask.length), queue = new Int32Array(mask.length); let head = 0, tail = 0; for (let p = 0; p < mask.length; p++) {
    if (!mask[p])
        known[p] = 1;
    else {
        const x = p % w, y = (p / w) | 0;
        if ((x > 0 && !mask[p - 1]) || (x < w - 1 && !mask[p + 1]) || (y > 0 && !mask[p - w]) || (y < h - 1 && !mask[p + w])) {
            queue[tail++] = p;
            known[p] = 2;
        }
    }
} if (!tail)
    throw new Error('Leave some of the image outside the selection to use as a source.'); while (head < tail) {
    const p = queue[head++], x = p % w, y = (p / w) | 0;
    const neighbors = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
    const valid = neighbors.filter(n => n >= 0 && known[n] === 1);
    if (valid.length) {
        for (let k = 0; k < 4; k++) {
            let sum = 0;
            for (const n of valid)
                sum += d[n * 4 + k];
            d[p * 4 + k] = sum / valid.length;
        }
        known[p] = 1;
    }
    for (const n of neighbors)
        if (n >= 0 && !known[n]) {
            known[n] = 2;
            queue[tail++] = n;
        }
} const copy = new Uint8ClampedArray(d.length); for (let pass = 0; pass < 6; pass++) {
    copy.set(d);
    for (let p = 0; p < mask.length; p++) {
        if (!mask[p])
            continue;
        const x = p % w, y = (p / w) | 0;
        const ns = [p, x > 0 ? p - 1 : p, x < w - 1 ? p + 1 : p, y > 0 ? p - w : p, y < h - 1 ? p + w : p];
        for (let k = 0; k < 3; k++) {
            let sum = 0;
            for (const n of ns)
                sum += copy[n * 4 + k];
            d[p * 4 + k] = sum / ns.length;
        }
    }
} return image; }
export function sharpen(image: ImageData, amount: number) { const { width: w, height: h, data: d } = image, src = new Uint8ClampedArray(d), a = amount / 100; for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
        const p = (y * w + x) * 4;
        for (let k = 0; k < 3; k++)
            d[p + k] = clamp(src[p + k] * (1 + 4 * a) - a * (src[p - 4 + k] + src[p + 4 + k] + src[p - w * 4 + k] + src[p + w * 4 + k]), 0, 255);
    } return image; }
