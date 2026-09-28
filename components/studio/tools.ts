import { MousePointer2, SquareDashed, Lasso, WandSparkles, Crop, PenTool, Square, Brush, Pencil, Eraser, Blend, PaintBucket, Stamp, Bandage, Sun, Type, Hand, ZoomIn, Pipette, CircleDashed, Circle, Hexagon, Flame, Droplets, ScanLine, Magnet } from 'lucide-react';
import type { Tool } from '@/lib/studio/types';
export const toolGroups: [
    Tool,
    string,
    string,
    typeof MousePointer2
][][] = [
    [['move', 'Move', 'V', MousePointer2], ['marquee', 'Marquee', 'M', SquareDashed]],
    [['lasso', 'Lasso', 'L', Lasso], ['wand', 'Magic wand', 'W', WandSparkles]],
    [['crop', 'Crop', 'C', Crop], ['eyedropper', 'Eyedropper', 'I', Pipette]],
    [['brush', 'Brush', 'B', Brush], ['eraser', 'Eraser', 'E', Eraser]],
    [['clone', 'Clone stamp', 'S', Stamp], ['heal', 'Healing brush', 'J', Bandage]],
    [['gradient', 'Gradient', 'G', Blend], ['dodge', 'Dodge', 'O', Sun]],
    [['pen', 'Pen', 'P', PenTool], ['text', 'Type', 'T', Type]],
    [['rectangle', 'Rectangle', 'U', Square], ['hand', 'Hand', 'H', Hand]],
    [['zoom', 'Zoom', 'Z', ZoomIn], ['pencil', 'Pencil', '', Pencil]],
];
export const variants: Partial<Record<Tool, [
    Tool,
    string,
    typeof MousePointer2
][]>> = { marquee: [['marquee', 'Rectangular', SquareDashed], ['ellipseSelect', 'Elliptical', CircleDashed]], ellipseSelect: [['marquee', 'Rectangular', SquareDashed], ['ellipseSelect', 'Elliptical', CircleDashed]], lasso: [['lasso', 'Freehand', Lasso], ['polygonLasso', 'Polygonal', ScanLine]], polygonLasso: [['lasso', 'Freehand', Lasso], ['polygonLasso', 'Polygonal', ScanLine]], wand: [['wand', 'Magic wand', WandSparkles], ['quickSelect', 'Quick select', Magnet]], quickSelect: [['wand', 'Magic wand', WandSparkles], ['quickSelect', 'Quick select', Magnet]], brush: [['brush', 'Brush', Brush], ['pencil', 'Pencil', Pencil]], pencil: [['brush', 'Brush', Brush], ['pencil', 'Pencil', Pencil]], gradient: [['gradient', 'Gradient', Blend], ['bucket', 'Paint bucket', PaintBucket]], bucket: [['gradient', 'Gradient', Blend], ['bucket', 'Paint bucket', PaintBucket]], dodge: [['dodge', 'Dodge', Sun], ['burn', 'Burn', Flame], ['sponge', 'Sponge', Droplets]], burn: [['dodge', 'Dodge', Sun], ['burn', 'Burn', Flame], ['sponge', 'Sponge', Droplets]], sponge: [['dodge', 'Dodge', Sun], ['burn', 'Burn', Flame], ['sponge', 'Sponge', Droplets]], rectangle: [['rectangle', 'Rectangle', Square], ['ellipse', 'Ellipse', Circle], ['polygon', 'Polygon', Hexagon]], ellipse: [['rectangle', 'Rectangle', Square], ['ellipse', 'Ellipse', Circle], ['polygon', 'Polygon', Hexagon]], polygon: [['rectangle', 'Rectangle', Square], ['ellipse', 'Ellipse', Circle], ['polygon', 'Polygon', Hexagon]] };
export const toolName = (t: Tool) => toolGroups.flat().find(v => v[0] === t)?.[1] ?? Object.values(variants).flat().find(v => v?.[0] === t)?.[1] ?? t;
export const brushTools: Tool[] = ['brush', 'pencil', 'eraser', 'clone', 'heal', 'dodge', 'burn', 'sponge'];
export const selectionTools: Tool[] = ['marquee', 'ellipseSelect', 'lasso', 'polygonLasso', 'wand', 'quickSelect'];
export type Preferences = {
    size: number;
    hardness: number;
    opacity: number;
    tolerance: number;
    feather: number;
    autoSelect: boolean;
    showTransform: boolean;
    shapeFill: boolean;
    font: string;
    fontSize: number;
    strokeWidth: number;
};
