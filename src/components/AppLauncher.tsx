import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, DollarSign, Megaphone, X, Check, Pencil, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// dnd-kit
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    arrayMove,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── App catalog ───────────────────────────────────────────────────────────────
const APP_CATALOG = [
    { id: 'patients', label: 'Expedientes', href: '/patients', icon: Users, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/30' },
    { id: 'agenda', label: 'Agenda', href: '/agenda', icon: Calendar, gradient: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-500/30' },
    { id: 'finance', label: 'Finanzas', href: '/finance', icon: DollarSign, gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/30' },
    { id: 'marketing', label: 'Marketing', href: '/pipeline', icon: Megaphone, gradient: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-500/30' },
    { id: 'tests', label: 'Pruebas', href: '/tests', icon: BrainCircuit, gradient: 'from-pink-500 to-rose-600', shadow: 'shadow-pink-500/30' },
];
type AppItem = typeof APP_CATALOG[number];
const DEFAULT_ORDER = APP_CATALOG.map(a => a.id);
const PREF_KEY = 'app_launcher_order';

// ── Dot grid with stagger animation ──────────────────────────────────────────
const DOT_DELAYS = [0, 50, 100, 50, 100, 150, 100, 150, 200];
const DotGrid = ({ hovered }: { hovered: boolean }) => (
    <div className="grid grid-cols-3 gap-[3px]">
        {DOT_DELAYS.map((delay, i) => (
            <span
                key={i}
                className={cn('h-[4px] w-[4px] rounded-full transition-all', hovered ? 'bg-primary scale-125' : 'bg-muted-foreground scale-100')}
                style={{ transitionDuration: '200ms', transitionDelay: `${delay}ms` }}
            />
        ))}
    </div>
);

// ── SortableAppTile ───────────────────────────────────────────────────────────
interface TileProps {
    app: AppItem;
    editMode: boolean;
    badge?: number;
    index?: number;
    onNavigate: (href: string) => void;
}

const SortableAppTile = ({ app, editMode, badge = 0, index = 0, onNavigate }: TileProps) => {
    const Icon = app.icon;
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: app.id, disabled: !editMode });

    const tileStyle: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1)',
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.35 : 1,
        animationDelay: !editMode ? `${index * 60}ms` : '0ms',
    };

    return (
        <div
            ref={setNodeRef}
            style={tileStyle}
            {...attributes}
            {...(editMode ? listeners : {})}
            onClick={() => { if (!editMode) onNavigate(app.href); }}
            className={cn(
                'group relative flex flex-col items-center gap-2.5 rounded-xl p-4 select-none',
                'transition-colors duration-150',
                !editMode && 'animate-tile-drop-in',
                editMode
                    ? 'cursor-grab active:cursor-grabbing hover:bg-muted/60'
                    : 'cursor-pointer hover:bg-muted active:scale-95',
                isDragging && 'pointer-events-none'
            )}
        >
            {/* Drag wobble indicator dots in edit mode */}
            {editMode && (
                <div className="absolute right-2 top-2 flex flex-col gap-[2px]">
                    {[0, 1].map(r => (
                        <div key={r} className="flex gap-[2px]">
                            {[0, 1].map(c => (
                                <span key={c} className="h-[3px] w-[3px] rounded-full bg-muted-foreground/50" />
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Badge */}
            {badge > 0 && !editMode && (
                <span className="absolute right-2 top-2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                </span>
            )}

            {/* Icon */}
            <div className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg',
                app.gradient, app.shadow,
                'transition-all duration-200',
                editMode ? 'group-hover:scale-105 group-hover:rotate-3' : 'group-hover:scale-110 group-hover:shadow-xl'
            )}>
                <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
            </div>
            <span className="text-xs font-medium text-foreground/70 group-hover:text-foreground transition-colors">
                {app.label}
            </span>
        </div>
    );
};

// ── DragOverlay tile (the 'floating' one being dragged) ───────────────────────
const OverlayTile = ({ app }: { app: AppItem }) => {
    const Icon = app.icon;
    return (
        <div className="flex flex-col items-center gap-2.5 rounded-xl p-4 bg-muted/80 shadow-2xl scale-110 rotate-2 cursor-grabbing">
            <div className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-xl scale-110',
                app.gradient, app.shadow
            )}>
                <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
            </div>
            <span className="text-xs font-medium text-foreground">{app.label}</span>
        </div>
    );
};

// ── AppLauncher ───────────────────────────────────────────────────────────────
const AppLauncher = () => {
    const [open, setOpen] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
    const [saving, setSaving] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [newLeadCount, setNewLeadCount] = useState(0);
    const navigate = useNavigate();
    const ref = useRef<HTMLDivElement>(null);

    // Sensors: pointer (mouse + touch with 8px activation distance to avoid accidental drags)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
    );

    // ── Fetch new leads (realtime) ────────────────────────────────────────────
    useEffect(() => {
        const fetchLeads = async () => {
            const { count } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'nuevo_lead');
            setNewLeadCount(count ?? 0);
        };
        fetchLeads();
        const channel = supabase
            .channel('launcher-leads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // ── Load saved order ─────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
                .from('user_preferences')
                .select('value')
                .eq('user_id', user.id)
                .eq('key', PREF_KEY)
                .single();
            if (data?.value?.order && Array.isArray(data.value.order)) {
                const saved: string[] = data.value.order;
                const merged = [
                    ...saved.filter(id => APP_CATALOG.find(a => a.id === id)),
                    ...DEFAULT_ORDER.filter(id => !saved.includes(id)),
                ];
                setOrder(merged);
            }
        })();
    }, []);

    // ── Close on outside click / Escape ─────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setEditMode(false); } };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setEditMode(false); } };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, []);

    // ── Save to Supabase ─────────────────────────────────────────────────────
    const saveOrder = async (newOrder: string[]) => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            await supabase.from('user_preferences').upsert(
                { user_id: user.id, key: PREF_KEY, value: { order: newOrder }, updated_at: new Date().toISOString() },
                { onConflict: 'user_id,key' }
            );
        } finally { setSaving(false); }
    };

    const handleSave = async () => { await saveOrder(order); setEditMode(false); };

    // ── DnD handlers ─────────────────────────────────────────────────────────
    const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
    const handleDragEnd = (e: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = e;
        if (over && active.id !== over.id) {
            setOrder(prev => {
                const from = prev.indexOf(active.id as string);
                const to = prev.indexOf(over.id as string);
                return arrayMove(prev, from, to);
            });
        }
    };

    const orderedApps = order.map(id => APP_CATALOG.find(a => a.id === id)!).filter(Boolean);
    const activeApp = activeId ? APP_CATALOG.find(a => a.id === activeId) : null;

    return (
        <div className="relative" ref={ref}>
            {/* Trigger button */}
            <button
                onClick={() => setOpen(v => !v)}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                aria-label="App launcher"
                aria-expanded={open}
                className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300',
                    'hover:bg-primary/10',
                    open && 'bg-primary/10'
                )}
            >
                {open ? <X className="h-4 w-4 text-primary" /> : <DotGrid hovered={hovered || open} />}
            </button>

            {/* Dropdown */}
            <div
                className={cn(
                    'absolute left-0 top-[calc(100%+10px)] z-50 w-[268px] origin-top-left rounded-2xl border border-border/60 p-4 bg-background shadow-2xl',
                    'transition-all duration-300',
                    open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
                )}
            >
                {/* Header */}
                <div className="mb-3 flex items-center justify-between px-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Módulos</p>
                    <button
                        onClick={() => editMode ? handleSave() : setEditMode(true)}
                        className={cn(
                            'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all duration-150',
                            editMode
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                        )}
                    >
                        {saving ? (
                            <span className="animate-pulse">Guardando…</span>
                        ) : editMode ? (
                            <><Check className="h-3 w-3" /> Guardar</>
                        ) : (
                            <><Pencil className="h-3 w-3" /> Editar orden</>
                        )}
                    </button>
                </div>

                {editMode && (
                    <p className="mb-3 px-1 text-[11px] text-muted-foreground animate-fade-in">
                        Arrastra para reordenar
                    </p>
                )}

                {/* Sortable grid */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={order} strategy={rectSortingStrategy}>
                        <div key={open ? 'open' : 'closed'} className="grid grid-cols-2 gap-2">
                            {orderedApps.map((app, i) => (
                                <SortableAppTile
                                    key={app.id}
                                    app={app}
                                    editMode={editMode}
                                    index={i}
                                    badge={app.id === 'marketing' ? newLeadCount : 0}
                                    onNavigate={(href) => { setOpen(false); navigate(href); }}
                                />
                            ))}
                        </div>
                    </SortableContext>

                    {/* Floating drag ghost */}
                    <DragOverlay adjustScale dropAnimation={{
                        duration: 220,
                        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)', // slight elastic overshoot
                    }}>
                        {activeApp ? <OverlayTile app={activeApp} /> : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
};

export default AppLauncher;
