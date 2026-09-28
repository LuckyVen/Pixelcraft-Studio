'use client';
import { type ReactNode } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
export function IconButton({ label, children, onClick, active = false, disabled = false, className = '' }: {
    label: string;
    children: ReactNode;
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
    className?: string;
}) { return <Tooltip><TooltipTrigger asChild><button type="button" aria-label={label} className={'icon-button ' + (active ? 'is-active ' : '') + className} onClick={onClick} disabled={disabled}>{children}</button></TooltipTrigger><TooltipContent side="bottom" sideOffset={8}>{label}</TooltipContent></Tooltip>; }
export function Choice({ value, onChange, options, label, className = '' }: {
    value: string;
    onChange: (v: string) => void;
    options: ([
        string,
        string
    ] | string)[];
    label: string;
    className?: string;
}) { return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} size="sm" className={'studio-select ' + className}><SelectValue /></SelectTrigger><SelectContent>{options.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return <SelectItem key={v} value={v}>{t}</SelectItem>; })}</SelectContent></Select>; }
export function Range({ label, value, onChange, onCommit, min = 0, max = 100, step = 1, suffix = '', className = '' }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    onCommit?: () => void;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
    className?: string;
}) { return <div className={'range-control ' + className}><div className="range-label"><label>{label}</label><span>{Number(value.toFixed(1))}{suffix}</span></div><Slider aria-label={label} min={min} max={max} step={step} value={[value]} onValueChange={v => onChange(v[0])} onValueCommit={onCommit}/></div>; }
export function NumberBox({ label, value, onChange, min = -99999, max = 99999, suffix = '' }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    suffix?: string;
}) { return <label className="number-box"><span>{label}</span><input aria-label={label} type="number" value={Number(value.toFixed(1))} min={min} max={max} onChange={e => { const v = Number(e.target.value); if (Number.isFinite(v))
    onChange(Math.max(min, Math.min(max, v))); }}/><small>{suffix}</small></label>; }
