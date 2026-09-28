import { StudioEngine, downloadBlob } from './engine';
import { makeLayer, defaultFilters, type Layer } from './types';
import { createCanvas, context } from './pixels';
export async function importFile(engine: StudioEngine, file: File) {
    if (file.size > 64 * 1024 * 1024)
        throw new Error('Choose a file smaller than 64 MB.');
    const ext = file.name.split('.').at(-1)?.toLowerCase();
    if (ext === 'pixelcraft') {
        await engine.openProject(await file.text());
        return;
    }
    if (ext === 'psd') {
        const buf = await file.arrayBuffer(), dv = new DataView(buf);
        if (buf.byteLength < 26 || dv.getUint32(0) !== 0x38425053)
            throw new Error('Invalid PSD file.');
        const height = dv.getUint32(14), width = dv.getUint32(18);
        if (width * height > 24e6 || width < 1 || height < 1)
            throw new Error('PSD documents must be under 24 megapixels.');
        const { readPsd } = await import('ag-psd');
        const psd = readPsd(buf, { skipThumbnail: true, skipLinkedFilesData: true, totalMemoryLimit: 256 * 1024 * 1024 });
        const layers: Layer[] = [];
        const walk = (items: NonNullable<typeof psd.children>, parent?: string) => { for (const item of items) {
            if (layers.length >= 60)
                throw new Error('PSD files are limited to 60 layers.');
            if (item.children) {
                const g = makeLayer(item.name || 'Group', 'group', width, height);
                g.visible = !item.hidden;
                g.opacity = (item.opacity ?? 1) * 100;
                g.parent = parent;
                walk(item.children, g.id);
                layers.push(g);
            }
            else if (item.canvas) {
                const l = makeLayer(item.name || 'Image layer', 'raster', item.canvas.width, item.canvas.height);
                l.x = item.left ?? 0;
                l.y = item.top ?? 0;
                l.opacity = (item.opacity ?? 1) * 100;
                l.visible = !item.hidden;
                l.parent = parent;
                const blends: Record<string, GlobalCompositeOperation> = { normal: 'source-over', multiply: 'multiply', screen: 'screen', overlay: 'overlay', darken: 'darken', lighten: 'lighten', 'soft light': 'soft-light', 'hard light': 'hard-light', difference: 'difference' };
                l.blend = blends[item.blendMode ?? 'normal'] ?? 'source-over';
                l.src = item.canvas.toDataURL();
                engine.images.set(l.src, item.canvas);
                layers.push(l);
            }
        } };
        if (psd.children?.length)
            walk(psd.children);
        if (!layers.length && psd.canvas) {
            const l = makeLayer('Composite', 'raster', width, height);
            l.src = psd.canvas.toDataURL();
            engine.images.set(l.src, psd.canvas);
            layers.push(l);
        }
        if (!layers.length)
            throw new Error('No supported image layers found in this PSD.');
        engine.doc = { version: 1, name: file.name.replace(/\.psd$/i, ''), width, height, layers, paths: [] };
        engine.selected = layers.at(-1)!.id;
        engine.selection = null;
        engine.commit('Import PSD layers');
        return;
    }
    if (!['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext ?? ''))
        throw new Error('Use PNG, JPEG, WebP, SVG, PSD, or a .pixelcraft project.');
    await engine.importRaster(file);
}
export async function exportImage(engine: StudioEngine, format: string, scale: number, quality: number) { let c = engine.composite(); if (scale !== 1) {
    const resized = createCanvas(c.width * scale, c.height * scale);
    context(resized).drawImage(c, 0, 0, resized.width, resized.height);
    c = resized;
} if (format === 'jpeg') {
    const ctx = context(c);
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
} await new Promise<void>((resolve, reject) => c.toBlob(blob => { if (!blob) {
    reject(new Error('Export failed. Try a smaller size.'));
    return;
} downloadBlob(blob, engine.doc.name + '.' + (format === 'jpeg' ? 'jpg' : format)); resolve(); }, 'image/' + format, quality / 100)); }
export async function removeBackground(engine: StudioEngine, onProgress: (s: string) => void) {
    const l = engine.editable();
    if (l.kind !== 'raster')
        throw new Error('Select a photo layer for background removal.');
    const targetId = l.id, doc = engine.doc, bitmap = engine.layerBitmap(l);
    const blob = await new Promise<Blob>((resolve, reject) => bitmap.toBlob(b => b ? resolve(b) : reject(new Error('Could not read layer.'))));
    onProgress('Preparing the on-device AI model…');
    const { removeBackground: remove } = await import('@imgly/background-removal');
    const result = await remove(blob, { model: 'isnet_quint8', device: 'cpu', progress: (key, current, total) => onProgress(key.startsWith('fetch') ? 'Downloading AI model · ' + Math.round(current / Math.max(1, total) * 100) + '%' : 'Finding the subject…'), output: { format: 'image/png' } });
    if (engine.doc !== doc || !engine.doc.layers.some(v => v.id === targetId))
        throw new Error('The document changed. Please try again.');
    const url = URL.createObjectURL(result);
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        const c = createCanvas(l.w, l.h);
        context(c).drawImage(img, 0, 0, c.width, c.height);
        const cutout = { ...l, id: crypto.randomUUID(), name: l.name + ' · cutout', filters: { ...defaultFilters }, mask: undefined, src: c.toDataURL() };
        engine.images.set(cutout.src, c);
        l.visible = false;
        engine.add(cutout, 'Remove background');
    }
    finally {
        URL.revokeObjectURL(url);
    }
}
