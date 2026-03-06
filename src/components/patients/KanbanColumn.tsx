import { Droppable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import KanbanCard, { KanbanLead } from './KanbanCard';

export interface ColumnConfig {
    id: string;
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
    headerBg: string;
}

interface KanbanColumnProps {
    column: ColumnConfig;
    patients: KanbanLead[];
    updatingId: string | null;
}

const KanbanColumn = ({ column, patients, updatingId }: KanbanColumnProps) => {
    return (
        <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-border/50 bg-muted/30 overflow-hidden">
            {/* Column Header */}
            <div className={cn('flex items-center gap-2.5 px-4 py-3.5', column.headerBg)}>
                <span className="text-lg leading-none">{column.icon}</span>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate">{column.label}</h3>
                </div>
                <span
                    className={cn(
                        'flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold',
                        column.bgColor,
                        column.color
                    )}
                >
                    {patients.length}
                </span>
            </div>

            {/* Droppable Zone */}
            <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                            'flex flex-1 flex-col gap-2.5 p-3 min-h-[200px] transition-colors duration-200',
                            snapshot.isDraggingOver && 'bg-primary/5'
                        )}
                    >
                        {patients.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                                <div className="text-3xl mb-2 opacity-30">{column.icon}</div>
                                <p className="text-xs text-muted-foreground/60">Sin leads</p>
                            </div>
                        )}

                        {patients.map((lead, index) => (
                            <KanbanCard
                                key={lead.id}
                                lead={lead}
                                index={index}
                                isUpdating={updatingId === lead.id}
                            />
                        ))}

                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

export default KanbanColumn;
