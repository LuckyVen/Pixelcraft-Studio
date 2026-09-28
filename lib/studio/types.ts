export type Point = {
    x: number;
    y: number;
};
export type Tool = 'move' | 'marquee' | 'ellipseSelect' | 'lasso' | 'polygonLasso' | 'wand' | 'quickSelect' | 'crop' | 'pen' | 'rectangle' | 'ellipse' | 'polygon' | 'brush' | 'pencil' | 'eraser' | 'gradient' | 'bucket' | 'clone' | 'heal' | 'dodge' | 'burn' | 'sponge' | 'text' | 'hand' | 'zoom' | 'eyedropper';
export type Filters = {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    blur: number;
    sharpness: number;
    red: number;
    green: number;
    blue: number;
};
export const defaultFilters: Filters = { brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0, sharpness: 0, red: 0, green: 0, blue: 0 };
export type TextStyle = {
    content: string;
    font: string;
    size: number;
    weight: number;
    tracking: number;
    leading: number;
    align: 'left' | 'center' | 'right';
    italic: boolean;
};
export type Selection = {
    kind: 'rect' | 'ellipse' | 'polygon' | 'mask';
    x: number;
    y: number;
    w: number;
    h: number;
    points?: Point[];
    mask?: string;
    inverted?: boolean;
    feather?: number;
};
export type Layer = {
    id: string;
    name: string;
    kind: 'raster' | 'text' | 'shape' | 'adjustment' | 'group';
    x: number;
    y: number;
    w: number;
    h: number;
    rotation: number;
    visible: boolean;
    locked: boolean;
    opacity: number;
    fill: number;
    blend: GlobalCompositeOperation;
    src?: string;
    color: string;
    text?: TextStyle;
    shape?: 'rectangle' | 'ellipse' | 'polygon' | 'path';
    points?: Point[];
    stroke?: boolean;
    strokeWidth?: number;
    filters: Filters;
    mask?: Selection;
    parent?: string;
};
export type SavedPath = {
    id: string;
    name: string;
    points: Point[];
};
export type StudioDoc = {
    version: 1;
    name: string;
    width: number;
    height: number;
    layers: Layer[];
    paths: SavedPath[];
};
export type HistoryEntry = {
    id: string;
    label: string;
    doc: StudioDoc;
    selected: string;
    time: number;
};
export const uid = () => Math.random().toString(36).slice(2, 10);
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export function makeLayer(name: string, kind: Layer['kind'], w: number, h: number): Layer { return { id: uid(), name, kind, x: 0, y: 0, w, h, rotation: 0, visible: true, locked: false, opacity: 100, fill: 100, blend: 'source-over', color: '#ffffff', filters: { ...defaultFilters } }; }
export function cloneDoc(d: StudioDoc): StudioDoc { return { ...d, layers: d.layers.map(l => ({ ...l, filters: { ...l.filters }, text: l.text ? { ...l.text } : undefined, mask: l.mask ? { ...l.mask, points: l.mask.points?.map(p => ({ ...p })) } : undefined, points: l.points?.map(p => ({ ...p })) })), paths: d.paths.map(p => ({ ...p, points: p.points.map(v => ({ ...v })) })) }; }
