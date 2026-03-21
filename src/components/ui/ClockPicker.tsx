import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

type Period = 'AM' | 'PM';
type Mode = 'hours' | 'minutes';

function to12h(h24: number): { hour12: number; period: Period } {
    if (h24 === 0) return { hour12: 12, period: 'AM' };
    if (h24 < 12) return { hour12: h24, period: 'AM' };
    if (h24 === 12) return { hour12: 12, period: 'PM' };
    return { hour12: h24 - 12, period: 'PM' };
}
function to24h(h12: number, period: Period): number {
    if (period === 'AM') return h12 === 12 ? 0 : h12;
    return h12 === 12 ? 12 : h12 + 12;
}

const SIZE = 240;
const RADIUS = 88;
const CENTER = SIZE / 2;

function clockPos(index: number, total: number) {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
        x: CENTER + RADIUS * Math.cos(angle),
        y: CENTER + RADIUS * Math.sin(angle),
    };
}

// Hours in clock order (12, 1, 2, ... 11)
const HOUR_ITEMS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
// Minutes 5-by-5
const MINUTE_ITEMS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// ── Component ─────────────────────────────────────────────────────────────────

interface ClockPickerProps {
    value: string;           // "HH:MM" in 24h
    onChange: (val: string) => void;
    disabled?: boolean;
    minTime?: string;        // "HH:MM" 24h, e.g. "08:00"
    maxTime?: string;        // "HH:MM" 24h, e.g. "17:00"
}

const ClockPicker = ({ value, onChange, disabled, minTime, maxTime }: ClockPickerProps) => {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<Mode>('hours');

    const [hStr, mStr] = (value || '09:00').split(':');
    const hour24 = parseInt(hStr) || 9;
    const minute = parseInt(mStr) || 0;
    const { hour12, period } = to12h(hour24);

    // Compute allowed hour range in 24h for disabling numbers
    const minH24 = minTime ? parseInt(minTime.split(':')[0]) : 0;
    const maxH24 = maxTime ? parseInt(maxTime.split(':')[0]) : 23;
    const isHourDisabled = (h12: number) => {
        const h24 = to24h(h12, period);
        return h24 < minH24 || h24 > maxH24;
    };

    const isMinuteDisabled = (m: number) => {
        const h24 = to24h(hour12, period);
        if (h24 < minH24 || h24 > maxH24) return true;
        if (h24 === minH24) {
            const minM = minTime ? parseInt(minTime.split(':')[1]) : 0;
            if (m < minM) return true;
        }
        if (h24 === maxH24) {
            const maxM = maxTime ? parseInt(maxTime.split(':')[1]) : 59;
            if (m > maxM) return true;
        }
        return false;
    };

    const snappedMinute = Math.round(minute / 5) * 5 % 60;

    const setHour = (h12: number) => {
        const hh = String(to24h(h12, period)).padStart(2, '0');
        const mm = String(snappedMinute).padStart(2, '0');
        onChange(`${hh}:${mm}`);
        setMode('minutes');
    };

    const setMinute = (m: number) => {
        const hh = String(hour24).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        onChange(`${hh}:${mm}`);
        setOpen(false);
        setMode('hours');
    };

    const setPeriod = (p: Period) => {
        const hh = String(to24h(hour12, p)).padStart(2, '0');
        const mm = String(snappedMinute).padStart(2, '0');
        onChange(`${hh}:${mm}`);
    };

    // Hand angle
    const handAngle = mode === 'hours'
        ? ((hour12 % 12) / 12) * 2 * Math.PI - Math.PI / 2
        : (snappedMinute / 60) * 2 * Math.PI - Math.PI / 2;
    const handX = CENTER + RADIUS * Math.cos(handAngle);
    const handY = CENTER + RADIUS * Math.sin(handAngle);

    const displayH = String(hour12).padStart(2, '0');
    const displayM = String(snappedMinute).padStart(2, '0');

    return (
        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setMode('hours'); }}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className="w-[145px] justify-start gap-2 font-mono text-sm"
                >
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    {displayH}:{displayM} {period}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-5" align="start">
                {/* ── Digital display ─── */}
                <div className="flex items-center justify-center gap-1 mb-5">
                    <button
                        type="button"
                        onClick={() => setMode('hours')}
                        className={cn(
                            'text-4xl font-bold tabular-nums w-16 text-center py-1 rounded-xl transition-colors',
                            mode === 'hours'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                    >{displayH}</button>
                    <span className="text-4xl font-bold pb-0.5">:</span>
                    <button
                        type="button"
                        onClick={() => setMode('minutes')}
                        className={cn(
                            'text-4xl font-bold tabular-nums w-16 text-center py-1 rounded-xl transition-colors',
                            mode === 'minutes'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                    >{displayM}</button>

                    {/* AM / PM */}
                    <div className="flex flex-col gap-1 ml-2">
                        {(['AM', 'PM'] as Period[]).map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPeriod(p)}
                                className={cn(
                                    'text-sm font-bold px-2.5 py-1 rounded-lg border transition-colors',
                                    period === p
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                                )}
                            >{p}</button>
                        ))}
                    </div>
                </div>

                {/* ── Clock face ─── */}
                <div
                    className="relative mx-auto rounded-full bg-muted/40 select-none"
                    style={{ width: SIZE, height: SIZE }}
                >
                    {/* SVG hand */}
                    <svg className="absolute inset-0 pointer-events-none" width={SIZE} height={SIZE}>
                        {/* Hand */}
                        <line
                            x1={CENTER} y1={CENTER}
                            x2={handX} y2={handY}
                            strokeWidth={2}
                            strokeLinecap="round"
                            className="stroke-primary"
                        />
                        {/* Center dot */}
                        <circle cx={CENTER} cy={CENTER} r={4} className="fill-primary" />
                        {/* Tip highlight */}
                        <circle cx={handX} cy={handY} r={20} className="fill-primary opacity-15" />
                    </svg>

                    {/* Numbers */}
                    {(mode === 'hours' ? HOUR_ITEMS : MINUTE_ITEMS).map((val, i) => {
                        const pos = clockPos(i, 12);
                        const isSelected = mode === 'hours' ? val === hour12 : val === snappedMinute;
                        const isDisabled = mode === 'hours' ? isHourDisabled(val as number) : isMinuteDisabled(val as number);
                        return (
                            <button
                                key={val}
                                type="button"
                                onClick={() => {
                                    if (isDisabled) return;
                                    mode === 'hours' ? setHour(val as number) : setMinute(val as number);
                                }}
                                className={cn(
                                    'absolute flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-all -translate-x-1/2 -translate-y-1/2',
                                    isDisabled
                                        ? 'text-muted-foreground/30 cursor-not-allowed'
                                        : isSelected
                                            ? 'bg-primary text-primary-foreground shadow-md scale-110'
                                            : 'hover:bg-muted text-foreground'
                                )}
                                style={{ left: pos.x, top: pos.y }}
                            >
                                {mode === 'hours' ? val : String(val).padStart(2, '0')}
                            </button>
                        );
                    })}
                </div>

                <p className="text-xs text-center text-muted-foreground mt-4">
                    {mode === 'hours' ? 'Toca la hora →' : 'Toca los minutos ✓'}
                </p>
                {minTime && maxTime && (
                    <p className="text-xs text-center text-muted-foreground/60 mt-1">
                        Horario: {minTime} – {maxTime}
                    </p>
                )}
            </PopoverContent>
        </Popover>
    );
};

export default ClockPicker;
