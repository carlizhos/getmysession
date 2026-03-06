import { Draggable } from '@hello-pangea/dnd';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Phone, Mail, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LeadSourceBadge, { LeadSource } from './LeadSourceBadge';

export interface KanbanLead {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    source: LeadSource;
    status: 'nuevo_lead' | 'contactado' | 'cita_agendada' | 'primera_sesion' | 'paciente_activo' | 'descartado';
    position: number;
    notes?: string | null;
    created_at: string;
    patient_id?: string | null;
}

interface KanbanCardProps {
    lead: KanbanLead;
    index: number;
    isUpdating: boolean;
}

const KanbanCard = ({ lead, index, isUpdating }: KanbanCardProps) => {
    const initials = lead.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const createdAt = lead.created_at
        ? format(parseISO(lead.created_at), "d MMM", { locale: es })
        : null;

    return (
        <Draggable draggableId={lead.id} index={index} isDragDisabled={isUpdating}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn(
                        'relative rounded-xl border bg-card p-3.5 shadow-sm transition-all duration-200 select-none',
                        'hover:shadow-md hover:-translate-y-0.5',
                        snapshot.isDragging
                            ? 'shadow-xl rotate-1 scale-105 border-primary/40 bg-card/95 backdrop-blur-sm'
                            : 'border-border/60',
                        isUpdating && 'opacity-60 pointer-events-none'
                    )}
                >
                    {/* Loading overlay */}
                    {isUpdating && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-sm z-10">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                    )}

                    {/* Header: Avatar + Nombre */}
                    <div className="flex items-start gap-3 mb-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold leading-tight">{lead.name}</p>
                            {createdAt && (
                                <p className="text-xs text-muted-foreground mt-0.5">Desde {createdAt}</p>
                            )}
                        </div>
                    </div>

                    {/* Fuente de origen */}
                    <div className="mb-3">
                        <LeadSourceBadge source={lead.source} />
                    </div>

                    {/* Contacto */}
                    <div className="space-y-1 mb-3">
                        {lead.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3 shrink-0" />
                                <span className="truncate">{lead.phone}</span>
                            </div>
                        )}
                        {lead.email && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{lead.email}</span>
                            </div>
                        )}
                    </div>

                    {/* Botón especial en Paciente Activo */}
                    {lead.status === 'paciente_activo' && !lead.patient_id && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-1.5 h-7 text-xs font-medium hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 dark:hover:bg-emerald-950/30 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <UserPlus className="h-3 w-3" />
                            Crear Expediente
                        </Button>
                    )}
                </div>
            )}
        </Draggable>
    );
};

export default KanbanCard;
