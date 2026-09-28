'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MousePointer2, ChevronDown, ChevronRight, Plus, Upload, Download, Undo2, Redo2, SlidersHorizontal, Layers, PanelRightClose, PanelRightOpen, ShieldCheck, Sparkles, Command, ArrowLeftRight, Maximize, HelpCircle, Check, LoaderCircle, Image as ImageIcon, FilePlus2, Save, Copy, Scissors, Trash2, SquareDashed, LockKeyhole, FolderPlus, RotateCcw, Type, Settings2, Keyboard, ExternalLink, Code2, CheckCircle2, AlertCircle, Minus, PenTool, Brush, X, Sun } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { StudioEngine, downloadBlob } from '@/lib/studio/engine';
import { importFile, exportImage, removeBackground } from '@/lib/studio/io';
import { clamp, makeLayer, defaultFilters, type Tool, type Point } from '@/lib/studio/types';
import { IconButton, Choice, Range, NumberBox } from './controls';
import { toolGroups, variants, toolName, brushTools, selectionTools, type Preferences } from './tools';
import Viewport from './Viewport';
import Dock from './Dock';
type Modal = 'new' | 'export' | 'text' | 'magic' | 'resize' | 'help' | null;
type MenuItem = {
    label: string;
    action: () => void;
    shortcut?: string;
    disabled?: boolean;
} | null;
export default function Studio() {
    const [engine] = useState(() => new StudioEngine()), [revision, setRevision] = useState(0), [ready, setReady] = useState(false), [tool, setTool] = useState<Tool>('move'), [primary, setPrimary] = useState('#ffffff'), [secondary, setSecondary] = useState('#181820'), [zoom, setZoom] = useState(.5), [rotation, setRotation] = useState(0), [rulers, setRulers] = useState(true), [grid, setGrid] = useState(false), [dockOpen, setDockOpen] = useState(true), [panelTab, setPanelTab] = useState('properties'), [fitToken, setFitToken] = useState(0), [modal, setModal] = useState<Modal>(null), [busy, setBusy] = useState(''), [prefs, setPrefs] = useState<Preferences>({ size: 32, hardness: 85, opacity: 100, tolerance: 25, feather: 0, autoSelect: true, showTransform: true, shapeFill: true, font: 'Arial', fontSize: 64, strokeWidth: 3 });
    const [newName, setNewName] = useState('Untitled project'), [newWidth, setNewWidth] = useState(1600), [newHeight, setNewHeight] = useState(1200), [newBg, setNewBg] = useState('transparent'), [format, setFormat] = useState('png'), [exportScale, setExportScale] = useState('1'), [quality, setQuality] = useState(95), [text, setText] = useState(''), [textPosition, setTextPosition] = useState<Point>({ x: 100, y: 100 }), [editingText, setEditingText] = useState(''), [magicMode, setMagicMode] = useState<'background' | 'fill'>('background');
    const fileRef = useRef<HTMLInputElement>(null), initialized = useRef(false), live = useRef({ tool, modal });
    live.current = { tool, modal };
    const e = engine, d = e.doc, l = e.active;
    const action = useCallback((f: () => unknown) => { try {
        const r = f();
        if (r instanceof Promise)
            r.catch((err: Error) => toast.error(err.message));
    }
    catch (err) {
        toast.error((err as Error).message);
    } }, []);
    const pref = (patch: Partial<Preferences>) => setPrefs(v => ({ ...v, ...patch }));
    const fit = () => setFitToken(t => t + 1);
    useEffect(() => e.subscribe(() => setRevision(e.revision)), [e]);
    useEffect(() => { if (initialized.current)
        return; initialized.current = true; setDockOpen(window.innerWidth > 1050); e.initDemo().then(() => { setReady(true); fit(); }).catch(() => { e.newDocument('Untitled', 1600, 1200, 'transparent'); setReady(true); fit(); toast.info('Start a new composition or import your own image.'); }); }, [e]);
    const save = useCallback(async () => { try {
        const json = await e.serialize();
        downloadBlob(new Blob([json], { type: 'application/json' }), e.doc.name + '.pixelcraft');
        e.savedIndex = e.historyIndex;
        e.notify();
        toast.success('Project downloaded. Your layers are preserved.');
    }
    catch (err) {
        toast.error((err as Error).message);
    } }, [e]);
    const openText = (point?: Point) => { if (!point && e.active?.kind === 'text') {
        setText(e.active.text!.content);
        setEditingText(e.active.id);
    }
    else {
        setText('Your next great idea.');
        setEditingText('');
        setTextPosition(point ?? { x: 100, y: 100 });
    } setModal('text'); };
    const openMagic = () => { setMagicMode(e.selection ? 'fill' : 'background'); setModal('magic'); };
    const addAdjustment = () => { const layer = makeLayer('Color adjustment', 'adjustment', d.width, d.height); e.add(layer, 'Add adjustment layer'); setPanelTab('adjustments'); setDockOpen(true); };
    const onImport = async (files: FileList | File[]) => { if (busy)
        return; setBusy('Opening your file…'); try {
        for (const file of Array.from(files)) {
            await importFile(e, file);
            if (/\.(psd|pixelcraft)$/i.test(file.name))
                fit();
        }
        toast.success(Array.from(files).length > 1 ? 'Images added as layers' : 'File opened');
        if (Array.from(files).some(f => /\.psd$/i.test(f.name)))
            toast.info('PSD pixel layers imported. Some Photoshop effects and editable type may differ.');
    }
    catch (err) {
        toast.error((err as Error).message);
    }
    finally {
        setBusy('');
    } };
    useEffect(() => { const before = (ev: BeforeUnloadEvent) => { if (e.dirty) {
        ev.preventDefault();
        ev.returnValue = '';
    } }; window.addEventListener('beforeunload', before); return () => window.removeEventListener('beforeunload', before); }, [e]);
    useEffect(() => { const handler = (ev: KeyboardEvent) => { const tag = ev.target as HTMLElement; if (tag?.closest('input,textarea,select,[contenteditable="true"]') || live.current.modal || busy)
        return; const mod = ev.ctrlKey || ev.metaKey, k = ev.key.toLowerCase(); if (mod) {
        if (['s', 'o', 'n', 'z', 'y', 'd', 'a', 'j', '0', '1'].includes(k))
            ev.preventDefault();
        if (k === 's') {
            ev.shiftKey ? setModal('export') : save();
        }
        else if (k === 'o')
            fileRef.current?.click();
        else if (k === 'n')
            setModal('new');
        else if (k === 'z') {
            ev.shiftKey ? e.redo() : e.undo();
        }
        else if (k === 'y')
            e.redo();
        else if (k === 'd') {
            e.selection = null;
            e.notify();
        }
        else if (k === 'a') {
            e.selection = { kind: 'rect', x: 0, y: 0, w: e.doc.width, h: e.doc.height };
            e.notify();
        }
        else if (k === 'j')
            action(() => e.duplicate());
        else if (k === '0')
            fit();
        else if (k === '1') {
            setZoom(1);
            setRotation(0);
        }
        return;
    } if (k === 'delete' || k === 'backspace') {
        ev.preventDefault();
        action(() => e.selection ? e.clearSelection() : e.deleteLayer());
        return;
    } if (k === 'x') {
        setPrimary(secondary);
        setSecondary(primary);
        return;
    } if (k === 'd') {
        setPrimary('#000000');
        setSecondary('#ffffff');
        return;
    } if (k === '[') {
        pref({ size: Math.max(1, prefs.size - 5) });
        return;
    } if (k === ']') {
        pref({ size: Math.min(300, prefs.size + 5) });
        return;
    } if (k === 'tab') {
        ev.preventDefault();
        setDockOpen(v => !v);
        return;
    } if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k) && e.active && !e.active.locked) {
        ev.preventDefault();
        const n = ev.shiftKey ? 10 : 1;
        e.update(e.active.id, { x: e.active.x + (k === 'arrowleft' ? -n : k === 'arrowright' ? n : 0), y: e.active.y + (k === 'arrowup' ? -n : k === 'arrowdown' ? n : 0) }, 'Nudge layer');
        return;
    } const t = toolGroups.flat().find(t => t[2].toLowerCase() === k); if (t) {
        if (ev.shiftKey && variants[live.current.tool]) {
            const list = variants[live.current.tool]!;
            setTool(list[(list.findIndex(v => v[0] === live.current.tool) + 1) % list.length][0]);
        }
        else
            setTool(t[0]);
    } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [e, prefs.size, primary, secondary, busy, save, action]);
    useEffect(() => {
        const modelContext = (document as Document & {
            modelContext?: {
                registerTool: (tool: unknown, options?: {
                    signal: AbortSignal;
                }) => void | Promise<void>;
            };
        }).modelContext;
        if (!modelContext?.registerTool)
            return;
        const lifecycle = new AbortController();
        const register = (tool: unknown) => { try {
            Promise.resolve(modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => { });
        }
        catch { } };
        register({ name: 'read_pixelcraft_document', title: 'Read canvas document', description: 'Read document dimensions, selection, and editable layer metadata. Does not return pixel data.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: () => ({ name: e.doc.name, width: e.doc.width, height: e.doc.height, selected: e.selected, layers: e.doc.layers.map(({ id, name, kind, visible, opacity, locked }) => ({ id, name, kind, visible, opacity, locked })) }) });
        register({ name: 'set_pixelcraft_layer_visibility', title: 'Set layer visibility', description: 'Show or hide an existing layer and add an undo history step.', inputSchema: { type: 'object', properties: { layerId: { type: 'string' }, visible: { type: 'boolean' } }, required: ['layerId', 'visible'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: (input: unknown) => { const v = input as {
                layerId?: unknown;
                visible?: unknown;
            }; if (!v || typeof v.layerId !== 'string' || typeof v.visible !== 'boolean' || !e.doc.layers.some(l => l.id === v.layerId))
                throw new Error('A valid layerId and visible boolean are required.'); e.update(v.layerId, { visible: v.visible }, 'Set layer visibility'); return { layerId: v.layerId, visible: v.visible }; } });
        register({ name: 'add_pixelcraft_text_layer', title: 'Add editable text', description: 'Add visible editable text to the canvas, using the same type layer engine as the Type tool.', inputSchema: { type: 'object', properties: { text: { type: 'string', maxLength: 2000 }, x: { type: 'number' }, y: { type: 'number' }, size: { type: 'number', minimum: 6, maximum: 600 } }, required: ['text', 'x', 'y'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: (input: unknown) => { const v = input as {
                text: string;
                x: number;
                y: number;
                size?: number;
            }; if (!v || typeof v.text !== 'string' || v.text.length > 2000 || !Number.isFinite(v.x) || !Number.isFinite(v.y) || (v.size !== undefined && (!Number.isFinite(v.size) || v.size < 6 || v.size > 600)))
                throw new Error('Invalid text layer arguments.'); const l = e.textLayer(v.text, v.x, v.y, v.size ?? 64); e.add(l, 'Add text'); return { layerId: l.id, name: l.name }; } });
        return () => lifecycle.abort();
    }, [e]);
    const menus: Record<string, MenuItem[]> = {
        File: [{ label: 'New document', shortcut: 'Ctrl N', action: () => setModal('new') }, { label: 'Open / place image…', shortcut: 'Ctrl O', action: () => fileRef.current?.click() }, null, { label: 'Save project…', shortcut: 'Ctrl S', action: () => void save() }, { label: 'Export image…', shortcut: 'Ctrl Shift S', action: () => setModal('export') }],
        Edit: [{ label: 'Undo', shortcut: 'Ctrl Z', disabled: e.historyIndex <= 0, action: () => e.undo() }, { label: 'Redo', shortcut: 'Ctrl Shift Z', disabled: e.historyIndex >= e.history.length - 1, action: () => e.redo() }, null, { label: 'Duplicate layer', shortcut: 'Ctrl J', action: () => action(() => e.duplicate()) }, { label: 'Clear selected pixels', action: () => action(() => e.clearSelection()) }],
        Image: [{ label: 'Image size…', action: () => { setNewWidth(d.width); setNewHeight(d.height); setModal('resize'); } }, { label: 'Crop canvas', shortcut: 'C', action: () => setTool('crop') }, { label: 'Rotate view 90°', action: () => setRotation(v => (v + 90) % 360) }, null, { label: 'Adjustments', action: () => { setDockOpen(true); setPanelTab('adjustments'); } }],
        Layer: [{ label: 'New layer', action: () => action(() => e.newLayer()) }, { label: 'Duplicate layer', shortcut: 'Ctrl J', action: () => action(() => e.duplicate()) }, { label: 'New adjustment layer', action: addAdjustment }, { label: 'Add / remove mask', action: () => action(() => e.addMask()) }, { label: 'Group selected layer', action: () => e.group() }, { label: 'Ungroup', disabled: l?.kind !== 'group', action: () => e.ungroup() }, null, { label: l?.locked ? 'Unlock layer' : 'Lock layer', action: () => l && e.update(l.id, { locked: !l.locked }, 'Toggle lock') }, { label: 'Delete layer', disabled: !l || l.locked, action: () => e.deleteLayer() }],
        Type: [{ label: 'Add text…', shortcut: 'T', action: () => openText({ x: 100, y: 100 }) }, { label: 'Edit text…', disabled: l?.kind !== 'text', action: () => openText() }, { label: 'Character & paragraph', action: () => { setPanelTab('properties'); setDockOpen(true); } }],
        Select: [{ label: 'Select all', shortcut: 'Ctrl A', action: () => { e.selection = { kind: 'rect', x: 0, y: 0, w: d.width, h: d.height }; e.notify(); } }, { label: 'Deselect', shortcut: 'Ctrl D', disabled: !e.selection, action: () => { e.selection = null; e.notify(); } }, { label: 'Invert selection', disabled: !e.selection, action: () => { if (e.selection)
                    e.selection.inverted = !e.selection.inverted; e.notify(); } }, { label: 'Rectangular marquee', shortcut: 'M', action: () => setTool('marquee') }, { label: 'Elliptical marquee', action: () => setTool('ellipseSelect') }, { label: 'Polygonal lasso', action: () => setTool('polygonLasso') }],
        Filter: [{ label: 'Live adjustments', action: () => { setDockOpen(true); setPanelTab('adjustments'); } }, { label: 'Remove background…', action: () => { setMagicMode('background'); setModal('magic'); } }, { label: 'Content-aware fill…', action: () => { setMagicMode('fill'); setModal('magic'); } }, null, { label: 'Reset layer adjustments', action: () => l && e.update(l.id, { filters: { ...defaultFilters } }, 'Reset adjustments') }],
        View: [{ label: 'Fit canvas', shortcut: 'Ctrl 0', action: fit }, { label: 'Actual size', shortcut: 'Ctrl 1', action: () => setZoom(1) }, { label: rulers ? 'Hide rulers' : 'Show rulers', action: () => setRulers(v => !v) }, { label: grid ? 'Hide grid' : 'Show grid', action: () => setGrid(v => !v) }, { label: 'Reset view rotation', action: () => setRotation(0) }],
        Window: [{ label: dockOpen ? 'Hide studio panels' : 'Show studio panels', shortcut: 'Tab', action: () => setDockOpen(v => !v) }, { label: 'History', action: () => { setPanelTab('history'); setDockOpen(true); } }, { label: 'Properties', action: () => { setPanelTab('properties'); setDockOpen(true); } }],
        Help: [{ label: 'Keyboard shortcuts & guide', shortcut: '?', action: () => setModal('help') }, { label: 'Download open-source code', action: () => { const a = document.createElement('a'); a.href = '/pixelcraft-studio-source.zip'; a.download = 'pixelcraft-studio-source.zip'; a.click(); } }]
    };
    async function runMagic() { setBusy(magicMode === 'background' ? 'Preparing background removal…' : 'Reconstructing selected pixels…'); try {
        if (magicMode === 'background') {
            await removeBackground(e, setBusy);
            toast.success('Background removed on a new layer.');
        }
        else {
            await new Promise(r => setTimeout(r, 30));
            await e.smartFill();
            toast.success('Selected area filled from surrounding pixels.');
        }
        setModal(null);
    }
    catch (err) {
        toast.error((err as Error).message || 'The model could not load. Check your connection and try again.');
    }
    finally {
        setBusy('');
    } }
    async function doExport() { setBusy('Preparing your export…'); try {
        const scale = Number(exportScale);
        if (d.width * d.height * scale * scale > 32e6)
            throw new Error('Export size is too large. Choose a smaller scale.');
        await exportImage(e, format, scale, quality);
        setModal(null);
        toast.success('Your image is ready.');
    }
    catch (err) {
        toast.error((err as Error).message);
    }
    finally {
        setBusy('');
    } }
    const ActiveIcon = toolGroups.flat().find(v => v[0] === tool)?.[3] ?? MousePointer2;
    return <TooltipProvider delayDuration={300}><main className={'studio ' + (!dockOpen ? 'dock-hidden' : '')}>
  <input className="sr-only" tabIndex={-1} ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp,.svg,.psd,.pixelcraft" multiple onChange={ev => { if (ev.target.files)
        onImport(ev.target.files); ev.target.value = ''; }}/>
  <header className="top-header"><a className="brand" href="/" onClick={ev => { ev.preventDefault(); setModal('help'); }}><img src="/favicon.svg" alt="PixelCraft prism mark" width="36" height="36"/><span>PixelCraft<span className="brand-studio">STUDIO</span></span></a><nav className="main-menu" aria-label="Main menu">{Object.entries(menus).map(([name, items]) => <DropdownMenu key={name}><DropdownMenuTrigger className="menu-trigger">{name}</DropdownMenuTrigger><DropdownMenuContent align="start" className="app-menu">{items.map((item, i) => item ? <DropdownMenuItem key={item.label} disabled={item.disabled || !!busy} onSelect={item.action}>{item.label}{item.shortcut && <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>}</DropdownMenuItem> : <DropdownMenuSeparator key={i}/>)}</DropdownMenuContent></DropdownMenu>)}</nav><div className="header-right"><span className="privacy-badge"><ShieldCheck size={14}/><span>On your device</span></span><span className="header-divider"/><IconButton label="Help and shortcuts" onClick={() => setModal('help')}><HelpCircle size={18}/></IconButton><button className="export-button" onClick={() => setModal('export')} disabled={!ready || !!busy}><Download size={16}/><span>Export</span><ChevronDown size={13}/></button></div></header>
  <section className="context-bar" aria-label="Tool options"><div className="current-tool"><ActiveIcon size={18}/><span>{toolName(tool)}</span><ChevronDown size={12}/></div><span className="context-divider"/>{variants[tool] && <><Choice label="Tool variant" value={tool} options={variants[tool]!.map(t => [t[0], t[1]])} onChange={v => setTool(v as Tool)}/><span className="context-divider"/></>}
   {tool === 'move' ? <><label className="checkbox-label"><Checkbox checked={prefs.autoSelect} onCheckedChange={v => pref({ autoSelect: !!v })}/>Auto-select</label><span className="context-subtle">Layer</span><label className="checkbox-label"><Checkbox checked={prefs.showTransform} onCheckedChange={v => pref({ showTransform: !!v })}/>Show transform controls</label></> : brushTools.includes(tool) ? <><NumberBox label="Size" value={prefs.size} onChange={size => pref({ size })} min={1} max={300} suffix="px"/><NumberBox label="Hardness" value={prefs.hardness} onChange={hardness => pref({ hardness })} min={0} max={100} suffix="%"/><NumberBox label="Opacity" value={prefs.opacity} onChange={opacity => pref({ opacity })} min={1} max={100} suffix="%"/>{(tool === 'clone' || tool === 'heal') && <span className="context-subtle">Alt-click to sample</span>}</> : selectionTools.includes(tool) ? <><NumberBox label="Feather" value={prefs.feather} onChange={feather => pref({ feather })} min={0} max={50} suffix="px"/>{(tool === 'wand' || tool === 'quickSelect') && <NumberBox label="Tolerance" value={prefs.tolerance} onChange={tolerance => pref({ tolerance })} min={1} max={100}/>}<span className="context-subtle">{tool === 'polygonLasso' ? 'Enter to close selection' : 'Drag to select'}</span></> : tool === 'text' ? <><Choice label="Type font" value={prefs.font} options={['Arial', 'Georgia', 'Verdana', 'Courier New']} onChange={font => pref({ font })}/><NumberBox label="Size" value={prefs.fontSize} onChange={fontSize => pref({ fontSize })} min={6} max={600} suffix="px"/><button className="text-button" onClick={() => openText()}>Edit selected text</button></> : ['rectangle', 'ellipse', 'polygon', 'pen'].includes(tool) ? <><Choice label="Shape mode" value={prefs.shapeFill ? 'fill' : 'stroke'} options={[['fill', 'Fill'], ['stroke', 'Stroke']]} onChange={v => pref({ shapeFill: v === 'fill' })}/><NumberBox label="Stroke" value={prefs.strokeWidth} onChange={strokeWidth => pref({ strokeWidth })} min={1} max={100} suffix="px"/><label className="inline-color"><span>Color</span><input type="color" aria-label="Tool color" value={primary} onChange={ev => setPrimary(ev.target.value)}/></label></> : tool === 'crop' ? <span className="context-subtle">Drag a region, then press Enter to crop your canvas</span> : tool === 'bucket' ? <NumberBox label="Tolerance" value={prefs.tolerance} onChange={tolerance => pref({ tolerance })} min={1} max={100}/> : <span className="context-subtle">{tool === 'gradient' ? 'Foreground → Background' : tool === 'eyedropper' ? 'Sample color from all visible layers' : tool === 'zoom' ? 'Click to zoom · Alt-click to zoom out' : 'Drag to pan · Scroll to zoom'}</span>}
   <div className="context-actions"><IconButton label="Undo (Ctrl+Z)" onClick={() => e.undo()} disabled={e.historyIndex <= 0 || !!busy}><Undo2 size={17}/></IconButton><IconButton label="Redo (Ctrl+Shift+Z)" onClick={() => e.redo()} disabled={e.historyIndex >= e.history.length - 1 || !!busy}><Redo2 size={17}/></IconButton><span className="context-divider"/><button className="workspace-preset" onClick={() => { setPanelTab('properties'); setDockOpen(true); fit(); }}><SlidersHorizontal size={15}/><span>Essentials</span><ChevronDown size={12}/></button></div>
  </section>
  <aside className="tool-palette" aria-label="Editing tools"><div className="tool-grid">{toolGroups.map((group, i) => <div key={i} className="tool-pair">{group.map(([t, name, key, Icon]) => { const isActive = tool === t || !!variants[t]?.some(v => v[0] === tool); return <Tooltip key={t}><TooltipTrigger asChild><button className={'tool-button ' + (isActive ? 'selected' : '')} onClick={() => { setTool(t); if (t === 'text')
        setPanelTab('properties'); }} aria-label={name + (key ? ' (' + key + ')' : '')} aria-pressed={isActive}><Icon size={19} strokeWidth={1.65}/>{variants[t] && <span className="tool-corner"/>}</button></TooltipTrigger><TooltipContent side="right" sideOffset={14}><span>{name}</span>{key && <kbd>{key}</kbd>}</TooltipContent></Tooltip>; })}</div>)}</div><div className="palette-divider"/><div className="swatches"><label className="secondary-swatch" title="Background color"><input type="color" aria-label="Background color" value={secondary} onChange={ev => setSecondary(ev.target.value)}/></label><label className="primary-swatch" title="Foreground color"><input type="color" aria-label="Primary color" value={primary} onChange={ev => setPrimary(ev.target.value)}/></label><button aria-label="Swap colors (X)" className="swap-colors" onClick={() => { setPrimary(secondary); setSecondary(primary); }}><ArrowLeftRight size={12}/></button><button aria-label="Reset colors (D)" className="reset-colors" onClick={() => { setPrimary('#000000'); setSecondary('#ffffff'); }}><span /><span /></button></div><div className="palette-bottom"><IconButton label="Import image" onClick={() => fileRef.current?.click()}><Upload size={19}/></IconButton><IconButton label="Keyboard shortcuts" onClick={() => setModal('help')}><Keyboard size={18}/></IconButton></div></aside>
  <div className="document-area"><div className="document-tabs"><div className="document-tab"><ImageIcon size={15}/><input aria-label="Document name" value={d.name} onChange={ev => { e.doc.name = ev.target.value; e.notify(); }} onBlur={() => { if (e.history[e.historyIndex]?.doc.name !== e.doc.name)
        e.commit('Rename document'); }}/>{e.dirty && <span className="unsaved-dot" title="Unsaved changes"/>}<span className="doc-extension">.pixelcraft</span></div><IconButton label="New document" onClick={() => setModal('new')}><Plus size={16}/></IconButton><div className="document-tab-actions"><span>{ready ? 'RGB / 8' : 'Opening…'}</span><IconButton label={dockOpen ? 'Hide panels' : 'Show panels'} onClick={() => setDockOpen(v => !v)}>{dockOpen ? <PanelRightClose size={17}/> : <PanelRightOpen size={17}/>}</IconButton></div></div>
   <Viewport engine={e} revision={revision} tool={tool} setTool={setTool} prefs={prefs} primary={primary} secondary={secondary} zoom={zoom} setZoom={setZoom} rotation={rotation} setRotation={setRotation} rulers={rulers} grid={grid} fitToken={fitToken} onImport={onImport} onText={openText} onColor={setPrimary} onMagic={openMagic} busy={!!busy}/>
   <div className="document-status"><span className="status-indicator"><span />{busy || (ready ? 'All editing stays on your device' : 'Preparing canvas…')}</span><div><span>{d.width} × {d.height} px</span><i /><span>{e.doc.layers.length} layers</span><i /><span>{Math.round(zoom * 100)}%</span></div></div>
  </div>
  {dockOpen && <Dock engine={e} revision={revision} tab={panelTab} setTab={setPanelTab} onText={() => openText()} onMagic={openMagic} primary={primary} setPrimary={setPrimary} onAction={action}/>}
  <Dialog open={modal !== null} onOpenChange={v => { if (!v && !busy)
        setModal(null); }}><DialogContent className={'studio-dialog ' + (modal === 'help' ? 'help-dialog' : '')}>
   <DialogHeader><div className="dialog-emblem">{modal === 'magic' ? <Sparkles size={23}/> : modal === 'export' ? <Download size={23}/> : modal === 'text' ? <Type size={23}/> : modal === 'help' ? <img src="/favicon.svg" alt="" width={32} height={32}/> : <FilePlus2 size={23}/>}</div><DialogTitle>{modal === 'new' ? 'A fresh canvas.' : modal === 'export' ? 'Ready for the world.' : modal === 'text' ? 'Say something great.' : modal === 'magic' ? 'A little creative magic.' : modal === 'resize' ? 'Image dimensions' : 'Make yourself at home.'}</DialogTitle><DialogDescription>{modal === 'new' ? 'Start with a size that fits your idea.' : modal === 'export' ? 'Export your composition. Your original layers stay editable.' : modal === 'text' ? 'Add your words. Fine-tune the details in the Character panel.' : modal === 'magic' ? 'Smart tools, with your images kept on your device.' : modal === 'resize' ? 'Rescale the document and all of its layers.' : 'Your quick guide to PixelCraft Studio.'}</DialogDescription></DialogHeader>
   {(modal === 'new' || modal === 'resize') && <div className="dialog-form">{modal === 'new' && <label className="field-label">Document name<input value={newName} onChange={ev => setNewName(ev.target.value)} placeholder="Untitled project"/></label>}<div className="dimension-fields"><label className="field-label">Width<input aria-label="Canvas width" type="number" min={1} max={8192} value={newWidth} onChange={ev => setNewWidth(Number(ev.target.value))}/></label><span>×</span><label className="field-label">Height<input aria-label="Canvas height" type="number" min={1} max={8192} value={newHeight} onChange={ev => setNewHeight(Number(ev.target.value))}/></label><span>px</span></div>{modal === 'new' && <><div className="preset-buttons">{[[1600, 1200, 'Landscape'], [1080, 1080, 'Square'], [1080, 1920, 'Story'], [1920, 1080, 'HD']].map(([w, h, name]) => <button key={name} className={newWidth === w && newHeight === h ? 'selected' : ''} onClick={() => { setNewWidth(Number(w)); setNewHeight(Number(h)); }}>{name}</button>)}</div><label className="field-label">Background<Choice value={newBg} onChange={setNewBg} label="Canvas background" options={[['transparent', 'Transparent'], ['#ffffff', 'White'], ['#121215', 'Obsidian']]}/></label></>}{e.dirty && <p className="form-note">Your current work remains in History. Save a .pixelcraft copy to keep it after closing this tab.</p>}<DialogFooter><button className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" onClick={() => { if (!Number.isInteger(newWidth) || !Number.isInteger(newHeight) || newWidth < 1 || newHeight < 1 || newWidth > 8192 || newHeight > 8192 || newWidth * newHeight > 24e6) {
        toast.error('Use dimensions from 1 to 8192 px, up to 24 megapixels.');
        return;
    } if (modal === 'new')
        e.newDocument(newName, newWidth, newHeight, newBg);
    else
        e.resize(newWidth, newHeight); setModal(null); fit(); }}>{modal === 'new' ? 'Create document' : 'Resize image'}<ChevronRight size={16}/></button></DialogFooter></div>}
   {modal === 'text' && <div className="dialog-form"><label className="field-label">Your text<textarea aria-label="Text content" rows={4} maxLength={2000} value={text} onChange={ev => setText(ev.target.value)} autoFocus/></label><DialogFooter><button className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" disabled={!text.trim()} onClick={() => { if (editingText) {
        const layer = e.doc.layers.find(l => l.id === editingText);
        if (layer?.text)
            e.update(layer.id, { name: text.split('\n')[0].slice(0, 32), text: { ...layer.text, content: text } }, 'Edit text');
    }
    else {
        const layer = e.textLayer(text, textPosition.x, textPosition.y, prefs.fontSize);
        layer.color = primary;
        layer.text!.font = prefs.font;
        layer.h = Math.max(layer.h, text.split('\n').length * prefs.fontSize * 1.2);
        action(() => e.add(layer, 'Add text'));
    } setModal(null); setTool('move'); setPanelTab('properties'); }}><Check size={16}/>{editingText ? 'Apply changes' : 'Add text layer'}</button></DialogFooter></div>}
   {modal === 'export' && <div className="dialog-form"><div className="export-preview"><img src={ready ? e.composite().toDataURL('image/webp', .5) : undefined} alt="Export preview"/><div><strong>{d.name}</strong><span>{Math.round(d.width * Number(exportScale))} × {Math.round(d.height * Number(exportScale))} pixels</span><small>{format === 'png' ? 'Transparency supported' : format === 'jpeg' ? 'White background for transparent areas' : 'Transparency supported'}</small></div></div><div className="property-grid"><label className="field-label">Format<Choice label="Export format" value={format} onChange={setFormat} options={[['png', 'PNG'], ['jpeg', 'JPEG'], ['webp', 'WebP']]}/></label><label className="field-label">Scale<Choice label="Export scale" value={exportScale} onChange={setExportScale} options={[['0.5', '0.5×'], ['1', '1× · Original'], ['2', '2×']]}/></label></div>{format !== 'png' && <Range label="Quality" value={quality} onChange={setQuality} min={10} max={100} suffix="%"/>}<DialogFooter><button className="secondary-button" onClick={() => void save()}><Layers size={15}/>Save project</button><button className="primary-button" disabled={!!busy} onClick={doExport}>{busy ? <LoaderCircle size={16} className="spin"/> : <Download size={16}/>}Export {format.toUpperCase()}</button></DialogFooter></div>}
   {modal === 'magic' && <div className="dialog-form"><div className="magic-choices"><button className={magicMode === 'background' ? 'selected' : ''} disabled={!!busy} onClick={() => setMagicMode('background')}><Scissors size={23}/><strong>Remove background</strong><span>On-device AI</span></button><button className={magicMode === 'fill' ? 'selected' : ''} disabled={!!busy} onClick={() => setMagicMode('fill')}><Sparkles size={23}/><strong>Content-aware fill</strong><span>Local pixel reconstruction</span></button></div><div className="magic-description">{magicMode === 'background' ? <><strong>Keep the subject. Lose the background.</strong><p>Select a photo layer. The AI model runs in your browser and creates a cutout on a new layer. Its first use downloads a model of about 40 MB; your image is never uploaded.</p><div className="selected-layer-tag"><ImageIcon size={15}/>{l?.name ?? 'No layer selected'}</div></> : <><strong>Let the surroundings fill in the gap.</strong><p>Select an area with the marquee or lasso. PixelCraft reconstructs it from nearby pixels. Best for small distractions and simple backgrounds; this is not prompt-based generation.</p>{e.selection ? <div className="selected-layer-tag"><SquareDashed size={15}/>{Math.round(e.selection.w)} × {Math.round(e.selection.h)} px selected</div> : <button className="secondary-button" onClick={() => { setTool('lasso'); setModal(null); }}><SquareDashed size={15}/>Make a selection</button>}</>}</div>{busy && <div className="processing-state" role="status"><LoaderCircle className="spin" size={17}/><span>{busy}</span></div>}<DialogFooter><button className="secondary-button" disabled={!!busy} onClick={() => setModal(null)}>Cancel</button><button className="primary-button" onClick={runMagic} disabled={!!busy || !l || l.locked || (magicMode === 'fill' && !e.selection) || (magicMode === 'background' && l.kind !== 'raster')}>{busy ? <LoaderCircle size={16} className="spin"/> : <Sparkles size={16}/>} {magicMode === 'background' ? 'Remove background' : 'Fill selection'}</button></DialogFooter></div>}
   {modal === 'help' && <div className="help-content"><div className="help-shortcuts">{[['V', 'Move'], ['M', 'Marquee'], ['L', 'Lasso'], ['B', 'Brush'], ['E', 'Eraser'], ['T', 'Text'], ['P', 'Pen'], ['U', 'Shape'], ['Space', 'Pan'], ['Ctrl Z', 'Undo'], ['Ctrl S', 'Save project'], ['Ctrl 0', 'Fit canvas']].map(([key, name]) => <div key={key}><span>{name}</span><kbd>{key}</kbd></div>)}</div><div className="help-notes"><p><strong>Start creating.</strong> Drag in an image, add a layer, or choose File → New. Shift + a tool shortcut cycles its variants.</p><p><strong>Keep your layers.</strong> Save a .pixelcraft project to your device. Export produces a flattened PNG, JPEG, or WebP. Sessions are not automatically saved.</p><p><strong>Retouch.</strong> Alt-click to sample before using Clone or Healing. The bottom-right transform handle resizes a layer; Shift keeps its proportions.</p><p><strong>PSD support.</strong> Imports 8-bit RGB raster layers and groups. Photoshop text, smart objects, effects, and advanced masks may be flattened or differ. Maximum: 60 layers, 24 megapixels.</p><p><strong>Open source.</strong> PixelCraft Studio is AGPL-3.0 licensed. Background removal uses IMG.LY’s on-device model. Prompt-based generative fill is not connected.</p></div><a className="secondary-button full-width" href="/pixelcraft-studio-source.zip" download><Code2 size={16}/>Download source code</a></div>}
  </DialogContent></Dialog>
  {busy && modal !== 'magic' && modal !== 'export' && <div className="busy-overlay" role="status"><LoaderCircle className="spin"/><span>{busy}</span></div>}
 </main><Toaster theme="dark" position="bottom-center" richColors closeButton/></TooltipProvider>;
}
