import { type Layer, type StudioDoc, type HistoryEntry, type Point, type Selection, makeLayer, cloneDoc, defaultFilters, clamp, uid } from './types';
import { createCanvas, context, traceSelection, floodMask, maskCanvas, inpaint, sharpen } from './pixels';
export class StudioEngine {
    doc: StudioDoc = { version: 1, name: 'Alpine escape', width: 1448, height: 1086, layers: [], paths: [] };
    selected = '';
    history: HistoryEntry[] = [];
    historyIndex = -1;
    selection: Selection | null = null;
    channels = [true, true, true];
    images = new Map<string, CanvasImageSource>();
    renderCache = new Map<string, HTMLCanvasElement>();
    transient = new Map<string, HTMLCanvasElement>();
    listeners = new Set<() => void>();
    savedIndex = 0;
    revision = 0;
    subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
    notify() { this.revision++; this.listeners.forEach(f => f()); }
    get active() { return this.doc.layers.find(l => l.id === this.selected); }
    get dirty() { return this.historyIndex !== this.savedIndex; }
    parentState(l: Layer) { let visible = true, alpha = 1, locked = false, parent = l.parent; const seen = new Set<string>(); while (parent && !seen.has(parent)) {
        seen.add(parent);
        const g = this.doc.layers.find(v => v.id === parent);
        if (!g)
            break;
        visible = visible && g.visible;
        alpha *= g.opacity * g.fill / 10000;
        locked = locked || g.locked;
        parent = g.parent;
    } return { visible, alpha, locked }; }
    async loadImage(src: string) { if (this.images.has(src))
        return this.images.get(src)!; const i = new Image(); i.decoding = 'async'; i.src = src; await i.decode(); this.images.set(src, i); return i; }
    async preload(d = this.doc) { const sources = d.layers.flatMap(l => [l.src, l.mask?.mask]).filter(Boolean) as string[]; await Promise.all([...new Set(sources)].map(s => this.loadImage(s))); }
    commit(label: string) { if (this.savedIndex > this.historyIndex)
        this.savedIndex = -1; this.history = this.history.slice(0, this.historyIndex + 1); this.history.push({ id: uid(), label, doc: cloneDoc(this.doc), selected: this.selected, time: Date.now() }); if (this.history.length > 35) {
        this.history.shift();
        this.savedIndex--;
    } this.historyIndex = this.history.length - 1; const used = new Set(this.history.flatMap(h => h.doc.layers.flatMap(l => [l.src, l.mask?.mask])).filter(Boolean)); if (this.selection?.mask)
        used.add(this.selection.mask); for (const key of this.images.keys())
        if (!used.has(key))
            this.images.delete(key); this.notify(); }
    goHistory(i: number) { if (i < 0 || i >= this.history.length)
        return; this.historyIndex = i; const e = this.history[i]; this.doc = cloneDoc(e.doc); this.selected = e.selected; this.selection = null; this.transient.clear(); this.renderCache.clear(); this.notify(); }
    undo() { this.goHistory(this.historyIndex - 1); }
    redo() { this.goHistory(this.historyIndex + 1); }
    update(id: string, changes: Partial<Layer>, label?: string) { const layer = this.doc.layers.find(l => l.id === id); if (!layer)
        return; Object.assign(layer, changes); this.renderCache.clear(); if (label)
        this.commit(label);
    else
        this.notify(); }
    select(id: string) { this.selected = id; this.notify(); }
    add(layer: Layer, label = 'Add layer') { if (this.doc.layers.length >= 60)
        throw new Error('This document has reached the 60-layer limit.'); if (!layer.parent && this.active?.kind === 'group')
        layer.parent = this.active.id; this.doc.layers.push(layer); this.selected = layer.id; this.commit(label); return layer; }
    newLayer() { return this.add(makeLayer('Layer ' + (this.doc.layers.filter(l => l.kind === 'raster').length + 1), 'raster', this.doc.width, this.doc.height)); }
    duplicate() { const l = this.active; if (!l)
        return; return this.add({ ...l, id: uid(), name: l.name + ' copy', filters: { ...l.filters }, text: l.text ? { ...l.text } : undefined }, 'Duplicate layer'); }
    deleteLayer() { const l = this.active; if (!l || l.locked)
        return; this.doc.layers = this.doc.layers.filter(v => v.id !== l.id && v.parent !== l.id); this.selected = this.doc.layers.at(-1)?.id ?? ''; this.commit('Delete ' + l.name); }
    reorder(id: string, target: number) { const i = this.doc.layers.findIndex(l => l.id === id); if (i < 0)
        return; const [l] = this.doc.layers.splice(i, 1); this.doc.layers.splice(clamp(target, 0, this.doc.layers.length), 0, l); this.commit('Reorder layer'); }
    group() { const l = this.active; if (!l)
        return; const g = makeLayer('Group ' + (this.doc.layers.filter(v => v.kind === 'group').length + 1), 'group', this.doc.width, this.doc.height); l.parent = g.id; this.doc.layers.splice(this.doc.layers.indexOf(l) + 1, 0, g); this.selected = g.id; this.commit('Group layer'); }
    ungroup() { const g = this.active; if (g?.kind !== 'group')
        return; this.doc.layers.forEach(l => { if (l.parent === g.id)
        delete l.parent; }); this.doc.layers = this.doc.layers.filter(l => l !== g); this.selected = this.doc.layers.at(-1)?.id ?? ''; this.commit('Ungroup layers'); }
    async initDemo() { const img = await this.loadImage('/assets/alpine-lake.webp'); const photo = makeLayer('Alpine landscape', 'raster', 1448, 1086); photo.src = '/assets/alpine-lake.webp'; const shade = makeLayer('Soft shadow', 'raster', 1448, 1086); const c = createCanvas(1448, 1086), x = context(c), gradient = x.createLinearGradient(0, 220, 0, 1086); gradient.addColorStop(0, '#061b2000'); gradient.addColorStop(1, '#06171ca8'); x.fillStyle = gradient; x.fillRect(0, 0, 1448, 1086); shade.src = c.toDataURL(); this.images.set(shade.src, c); const title = this.textLayer('BEYOND\nTHE ORDINARY', 106, 584, 111); title.name = 'Beyond the ordinary'; title.text!.weight = 700; title.text!.leading = .94; title.text!.tracking = -4; title.w = 1200; title.h = 250; const eyebrow = this.textLayer('FIELD NOTES    /    VOL. 01', 110, 530, 17); eyebrow.name = 'Edition label'; eyebrow.w = 700; eyebrow.text!.tracking = 4; eyebrow.text!.weight = 500; const footer = this.textLayer('GO SOMEWHERE THAT STAYS WITH YOU.', 112, 980, 17); footer.name = 'Footer caption'; footer.text!.tracking = 2.2; footer.w = 900; this.doc.layers = [photo, shade, title, eyebrow, footer]; this.selected = title.id; this.commit('Open sample document'); this.savedIndex = 0; this.notify(); return img; }
    textLayer(content: string, x: number, y: number, size = 64) { const l = makeLayer(content.split('\n')[0].slice(0, 32) || 'Text', 'text', Math.min(this.doc.width, Math.max(260, content.length * size * .62)), size * 1.25); l.x = x; l.y = y; l.text = { content, font: 'Arial', size, weight: 600, tracking: 0, leading: 1.2, align: 'left', italic: false }; return l; }
    async newDocument(name: string, w: number, h: number, bg: string) { this.doc = { version: 1, name: name || 'Untitled', width: w, height: h, layers: [], paths: [] }; this.selection = null; const l = makeLayer('Background', 'raster', w, h); if (bg !== 'transparent') {
        const c = createCanvas(w, h);
        context(c).fillStyle = bg;
        context(c).fillRect(0, 0, w, h);
        l.src = c.toDataURL();
        this.images.set(l.src, c);
    } this.doc.layers = [l]; this.selected = l.id; this.commit('New document'); }
    drawRaw(ctx: CanvasRenderingContext2D, l: Layer) { if (l.kind === 'raster') {
        const source = this.transient.get(l.id) ?? (l.src ? this.images.get(l.src) : undefined);
        if (source)
            ctx.drawImage(source, 0, 0, l.w, l.h);
    }
    else if (l.kind === 'text' && l.text) {
        const t = l.text;
        ctx.fillStyle = l.color;
        ctx.font = (t.italic ? 'italic ' : '') + t.weight + ' ' + t.size + 'px ' + t.font;
        ctx.textBaseline = 'top';
        ctx.textAlign = t.align;
        ctx.letterSpacing = t.tracking + 'px';
        const x = t.align === 'center' ? l.w / 2 : t.align === 'right' ? l.w : 0;
        t.content.split('\n').forEach((line, i) => ctx.fillText(line, x, i * t.size * t.leading));
    }
    else if (l.kind === 'shape') {
        ctx.fillStyle = l.color;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = l.strokeWidth ?? 3;
        ctx.beginPath();
        if (l.shape === 'ellipse')
            ctx.ellipse(l.w / 2, l.h / 2, l.w / 2, l.h / 2, 0, 0, Math.PI * 2);
        else if (l.shape === 'polygon') {
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3 - Math.PI / 2, x = l.w / 2 + Math.cos(a) * l.w / 2, y = l.h / 2 + Math.sin(a) * l.h / 2;
                if (i === 0)
                    ctx.moveTo(x, y);
                else
                    ctx.lineTo(x, y);
            }
            ctx.closePath();
        }
        else if (l.shape === 'path' && l.points?.length) {
            ctx.moveTo(l.points[0].x, l.points[0].y);
            l.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            if (!l.stroke)
                ctx.closePath();
        }
        else
            ctx.rect(0, 0, l.w, l.h);
        l.stroke ? ctx.stroke() : ctx.fill();
    } }
    filtered(input: HTMLCanvasElement, l: Layer) { const f = l.filters; if (!Object.values(f).some(Boolean))
        return input; const c = createCanvas(input.width, input.height), ctx = context(c); ctx.filter = 'brightness(' + (100 + f.brightness) + '%) contrast(' + (100 + f.contrast) + '%) saturate(' + (100 + f.saturation) + '%) hue-rotate(' + f.hue + 'deg) blur(' + f.blur + 'px)'; ctx.drawImage(input, 0, 0); ctx.filter = 'none'; if (f.red || f.green || f.blue || f.sharpness) {
        let im = ctx.getImageData(0, 0, c.width, c.height);
        for (let p = 0; p < im.data.length; p += 4) {
            im.data[p] += f.red;
            im.data[p + 1] += f.green;
            im.data[p + 2] += f.blue;
        }
        if (f.sharpness)
            im = sharpen(im, f.sharpness);
        ctx.putImageData(im, 0, 0);
    } return c; }
    layerBitmap(l: Layer) { const key = l.id + JSON.stringify({ ...l, src: undefined }) + (l.src ?? ''); if (!this.transient.has(l.id) && this.renderCache.has(key))
        return this.renderCache.get(key)!; let c = createCanvas(l.w, l.h); this.drawRaw(context(c), l); c = this.filtered(c, l); if (!this.transient.has(l.id)) {
        const bytes = [...this.renderCache.values()].reduce((n, v) => n + v.width * v.height * 4, 0);
        if (bytes + c.width * c.height * 4 > 96 * 1024 * 1024)
            this.renderCache.clear();
        this.renderCache.set(key, c);
    } return c; }
    selectionMask(s: Selection) { const c = createCanvas(this.doc.width, this.doc.height), ctx = context(c); if (s.mask && this.images.has(s.mask)) {
        if (s.inverted) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.globalCompositeOperation = 'destination-out';
        }
        ctx.drawImage(this.images.get(s.mask)!, 0, 0);
    }
    else {
        traceSelection(ctx, s, c.width, c.height);
        ctx.fillStyle = '#fff';
        ctx.fill('evenodd');
    } if (s.feather) {
        const b = createCanvas(c.width, c.height), bctx = context(b);
        bctx.filter = 'blur(' + s.feather + 'px)';
        bctx.drawImage(c, 0, 0);
        return b;
    } return c; }
    composite(target?: HTMLCanvasElement, displayChannels = false) { const c = target ?? createCanvas(this.doc.width, this.doc.height); if (c.width !== this.doc.width)
        c.width = this.doc.width; if (c.height !== this.doc.height)
        c.height = this.doc.height; const ctx = context(c); ctx.clearRect(0, 0, c.width, c.height); for (const l of this.doc.layers) {
        const parent = this.parentState(l);
        if (!l.visible || !parent.visible || l.kind === 'group')
            continue;
        if (l.kind === 'adjustment') {
            const filtered = this.filtered(c, l);
            ctx.save();
            ctx.globalAlpha = l.opacity * l.fill / 10000 * parent.alpha;
            if (l.mask) {
                const m = createCanvas(c.width, c.height), mx = context(m);
                mx.drawImage(filtered, 0, 0);
                mx.globalCompositeOperation = 'destination-in';
                mx.drawImage(this.selectionMask(l.mask), 0, 0);
                ctx.drawImage(m, 0, 0);
            }
            else
                ctx.drawImage(filtered, 0, 0);
            ctx.restore();
            continue;
        }
        const b = this.layerBitmap(l);
        ctx.save();
        ctx.globalAlpha = l.opacity * l.fill / 10000 * parent.alpha;
        ctx.globalCompositeOperation = l.blend;
        if (l.mask) {
            const mc = createCanvas(c.width, c.height), mx = context(mc);
            this.drawTransformed(mx, b, l);
            mx.globalCompositeOperation = 'destination-in';
            mx.drawImage(this.selectionMask(l.mask), 0, 0);
            ctx.drawImage(mc, 0, 0);
        }
        else
            this.drawTransformed(ctx, b, l);
        ctx.restore();
    } if (displayChannels && this.channels.some(v => !v)) {
        const im = ctx.getImageData(0, 0, c.width, c.height);
        for (let p = 0; p < im.data.length; p += 4)
            for (let k = 0; k < 3; k++)
                if (!this.channels[k])
                    im.data[p + k] = 0;
        ctx.putImageData(im, 0, 0);
    } return c; }
    drawTransformed(ctx: CanvasRenderingContext2D, b: CanvasImageSource, l: Layer) { ctx.save(); ctx.translate(l.x + l.w / 2, l.y + l.h / 2); ctx.rotate(l.rotation * Math.PI / 180); ctx.drawImage(b, -l.w / 2, -l.h / 2, l.w, l.h); ctx.restore(); }
    hitTest(p: Point) { for (const l of [...this.doc.layers].reverse()) {
        if (!l.visible || l.locked || !this.parentState(l).visible || this.parentState(l).locked || l.kind === 'adjustment' || l.kind === 'group')
            continue;
        const q = this.localPoint(l, p);
        if (q.x < 0 || q.y < 0 || q.x > l.w || q.y > l.h)
            continue;
        if (l.kind === 'text' || l.kind === 'shape')
            return l;
        const c = this.layerBitmap(l);
        if (context(c).getImageData(Math.min(c.width - 1, q.x) | 0, Math.min(c.height - 1, q.y) | 0, 1, 1).data[3] > 12)
            return l;
    } return undefined; }
    localPoint(l: Layer, p: Point) { const a = -l.rotation * Math.PI / 180, x = p.x - l.x - l.w / 2, y = p.y - l.y - l.h / 2; return { x: x * Math.cos(a) - y * Math.sin(a) + l.w / 2, y: x * Math.sin(a) + y * Math.cos(a) + l.h / 2 }; }
    editable() { const l = this.active; if (!l)
        throw new Error('Select a layer first.'); if (l.locked || this.parentState(l).locked)
        throw new Error('Unlock this layer or its group before editing.'); if (l.kind === 'group' || l.kind === 'adjustment')
        throw new Error('Select an image, shape, or text layer.'); return l; }
    bake(l = this.editable()) { const c = createCanvas(this.doc.width, this.doc.height); this.drawTransformed(context(c), this.layerBitmap(l), l); if (l.mask) {
        const ctx = context(c);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(this.selectionMask(l.mask), 0, 0);
        ctx.globalCompositeOperation = 'source-over';
    } l.kind = 'raster'; l.x = 0; l.y = 0; l.w = this.doc.width; l.h = this.doc.height; l.rotation = 0; l.filters = { ...defaultFilters }; delete l.mask; delete l.text; this.transient.set(l.id, c); this.renderCache.clear(); return c; }
    saveBitmap(c: HTMLCanvasElement, l: Layer, label?: string) { l.src = c.toDataURL('image/png'); this.images.set(l.src, c); this.transient.delete(l.id); this.renderCache.clear(); if (label)
        this.commit(label);
    else
        this.notify(); }
    applySelection(c: HTMLCanvasElement, original: HTMLCanvasElement) { if (!this.selection)
        return c; const mask = this.selectionMask(this.selection), ctx = context(c); ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mask, 0, 0); ctx.globalCompositeOperation = 'source-over'; const base = createCanvas(c.width, c.height), b = context(base); b.drawImage(original, 0, 0); b.globalCompositeOperation = 'destination-out'; b.drawImage(mask, 0, 0); b.globalCompositeOperation = 'source-over'; b.drawImage(c, 0, 0); return base; }
    fill(color: string, point?: Point, tolerance = 25) { const l = this.editable(), c = this.bake(l), ctx = context(c), original = createCanvas(c.width, c.height); context(original).drawImage(c, 0, 0); if (point) {
        const im = ctx.getImageData(0, 0, c.width, c.height), mask = floodMask(im, point.x, point.y, tolerance), fill = maskCanvas(mask, c.width, c.height), fx = context(fill);
        fx.globalCompositeOperation = 'source-in';
        fx.fillStyle = color;
        fx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(fill, 0, 0);
    }
    else {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, c.width, c.height);
    } this.saveBitmap(this.applySelection(c, original), l, 'Fill layer'); }
    clearSelection() { const l = this.editable(), c = this.bake(l), ctx = context(c); if (this.selection) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(this.selectionMask(this.selection), 0, 0);
        ctx.globalCompositeOperation = 'source-over';
    }
    else
        ctx.clearRect(0, 0, c.width, c.height); this.saveBitmap(c, l, 'Clear pixels'); }
    selectColor(p: Point, tolerance = 25) { const c = this.composite(), mask = floodMask(context(c).getImageData(0, 0, c.width, c.height), p.x, p.y, tolerance), m = maskCanvas(mask, c.width, c.height), src = m.toDataURL(); this.images.set(src, m); let minX = c.width, minY = c.height, maxX = 0, maxY = 0; for (let i = 0; i < mask.length; i++)
        if (mask[i]) {
            const x = i % c.width, y = (i / c.width) | 0;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        } this.selection = { kind: 'mask', mask: src, x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }; this.notify(); }
    async smartFill() {
        const l = this.editable();
        if (!this.selection)
            throw new Error('Select an area with the marquee or lasso first.');
        const c = createCanvas(this.doc.width, this.doc.height), ctx = context(c);
        this.drawTransformed(ctx, this.layerBitmap(l), l);
        const im = ctx.getImageData(0, 0, c.width, c.height), m = context(this.selectionMask(this.selection)).getImageData(0, 0, c.width, c.height), mask = new Uint8Array(c.width * c.height);
        let count = 0;
        for (let i = 0; i < mask.length; i++) {
            mask[i] = m.data[i * 4 + 3] > 127 ? 1 : 0;
            count += mask[i];
        }
        if (!count)
            throw new Error('Select an area inside the canvas first.');
        if (count === mask.length)
            throw new Error('Leave some of the image outside the selection to use as a source.');
        const result = typeof Worker !== 'undefined' ? await new Promise<ImageData>((resolve, reject) => {
            const worker = new Worker(new URL('./fill.worker.ts', import.meta.url), { type: 'module' });
            const timeout = setTimeout(() => { worker.terminate(); reject(new Error('The selection is too large. Try a smaller area.')); }, 45000);
            worker.onmessage = (event: MessageEvent<{
                pixels?: ArrayBuffer;
                error?: string;
            }>) => { clearTimeout(timeout); worker.terminate(); if (event.data.error)
                reject(new Error(event.data.error));
            else
                resolve(new ImageData(new Uint8ClampedArray(event.data.pixels!), c.width, c.height)); };
            worker.onerror = () => { clearTimeout(timeout); worker.terminate(); reject(new Error('Content-aware processing failed. Please try a smaller selection.')); };
            worker.postMessage({ width: c.width, height: c.height, pixels: im.data.buffer, mask: mask.buffer }, [im.data.buffer, mask.buffer]);
        }) : inpaint(im, mask);
        ctx.putImageData(result, 0, 0);
        l.kind = 'raster';
        l.x = 0;
        l.y = 0;
        l.w = c.width;
        l.h = c.height;
        l.rotation = 0;
        l.filters = { ...defaultFilters };
        delete l.text;
        this.saveBitmap(c, l, 'Content-aware fill');
    }
    addMask() { const l = this.active; if (!l || l.kind === 'group')
        throw new Error('Select an image, text, shape, or adjustment layer.'); if (l.locked)
        throw new Error('Unlock the layer first.'); if (l.mask) {
        delete l.mask;
        this.commit('Remove layer mask');
        return;
    } l.mask = this.selection ? { ...this.selection } : { kind: 'rect', x: 0, y: 0, w: this.doc.width, h: this.doc.height }; this.commit('Add layer mask'); }
    crop(s: Selection) { const x = clamp(Math.round(s.x), 0, this.doc.width - 1), y = clamp(Math.round(s.y), 0, this.doc.height - 1), w = clamp(Math.round(s.w), 1, this.doc.width - x), h = clamp(Math.round(s.h), 1, this.doc.height - y); this.doc.layers.forEach(l => { l.x -= x; l.y -= y; if (l.mask) {
        l.mask.x -= x;
        l.mask.y -= y;
        if (l.mask.mask) {
            const source = this.images.get(l.mask.mask);
            if (source) {
                const m = createCanvas(w, h);
                context(m).drawImage(source, -x, -y);
                l.mask.mask = m.toDataURL();
                this.images.set(l.mask.mask, m);
            }
        }
        if (l.mask.points)
            l.mask.points = l.mask.points.map(p => ({ x: p.x - x, y: p.y - y }));
    } }); this.doc.paths.forEach(p => p.points = p.points.map(a => ({ x: a.x - x, y: a.y - y }))); this.doc.width = w; this.doc.height = h; this.selection = null; this.renderCache.clear(); this.commit('Crop canvas'); }
    resize(w: number, h: number) { const sx = w / this.doc.width, sy = h / this.doc.height; for (const l of this.doc.layers) {
        l.x *= sx;
        l.y *= sy;
        l.w *= sx;
        l.h *= sy;
        if (l.text) {
            l.text.size *= sy;
            l.text.tracking *= sx;
        }
        if (l.points)
            l.points = l.points.map(p => ({ x: p.x * sx, y: p.y * sy }));
        if (l.mask) {
            l.mask.x *= sx;
            l.mask.y *= sy;
            l.mask.w *= sx;
            l.mask.h *= sy;
            if (l.mask.points)
                l.mask.points = l.mask.points.map(p => ({ x: p.x * sx, y: p.y * sy }));
            if (l.mask.mask) {
                const old = this.images.get(l.mask.mask);
                if (old) {
                    const c = createCanvas(w, h);
                    context(c).drawImage(old, 0, 0, w, h);
                    l.mask.mask = c.toDataURL();
                    this.images.set(l.mask.mask, c);
                }
            }
        }
    } this.doc.paths.forEach(p => p.points = p.points.map(a => ({ x: a.x * sx, y: a.y * sy }))); this.doc.width = w; this.doc.height = h; this.selection = null; this.renderCache.clear(); this.commit('Resize image'); }
    async importRaster(file: File) { if (file.size > 32 * 1024 * 1024)
        throw new Error('Choose an image smaller than 32 MB.'); const url = URL.createObjectURL(file); try {
        const i = new Image();
        i.src = url;
        await i.decode();
        if (i.width * i.height > 24e6)
            throw new Error('Images must be under 24 megapixels.');
        const s = Math.min(1, this.doc.width / i.width, this.doc.height / i.height), c = createCanvas(i.width * s, i.height * s);
        context(c).drawImage(i, 0, 0, c.width, c.height);
        const l = makeLayer(file.name.replace(/\.[^.]+$/, ''), 'raster', c.width, c.height);
        l.x = (this.doc.width - l.w) / 2;
        l.y = (this.doc.height - l.h) / 2;
        l.src = c.toDataURL();
        this.images.set(l.src, c);
        this.add(l, 'Import ' + file.name);
    }
    finally {
        URL.revokeObjectURL(url);
    } }
    async serialize() { const d = cloneDoc(this.doc); for (const l of d.layers)
        if (l.src && !l.src.startsWith('data:')) {
            const i = await this.loadImage(l.src), c = createCanvas(l.w, l.h);
            context(c).drawImage(i, 0, 0, c.width, c.height);
            l.src = c.toDataURL();
        } return JSON.stringify({ format: 'pixelcraft', document: d }); }
    async openProject(raw: string) { const data = JSON.parse(raw); if (data.format !== 'pixelcraft' || data.document?.version !== 1)
        throw new Error('This is not a supported PixelCraft project.'); const d = data.document as StudioDoc; if (!Number.isInteger(d.width) || !Number.isInteger(d.height) || d.width < 1 || d.height < 1 || d.width * d.height > 24e6 || !Array.isArray(d.layers) || d.layers.length > 60 || !Array.isArray(d.paths))
        throw new Error('Invalid project dimensions or layer count.'); const kinds = ['raster', 'text', 'shape', 'adjustment', 'group']; const ids = new Set<string>(); for (const l of d.layers) {
        if (typeof l.id !== 'string' || ids.has(l.id))
            throw new Error('Layer identifiers must be unique.');
        ids.add(l.id);
        if (!kinds.includes(l.kind) || ![l.x, l.y, l.w, l.h, l.rotation, l.opacity, l.fill].every(Number.isFinite) || l.w < 1 || l.h < 1 || l.w * l.h > 24e6)
            throw new Error('The project contains an invalid layer.');
        for (const src of [l.src, l.mask?.mask])
            if (src && !/^data:image\/(png|jpeg|webp);base64,/.test(src))
                throw new Error('Projects may only contain embedded PNG, JPEG, or WebP images.');
        l.filters = { ...defaultFilters, ...l.filters };
        if (!Object.values(l.filters).every(v => Number.isFinite(v) && Math.abs(v) <= 360))
            throw new Error('Invalid layer adjustment.');
        if (l.text && (typeof l.text.content !== 'string' || l.text.content.length > 2000 || !Number.isFinite(l.text.size) || l.text.size < 1 || l.text.size > 2000))
            throw new Error('Invalid text layer.');
        l.visible = !!l.visible;
        l.locked = !!l.locked;
        l.opacity = clamp(l.opacity, 0, 100);
        l.fill = clamp(l.fill, 0, 100);
    } await this.preload(d); this.doc = d; this.selected = d.layers.at(-1)?.id ?? ''; this.selection = null; this.renderCache.clear(); this.commit('Open project'); this.savedIndex = this.historyIndex; this.notify(); }
}
export function downloadBlob(blob: Blob, name: string) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
