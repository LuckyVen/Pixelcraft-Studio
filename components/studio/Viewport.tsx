'use client';
import { useRef, useEffect, useState, useCallback, type PointerEvent as ReactPointerEvent } from 'react';
import { Upload, MousePointer2, Sparkles, Maximize2, Minus, Plus, RotateCcw, X, Check, Hand } from 'lucide-react';
import { StudioEngine } from '@/lib/studio/engine';
import { clamp, makeLayer, uid, type Tool, type Point, type Selection, type Layer } from '@/lib/studio/types';
import { createCanvas, context, traceSelection } from '@/lib/studio/pixels';
import { brushTools, selectionTools, toolName, type Preferences } from './tools';
import { IconButton, Choice } from './controls';
import { toast } from 'sonner';
type Props = {
    engine: StudioEngine;
    revision: number;
    tool: Tool;
    setTool: (t: Tool) => void;
    prefs: Preferences;
    primary: string;
    secondary: string;
    zoom: number;
    setZoom: (z: number) => void;
    rotation: number;
    setRotation: (v: number) => void;
    rulers: boolean;
    grid: boolean;
    fitToken: number;
    onImport: (files: FileList | File[]) => void;
    onText: (p: Point) => void;
    onColor: (color: string) => void;
    onMagic: () => void;
    busy: boolean;
};
type Drag = {
    mode: string;
    start: Point;
    last: Point;
    screen: Point;
    layer?: Layer;
    canvas?: HTMLCanvasElement;
    original?: HTMLCanvasElement;
    source?: HTMLCanvasElement;
    points?: Point[];
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    pan?: Point;
    cloneOffset?: Point;
    textSize?: number;
    originalLayer?: Layer;
};
export default function Viewport(p: Props) {
    const { engine: e, tool, prefs, zoom, setZoom, rotation, setRotation } = p;
    const host = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), art = useRef<HTMLCanvasElement>(null), overlay = useRef<HTMLCanvasElement>(null), drag = useRef<Drag | null>(null), touches = useRef(new Map<number, Point>()), pinch = useRef<{
        distance: number;
        zoom: number;
    } | null>(null), cloneOrigin = useRef<Point | null>(null);
    const [pan, setPan] = useState<Point>({ x: 0, y: 0 }), [dragOver, setDragOver] = useState(false), [space, setSpace] = useState(false), [path, setPath] = useState<Point[]>([]), [cursor, setCursor] = useState<Point | null>(null), [position, setPosition] = useState<Point>({ x: 0, y: 0 });
    const d = e.doc, l = e.active;
    const fit = useCallback(() => { if (!host.current)
        return; const r = host.current.getBoundingClientRect(); setZoom(clamp(Math.min((r.width - 100) / e.doc.width, (r.height - 120) / e.doc.height), .04, 1)); setPan({ x: 0, y: 0 }); setRotation(0); }, [e, setZoom, setRotation]);
    useEffect(() => { fit(); }, [p.fitToken, d.width, d.height]);
    useEffect(() => { if (!host.current)
        return; const observer = new ResizeObserver(() => fit()); observer.observe(host.current); return () => observer.disconnect(); }, [fit]);
    useEffect(() => { const id = requestAnimationFrame(() => { if (art.current)
        e.composite(art.current, true); }); return () => cancelAnimationFrame(id); }, [e, p.revision]);
    function drawOverlay() {
        const canvas = overlay.current;
        if (!canvas)
            return;
        canvas.width = d.width;
        canvas.height = d.height;
        const ctx = context(canvas);
        ctx.clearRect(0, 0, d.width, d.height);
        const sw = 1 / zoom;
        if (p.grid) {
            ctx.strokeStyle = '#ffffff25';
            ctx.lineWidth = sw * .6;
            ctx.beginPath();
            for (let x = 0; x < d.width; x += 100) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, d.height);
            }
            for (let y = 0; y < d.height; y += 100) {
                ctx.moveTo(0, y);
                ctx.lineTo(d.width, y);
            }
            ctx.stroke();
        }
        if (e.selection) {
            const s = e.selection;
            if (s.mask && e.images.get(s.mask)) {
                ctx.save();
                ctx.globalAlpha = .24;
                ctx.drawImage(e.images.get(s.mask)!, 0, 0);
                ctx.restore();
            }
            traceSelection(ctx, s, d.width, d.height);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5 * sw;
            ctx.stroke();
            ctx.setLineDash([5 * sw, 5 * sw]);
            ctx.strokeStyle = '#111';
            ctx.stroke();
            ctx.setLineDash([]);
            if (tool === 'crop') {
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, d.width, d.height);
                ctx.rect(s.x, s.y, s.w, s.h);
                ctx.fillStyle = '#0009';
                ctx.fill('evenodd');
                ctx.restore();
                ctx.strokeStyle = '#fff7';
                for (let n = 1; n < 3; n++) {
                    ctx.beginPath();
                    ctx.moveTo(s.x + s.w * n / 3, s.y);
                    ctx.lineTo(s.x + s.w * n / 3, s.y + s.h);
                    ctx.moveTo(s.x, s.y + s.h * n / 3);
                    ctx.lineTo(s.x + s.w, s.y + s.h * n / 3);
                    ctx.stroke();
                }
            }
        }
        if (tool === 'move' && prefs.showTransform && l && l.visible && !['adjustment', 'group'].includes(l.kind)) {
            ctx.save();
            ctx.translate(l.x + l.w / 2, l.y + l.h / 2);
            ctx.rotate(l.rotation * Math.PI / 180);
            ctx.strokeStyle = '#a29bff';
            ctx.lineWidth = sw;
            ctx.strokeRect(-l.w / 2, -l.h / 2, l.w, l.h);
            const size = 6 * sw;
            ctx.fillStyle = '#fff';
            for (const [x, y] of [[-l.w / 2, -l.h / 2], [0, -l.h / 2], [l.w / 2, -l.h / 2], [-l.w / 2, 0], [l.w / 2, 0], [-l.w / 2, l.h / 2], [0, l.h / 2], [l.w / 2, l.h / 2]]) {
                ctx.fillRect(x - size / 2, y - size / 2, size, size);
                ctx.strokeRect(x - size / 2, y - size / 2, size, size);
            }
            ctx.restore();
        }
        if (path.length) {
            ctx.strokeStyle = '#b2a8ff';
            ctx.lineWidth = 1.5 * sw;
            ctx.beginPath();
            path.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
            if (cursor)
                ctx.lineTo(cursor.x, cursor.y);
            ctx.stroke();
            ctx.fillStyle = '#fff';
            for (const a of path)
                ctx.fillRect(a.x - 3 * sw, a.y - 3 * sw, 6 * sw, 6 * sw);
        }
        const dr = drag.current;
        if (dr && ['rectangle', 'ellipse', 'polygon', 'gradient'].includes(dr.mode)) {
            const x = Math.min(dr.start.x, dr.last.x), y = Math.min(dr.start.y, dr.last.y), w = Math.abs(dr.start.x - dr.last.x), h = Math.abs(dr.start.y - dr.last.y);
            ctx.strokeStyle = p.primary;
            ctx.lineWidth = 2 * sw;
            ctx.setLineDash([5 * sw, 4 * sw]);
            ctx.beginPath();
            if (dr.mode === 'ellipse')
                ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            else if (dr.mode === 'gradient') {
                ctx.moveTo(dr.start.x, dr.start.y);
                ctx.lineTo(dr.last.x, dr.last.y);
            }
            else
                ctx.rect(x, y, w, h);
            ctx.stroke();
        }
        if (cursor && brushTools.includes(tool)) {
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(cursor.x, cursor.y, prefs.size / 2, 0, Math.PI * 2);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2 * sw;
            ctx.stroke();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = sw;
            ctx.stroke();
        }
    }
    useEffect(() => { const id = requestAnimationFrame(drawOverlay); return () => cancelAnimationFrame(id); }, [p.revision, zoom, tool, prefs, cursor, path, p.grid]);
    function coordinate(ev: {
        clientX: number;
        clientY: number;
    }) { const r = stage.current!.getBoundingClientRect(), x = ev.clientX - (r.left + r.width / 2), y = ev.clientY - (r.top + r.height / 2), a = -rotation * Math.PI / 180; return { x: (x * Math.cos(a) - y * Math.sin(a)) / zoom + d.width / 2, y: (x * Math.sin(a) + y * Math.cos(a)) / zoom + d.height / 2 }; }
    function bounded(q: Point) { return { x: clamp(q.x, 0, d.width), y: clamp(q.y, 0, d.height) }; }
    function finishPath() { if (path.length < 2)
        return; if (tool === 'polygonLasso') {
        const xs = path.map(p => p.x), ys = path.map(p => p.y);
        e.selection = { kind: 'polygon', points: [...path], x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), feather: prefs.feather };
        e.notify();
    }
    else {
        const layer = makeLayer('Path ' + (d.paths.length + 1), 'shape', d.width, d.height);
        layer.shape = 'path';
        layer.points = [...path];
        layer.color = p.primary;
        layer.stroke = !prefs.shapeFill;
        layer.strokeWidth = prefs.strokeWidth;
        e.doc.paths.push({ id: uid(), name: layer.name, points: [...path] });
        e.add(layer, 'Draw path');
    } setPath([]); }
    useEffect(() => { const down = (ev: KeyboardEvent) => { if ((ev.target as HTMLElement)?.closest('input,textarea,[contenteditable="true"],[role="dialog"]'))
        return; if (ev.code === 'Space') {
        ev.preventDefault();
        setSpace(true);
    } if (ev.key === 'Enter') {
        if (tool === 'pen' || tool === 'polygonLasso')
            finishPath();
        else if (tool === 'crop' && e.selection) {
            e.crop(e.selection);
            p.setTool('move');
        }
    } if (ev.key === 'Escape') {
        setPath([]);
        e.selection = null;
        e.notify();
        drag.current = null;
    } }; const up = (ev: KeyboardEvent) => { if (ev.code === 'Space')
        setSpace(false); }; window.addEventListener('keydown', down); window.addEventListener('keyup', up); return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); }; }, [path, tool, prefs, p.primary]);
    useEffect(() => { const el = host.current; if (!el)
        return; const wheel = (ev: WheelEvent) => { ev.preventDefault(); if (ev.shiftKey) {
        setPan(v => ({ x: v.x - ev.deltaY, y: v.y - ev.deltaX }));
        return;
    } setZoom(clamp(zoom * Math.exp(-ev.deltaY * .0015), .04, 8)); }; el.addEventListener('wheel', wheel, { passive: false }); return () => el.removeEventListener('wheel', wheel); }, [zoom, setZoom]);
    function paint(q: Point) {
        const dr = drag.current;
        if (!dr?.canvas || !dr.layer)
            return;
        const ctx = context(dr.canvas), size = tool === 'pencil' ? Math.min(prefs.size, 8) : prefs.size;
        ctx.save();
        ctx.globalAlpha = prefs.opacity / 100;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = size;
        ctx.strokeStyle = p.primary;
        ctx.fillStyle = p.primary;
        const steps = Math.max(1, Math.ceil(Math.hypot(q.x - dr.last.x, q.y - dr.last.y) / Math.max(1, size * .18)));
        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        }
        if (['dodge', 'burn', 'sponge'].includes(tool)) {
            const x = clamp(Math.floor(q.x - size / 2), 0, d.width - 1), y = clamp(Math.floor(q.y - size / 2), 0, d.height - 1), w = Math.min(Math.ceil(size), d.width - x), h = Math.min(Math.ceil(size), d.height - y);
            const im = ctx.getImageData(x, y, w, h);
            for (let yy = 0; yy < h; yy++)
                for (let xx = 0; xx < w; xx++) {
                    const fall = Math.max(0, 1 - Math.hypot(x + xx - q.x, y + yy - q.y) / (size / 2)) * prefs.opacity / 100;
                    const k = (yy * w + xx) * 4, gray = im.data[k] * .3 + im.data[k + 1] * .59 + im.data[k + 2] * .11;
                    for (let n = 0; n < 3; n++)
                        im.data[k + n] = tool === 'sponge' ? im.data[k + n] + (gray - im.data[k + n]) * .12 * fall : im.data[k + n] + (tool === 'dodge' ? 1 : -1) * 12 * fall;
                }
            ctx.putImageData(im, x, y);
        }
        else if ((tool === 'clone' || tool === 'heal') && dr.source && dr.cloneOffset) {
            ctx.beginPath();
            ctx.arc(q.x, q.y, size / 2, 0, Math.PI * 2);
            ctx.clip();
            if (tool === 'heal') {
                ctx.filter = 'blur(1px)';
                ctx.globalAlpha *= .65;
            }
            ctx.drawImage(dr.source, dr.cloneOffset.x, dr.cloneOffset.y);
        }
        else if (prefs.hardness < 95 && tool !== 'pencil') {
            for (let i = 0; i <= steps; i++) {
                const x = dr.last.x + (q.x - dr.last.x) * i / steps, y = dr.last.y + (q.y - dr.last.y) * i / steps, g = ctx.createRadialGradient(x, y, size / 2 * prefs.hardness / 100, x, y, size / 2);
                g.addColorStop(0, tool === 'eraser' ? '#000' : p.primary);
                g.addColorStop(1, tool === 'eraser' ? '#0000' : p.primary + '00');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        else {
            ctx.beginPath();
            ctx.moveTo(dr.last.x, dr.last.y);
            ctx.lineTo(q.x + .001, q.y + .001);
            ctx.stroke();
        }
        ctx.restore();
        dr.last = q;
        e.notify();
    }
    function onDown(ev: ReactPointerEvent<HTMLCanvasElement>) {
        if (p.busy || ev.button === 2)
            return;
        ev.preventDefault();
        ev.currentTarget.setPointerCapture(ev.pointerId);
        touches.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (touches.current.size === 2) {
            const [a, b] = [...touches.current.values()];
            pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
            if (drag.current?.canvas && drag.current.original && drag.current.layer) {
                Object.assign(drag.current.layer, drag.current.originalLayer);
                e.transient.delete(drag.current.layer.id);
                e.renderCache.clear();
                e.notify();
            }
            drag.current = null;
            return;
        }
        const q = bounded(coordinate(ev)), screen = { x: ev.clientX, y: ev.clientY };
        setPosition(q);
        try {
            if (space || tool === 'hand' || ev.button === 1) {
                drag.current = { mode: 'pan', start: q, last: q, screen, pan: { ...pan } };
                return;
            }
            if (tool === 'zoom') {
                setZoom(clamp(zoom * (ev.altKey ? .8 : 1.25), .04, 8));
                return;
            }
            if (tool === 'eyedropper') {
                const im = context(e.composite()).getImageData(Math.min(d.width - 1, q.x) | 0, Math.min(d.height - 1, q.y) | 0, 1, 1).data;
                p.onColor('#' + [...im.slice(0, 3)].map(n => n.toString(16).padStart(2, '0')).join(''));
                return;
            }
            if (tool === 'text') {
                p.onText(q);
                return;
            }
            if (tool === 'wand' || tool === 'quickSelect') {
                e.selectColor(q, prefs.tolerance);
                return;
            }
            if (tool === 'bucket') {
                e.fill(p.primary, q, prefs.tolerance);
                return;
            }
            if (tool === 'pen' || tool === 'polygonLasso') {
                if (path.length > 2 && Math.hypot(q.x - path[0].x, q.y - path[0].y) < 10 / zoom) {
                    finishPath();
                }
                else
                    setPath(v => [...v, q]);
                return;
            }
            if (tool === 'move') {
                let selected = e.active;
                let resize = false;
                if (selected && prefs.showTransform && !selected.locked) {
                    const local = e.localPoint(selected, q);
                    resize = Math.hypot(local.x - selected.w, local.y - selected.h) < 12 / zoom;
                }
                if (prefs.autoSelect && !resize) {
                    const hit = e.hitTest(q);
                    if (hit) {
                        e.select(hit.id);
                        selected = hit;
                    }
                }
                if (!selected || selected.locked || ['group', 'adjustment'].includes(selected.kind))
                    return;
                drag.current = { mode: resize ? 'resize' : 'move', start: q, last: q, screen, layer: selected, x: selected.x, y: selected.y, w: selected.w, h: selected.h, textSize: selected.text?.size };
                return;
            }
            if (brushTools.includes(tool)) {
                if ((tool === 'clone' || tool === 'heal') && ev.altKey) {
                    cloneOrigin.current = q;
                    toast.success('Sample point set. Paint to retouch.');
                    return;
                }
                if ((tool === 'clone' || tool === 'heal') && !cloneOrigin.current) {
                    toast.info('Alt-click the image to set a sample point first.');
                    return;
                }
                const layer = e.editable(), originalLayer = { ...layer, filters: { ...layer.filters }, text: layer.text ? { ...layer.text } : undefined }, canvas = e.bake(layer), original = createCanvas(d.width, d.height);
                context(original).drawImage(canvas, 0, 0);
                drag.current = { mode: tool, start: q, last: q, screen, layer, canvas, original, originalLayer, source: original, cloneOffset: cloneOrigin.current ? { x: q.x - cloneOrigin.current.x, y: q.y - cloneOrigin.current.y } : undefined };
                paint(q);
                return;
            }
            if (['rectangle', 'ellipse', 'polygon', 'gradient'].includes(tool)) {
                if (tool === 'gradient')
                    e.editable();
                drag.current = { mode: tool, start: q, last: q, screen };
                return;
            }
            if (['marquee', 'ellipseSelect', 'lasso', 'crop'].includes(tool)) {
                drag.current = { mode: tool, start: q, last: q, screen, points: [q] };
                e.selection = { kind: tool === 'ellipseSelect' ? 'ellipse' : 'rect', x: q.x, y: q.y, w: 0, h: 0, feather: prefs.feather };
                e.notify();
            }
        }
        catch (err) {
            toast.error((err as Error).message);
        }
    }
    function onMove(ev: ReactPointerEvent<HTMLCanvasElement>) {
        if (touches.current.has(ev.pointerId))
            touches.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (pinch.current && touches.current.size === 2) {
            const [a, b] = [...touches.current.values()];
            setZoom(clamp(pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.distance, .04, 8));
            return;
        }
        const q = coordinate(ev);
        setCursor(q);
        setPosition(q);
        const dr = drag.current;
        if (!dr)
            return;
        if (dr.mode === 'pan') {
            setPan({ x: dr.pan!.x + ev.clientX - dr.screen.x, y: dr.pan!.y + ev.clientY - dr.screen.y });
            return;
        }
        const b = bounded(q);
        if (dr.mode === 'move' && dr.layer) {
            e.update(dr.layer.id, { x: dr.x! + q.x - dr.start.x, y: dr.y! + q.y - dr.start.y });
            return;
        }
        if (dr.mode === 'resize' && dr.layer) {
            const w = Math.max(10, dr.w! + q.x - dr.start.x), h = ev.shiftKey ? w * dr.h! / dr.w! : Math.max(10, dr.h! + q.y - dr.start.y);
            e.update(dr.layer.id, { w: Math.min(w, 8192), h: Math.min(h, 8192), ...(dr.layer.text && dr.textSize ? { text: { ...dr.layer.text, size: dr.textSize * w / dr.w! } } : {}) });
            return;
        }
        if (dr.canvas) {
            paint(b);
            return;
        }
        dr.last = b;
        if (['marquee', 'ellipseSelect', 'lasso', 'crop'].includes(dr.mode)) {
            const x = Math.min(dr.start.x, b.x), y = Math.min(dr.start.y, b.y), w = Math.abs(b.x - dr.start.x), h = ev.shiftKey ? w : Math.abs(b.y - dr.start.y);
            if (dr.mode === 'lasso') {
                dr.points!.push(b);
                e.selection = { kind: 'polygon', x, y, w, h, points: [...dr.points!], feather: prefs.feather };
            }
            else
                e.selection = { kind: dr.mode === 'ellipseSelect' ? 'ellipse' : 'rect', x, y, w, h, feather: prefs.feather };
            e.notify();
        }
        else
            drawOverlay();
    }
    function onUp(ev: ReactPointerEvent<HTMLCanvasElement>) {
        touches.current.delete(ev.pointerId);
        if (pinch.current) {
            if (touches.current.size < 2)
                pinch.current = null;
            return;
        }
        const dr = drag.current;
        if (!dr)
            return;
        drag.current = null;
        try {
            if (dr.canvas && dr.layer) {
                e.saveBitmap(e.applySelection(dr.canvas, dr.original!), dr.layer, toolName(dr.mode as Tool) + ' stroke');
            }
            else if (dr.mode === 'move' || dr.mode === 'resize') {
                if (Math.hypot(ev.clientX - dr.screen.x, ev.clientY - dr.screen.y) > 1)
                    e.commit(dr.mode === 'move' ? 'Move layer' : 'Resize layer');
            }
            else if (['rectangle', 'ellipse', 'polygon'].includes(dr.mode)) {
                const w = Math.abs(dr.last.x - dr.start.x), h = Math.abs(dr.last.y - dr.start.y);
                if (w < 2 || h < 2)
                    return;
                const layer = makeLayer(toolName(dr.mode as Tool), 'shape', w, h);
                layer.x = Math.min(dr.start.x, dr.last.x);
                layer.y = Math.min(dr.start.y, dr.last.y);
                layer.color = p.primary;
                layer.shape = dr.mode as 'rectangle' | 'ellipse' | 'polygon';
                layer.stroke = !prefs.shapeFill;
                layer.strokeWidth = prefs.strokeWidth;
                e.add(layer, 'Draw ' + dr.mode);
            }
            else if (dr.mode === 'gradient') {
                const layer = e.editable(), c = e.bake(layer), ctx = context(c), original = createCanvas(d.width, d.height);
                context(original).drawImage(c, 0, 0);
                const g = ctx.createLinearGradient(dr.start.x, dr.start.y, dr.last.x + .01, dr.last.y + .01);
                g.addColorStop(0, p.primary);
                g.addColorStop(1, p.secondary);
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, d.width, d.height);
                e.saveBitmap(e.applySelection(c, original), layer, 'Apply gradient');
            }
            else if (e.selection && e.selection.w < 2 && e.selection.h < 2) {
                e.selection = null;
                e.notify();
            }
        }
        catch (err) {
            toast.error((err as Error).message);
        }
        drawOverlay();
    }
    return <section className={'canvas-workspace ' + (dragOver ? 'is-dragover' : '')} ref={host} onDragOver={ev => { ev.preventDefault(); setDragOver(true); }} onDragLeave={ev => { if (!ev.currentTarget.contains(ev.relatedTarget as Node))
        setDragOver(false); }} onDrop={ev => { ev.preventDefault(); setDragOver(false); p.onImport(ev.dataTransfer.files); }}>
  {p.rulers && <><div className="ruler-corner"/><div className="ruler ruler-top">{Array.from({ length: 21 }, (_, i) => <span key={i}>{i * 100}</span>)}</div><div className="ruler ruler-left">{Array.from({ length: 15 }, (_, i) => <span key={i}>{i * 100}</span>)}</div></>}
  <div className="canvas-label">{d.name.toUpperCase()} <span> / </span> {d.width} × {d.height}</div>
  <div className="stage-position" style={{ transform: 'translate(calc(-50% + ' + pan.x + 'px), calc(-50% + ' + pan.y + 'px)) rotate(' + rotation + 'deg)', width: d.width * zoom, height: d.height * zoom }} ref={stage}>
   <div className="artboard"><canvas ref={art} width={d.width} height={d.height} aria-label="Image artwork"/><canvas ref={overlay} width={d.width} height={d.height} className="interaction-canvas" role="img" aria-label="Editable canvas. Use toolbar tools or keyboard shortcuts to edit." style={{ cursor: space || tool === 'hand' ? 'grab' : tool === 'move' ? 'default' : tool === 'text' ? 'text' : brushTools.includes(tool) ? 'none' : 'crosshair' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={ev => { touches.current.delete(ev.pointerId); const dr = drag.current; if (dr?.originalLayer && dr.layer) {
        Object.assign(dr.layer, dr.originalLayer);
        e.transient.delete(dr.layer.id);
        e.renderCache.clear();
        e.notify();
    } drag.current = null; pinch.current = null; }} onPointerLeave={() => { if (!drag.current)
        setCursor(null); }} onDoubleClick={() => { if (tool === 'pen' || tool === 'polygonLasso')
        finishPath(); }} onContextMenu={ev => ev.preventDefault()}/></div>
  </div>
  {dragOver && <div className="drop-overlay"><Upload size={34}/><h2>Drop it into your canvas</h2><p>PNG, JPG, WebP, SVG, PSD, or PixelCraft project</p></div>}
  {(tool === 'pen' || tool === 'polygonLasso') && path.length > 0 ? <div className="canvas-actions"><span>{path.length} points</span><button onClick={finishPath}><Check size={15}/>Finish path <kbd>↵</kbd></button><IconButton label="Cancel path" onClick={() => setPath([])}><X size={15}/></IconButton></div> : e.selection ? <div className="canvas-actions"><span>{Math.round(e.selection.w)} × {Math.round(e.selection.h)} px</span>{tool === 'crop' ? <button onClick={() => { e.crop(e.selection!); p.setTool('move'); }}><Check size={15}/>Apply crop</button> : <button onClick={p.onMagic}><Sparkles size={15}/>Smart fill</button>}<button onClick={() => { e.selection = null; e.notify(); }}>Deselect <kbd>Esc</kbd></button></div> : <div className="canvas-hint"><MousePointer2 size={14}/><span>{space ? 'Drag to pan' : tool === 'move' ? 'Select a layer. Make it your own.' : brushTools.includes(tool) ? 'Paint on the selected layer · [ ] to resize brush' : selectionTools.includes(tool) ? 'Drag to select an area' : tool === 'pen' ? 'Click to add points · Enter to finish' : tool === 'crop' ? 'Drag a crop region · Enter to apply' : tool === 'text' ? 'Click to add text. Double-click a text layer to edit.' : tool === 'gradient' ? 'Drag to blend your foreground and background colors' : tool === 'eyedropper' ? 'Click to sample a color' : tool === 'hand' ? 'Drag to explore your canvas' : tool === 'zoom' ? 'Click to zoom in · Alt-click to zoom out' : 'Click and drag to create'}</span></div>}
  <div className="viewport-controls"><IconButton label="Zoom out" onClick={() => setZoom(clamp(zoom / 1.2, .04, 8))}><Minus size={16}/></IconButton><Choice label="Canvas zoom" value={String(Math.round(zoom * 100))} onChange={v => v === 'fit' ? fit() : setZoom(Number(v) / 100)} options={[[String(Math.round(zoom * 100)), Math.round(zoom * 100) + '%'], ...['25', '50', '75', '100', '150', '200'].filter(v => v !== String(Math.round(zoom * 100))).map(v => [v, v + '%'] as [
            string,
            string
        ]), ['fit', 'Fit canvas']]}/><IconButton label="Zoom in" onClick={() => setZoom(clamp(zoom * 1.2, .04, 8))}><Plus size={16}/></IconButton><i /><IconButton label="Fit canvas (Ctrl+0)" onClick={fit}><Maximize2 size={15}/></IconButton><IconButton label="Rotate view 15°" onClick={() => setRotation((rotation + 15) % 360)}><RotateCcw size={15}/></IconButton></div>
  <div className="cursor-coords">X {Math.round(position.x)} <span>Y {Math.round(position.y)}</span></div>
 </section>;
}
