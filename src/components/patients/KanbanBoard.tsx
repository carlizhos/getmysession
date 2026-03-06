import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KanbanColumn, { ColumnConfig } from './KanbanColumn';
import DischargeModal from './DischargeModal';
import NewLeadDialog from './NewLeadDialog';
import KanbanCard, { KanbanLead } from './KanbanCard';

type LeadStatus = 'nuevo_lead' | 'contactado' | 'cita_agendada' | 'primera_sesion' | 'paciente_activo' | 'descartado';

const COLUMNS: ColumnConfig[] = [
    {
        id: 'nuevo_lead',
        label: 'Nuevo Lead',
        icon: '🌱',
        color: 'text-sky-700 dark:text-sky-300',
        bgColor: 'bg-sky-100 dark:bg-sky-900/40',
        borderColor: 'border-sky-200',
        headerBg: 'bg-sky-50 dark:bg-sky-950/30 border-b border-sky-100 dark:border-sky-900',
    },
    {
        id: 'contactado',
        label: 'Contactado',
        icon: '📞',
        color: 'text-amber-700 dark:text-amber-300',
        bgColor: 'bg-amber-100 dark:bg-amber-900/40',
        borderColor: 'border-amber-200',
        headerBg: 'bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900',
    },
    {
        id: 'cita_agendada',
        label: 'Cita Agendada',
        icon: '📅',
        color: 'text-orange-700 dark:text-orange-300',
        bgColor: 'bg-orange-100 dark:bg-orange-900/40',
        borderColor: 'border-orange-200',
        headerBg: 'bg-orange-50 dark:bg-orange-950/30 border-b border-orange-100 dark:border-orange-900',
    },
    {
        id: 'primera_sesion',
        label: 'Primera Sesión',
        icon: '✨',
        color: 'text-violet-700 dark:text-violet-300',
        bgColor: 'bg-violet-100 dark:bg-violet-900/40',
        borderColor: 'border-violet-200',
        headerBg: 'bg-violet-50 dark:bg-violet-950/30 border-b border-violet-100 dark:border-violet-900',
    },
    {
        id: 'paciente_activo',
        label: 'Paciente Activo',
        icon: '💚',
        color: 'text-emerald-700 dark:text-emerald-300',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
        borderColor: 'border-emerald-200',
        headerBg: 'bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900',
    },
    {
        id: 'descartado',
        label: 'Descartado',
        icon: '❌',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-800/40',
        borderColor: 'border-gray-200',
        headerBg: 'bg-gray-50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800',
    },
];

type ColumnsState = Record<LeadStatus, KanbanLead[]>;

const KanbanBoard = () => {
    const [columns, setColumns] = useState<ColumnsState>({
        nuevo_lead: [], contactado: [], cita_agendada: [],
        primera_sesion: [], paciente_activo: [], descartado: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [celebrationModal, setCelebrationModal] = useState<{ open: boolean; name: string }>({ open: false, name: '' });
    const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

    const fetchLeads = useCallback(async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('position', { ascending: true });
            if (error) throw error;

            const grouped: ColumnsState = {
                nuevo_lead: [], contactado: [], cita_agendada: [],
                primera_sesion: [], paciente_activo: [], descartado: [],
            };
            (data || []).forEach((lead: KanbanLead) => {
                const status = lead.status as LeadStatus;
                if (grouped[status]) grouped[status].push(lead);
                else grouped.nuevo_lead.push({ ...lead, status: 'nuevo_lead' });
            });
            setColumns(grouped);
        } catch (err: any) {
            console.error('Error al cargar leads:', err);
            toast.error('Error al cargar el pipeline');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const srcStatus = source.droppableId as LeadStatus;
        const dstStatus = destination.droppableId as LeadStatus;

        // Actualización optimista
        const newColumns = { ...columns };
        const srcList = [...newColumns[srcStatus]];
        const dstList = srcStatus === dstStatus ? srcList : [...newColumns[dstStatus]];
        const [moved] = srcList.splice(source.index, 1);
        const updatedLead = { ...moved, status: dstStatus };
        dstList.splice(destination.index, 0, updatedLead);
        newColumns[srcStatus] = srcStatus === dstStatus ? dstList : srcList;
        if (srcStatus !== dstStatus) newColumns[dstStatus] = dstList;
        setColumns(newColumns);

        // Modal de celebración al convertirse en paciente activo
        if (dstStatus === 'paciente_activo' && srcStatus !== 'paciente_activo') {
            setCelebrationModal({ open: true, name: moved.name });
        }

        // Sincronizar con Supabase
        setUpdatingId(draggableId);
        try {
            const { error } = await supabase
                .from('leads')
                .update({ status: dstStatus, position: destination.index })
                .eq('id', draggableId);
            if (error) throw error;
            toast.success(`"${moved.name}" movido a ${COLUMNS.find(c => c.id === dstStatus)?.label}`, { duration: 2000 });
        } catch (err: any) {
            toast.error('Error al sincronizar. Recargando...');
            fetchLeads();
        } finally {
            setUpdatingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                    <p className="text-sm text-muted-foreground">Cargando pipeline...</p>
                </div>
            </div>
        );
    }

    const totalLeads = Object.values(columns).reduce((s, c) => s + c.length, 0);
    const activeLeads = columns.nuevo_lead.length + columns.contactado.length +
        columns.cita_agendada.length + columns.primera_sesion.length;

    return (
        <>
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                            <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Pipeline de Captación</h1>
                            <p className="text-sm text-muted-foreground">
                                {totalLeads} leads · {activeLeads} en proceso · {columns.paciente_activo.length} convertidos
                            </p>
                        </div>
                    </div>
                </div>
                <Button variant="zen" className="gap-2" onClick={() => setIsNewLeadOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Nuevo Lead
                </Button>
            </div>

            {/* Kanban Board */}
            <div className="overflow-x-auto pb-4">
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                        {COLUMNS.map((column) => (
                            <KanbanColumn
                                key={column.id}
                                column={column}
                                patients={columns[column.id as LeadStatus] as any}
                                updatingId={updatingId}
                            />
                        ))}
                    </div>
                </DragDropContext>
            </div>

            {/* Modals */}
            <DischargeModal
                open={celebrationModal.open}
                onOpenChange={(open) => setCelebrationModal(prev => ({ ...prev, open }))}
                patientName={celebrationModal.name}
            />
            <NewLeadDialog
                open={isNewLeadOpen}
                onOpenChange={setIsNewLeadOpen}
                onLeadAdded={fetchLeads}
            />
        </>
    );
};

export default KanbanBoard;
