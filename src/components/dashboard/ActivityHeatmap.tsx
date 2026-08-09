import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { format, subMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Appointment } from '@/types';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';

interface ActivityHeatmapProps {
  appointments: Appointment[];
  loading?: boolean;
}

const ActivityHeatmap = ({ appointments, loading }: ActivityHeatmapProps) => {
  const now = new Date();

  // 1. Calcular los últimos 12 meses
  const months = useMemo(() => {
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      
      // Días en este mes
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      // Día de la semana del 1er día (convertido a: 0 = Lun, ..., 6 = Dom)
      const jsDay = start.getDay();
      const startDayOfWeek = jsDay === 0 ? 6 : jsDay - 1;
      
      // Celdas del mes
      const cells: (Date | null)[] = [];
      
      // Padding inicial
      for (let p = 0; p < startDayOfWeek; p++) {
        cells.push(null);
      }
      
      // Días del mes
      for (let d = 1; d <= daysInMonth; d++) {
        cells.push(new Date(year, month, d));
      }
      
      // Padding final para completar semanas completas (múltiplo de 7)
      while (cells.length % 7 !== 0) {
        cells.push(null);
      }
      
      // Agrupar en columnas de semanas (de 7 días cada una)
      const weeks: (Date | null)[][] = [];
      for (let w = 0; w < cells.length; w += 7) {
        weeks.push(cells.slice(w, w + 7));
      }
      
      // Nombre de mes formateado
      const rawMonthName = format(monthDate, 'MMM', { locale: es });
      const monthName = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1).replace('.', '');
      
      result.push({
        key: `${year}-${month}`,
        name: monthName,
        weeks,
        year,
        month
      });
    }
    return result;
  }, []);

  // 2. Mapear citas completadas/confirmadas/atendidas por fecha (yyyy-MM-dd)
  const sessionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!appointments) return counts;
    
    appointments.forEach((appt) => {
      // Excluir canceladas y requerir start_time válido
      if (!appt.start_time || appt.status === 'cancelled') return;
      
      try {
        const date = new Date(appt.start_time);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;
        counts[dateKey] = (counts[dateKey] || 0) + 1;
      } catch (e) {
        console.error('Error parsing date in heatmap:', e);
      }
    });
    
    return counts;
  }, [appointments]);

  // 3. Determinar el color de intensidad (tonos ámbar/oro de GetMySession)
  const getCellColorClass = (count: number) => {
    if (count === 0) {
      return 'bg-slate-100 dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-700/50';
    }
    if (count === 1) {
      return 'bg-amber-500/25 border border-amber-500/10 hover:bg-amber-500/40';
    }
    if (count === 2) {
      return 'bg-amber-500/50 border border-amber-500/20 hover:bg-amber-500/65';
    }
    if (count === 3) {
      return 'bg-amber-500/80 border border-amber-400/30 hover:bg-amber-500';
    }
    // 4 o más
    return 'bg-yellow-400 hover:bg-yellow-300 shadow-sm';
  };

  return (
    <Card variant="glass" className="animate-fade-in border-white/20 dark:border-white/5">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4.5 w-4.5 text-amber-500" />
            Frecuencia de Sesiones
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground font-medium">
            Historial diario de citas y sesiones activas en los últimos 12 meses
          </CardDescription>
        </div>
        
        {/* Leyenda */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground select-none font-medium">
          <span>Menos</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-slate-100 dark:bg-slate-800/40" />
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/25" />
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/50" />
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/80" />
          <div className="w-2.5 h-2.5 rounded-sm bg-yellow-400" />
          <span>Más</span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[150px] flex items-center justify-center">
            <p className="text-sm text-slate-500">Cargando mapa de actividad...</p>
          </div>
        ) : (
          <TooltipProvider delayDuration={100}>
            <div className="w-full overflow-x-auto scrollbar-zen pb-1 select-none">
              <div className="flex min-w-[730px] justify-between py-1">
                {/* Etiquetas de días de la semana a la izquierda */}
                <div className="flex flex-col gap-[2px] text-[10px] text-muted-foreground/80 pr-3 pt-[18px] select-none font-semibold">
                  <div className="h-2.5 flex items-center">Lun</div>
                  <div className="h-2.5" />
                  <div className="h-2.5 flex items-center">Mié</div>
                  <div className="h-2.5" />
                  <div className="h-2.5 flex items-center">Vie</div>
                  <div className="h-2.5" />
                  <div className="h-2.5" />
                </div>

                {/* Meses en cuadrícula */}
                <div className="flex flex-1 justify-between gap-4">
                  {months.map((month) => (
                    <div key={month.key} className="flex flex-col gap-1.5 flex-1">
                      <span className="text-[10px] font-semibold text-muted-foreground/90 text-center h-4">
                        {month.name}
                      </span>
                      <div className="flex gap-[2px] justify-center">
                        {month.weeks.map((week, wIdx) => (
                          <div key={wIdx} className="flex flex-col gap-[2px]">
                            {week.map((day, dIdx) => {
                              if (!day) {
                                  return (
                                    <div
                                      key={dIdx}
                                      className="w-2.5 h-2.5 bg-transparent"
                                    />
                                  );
                                }
  
                                const y = day.getFullYear();
                                const m = String(day.getMonth() + 1).padStart(2, '0');
                                const d = String(day.getDate()).padStart(2, '0');
                                const dateStr = `${y}-${m}-${d}`;
                                const count = sessionCounts[dateStr] || 0;
                                const formattedDate = format(day, "d 'de' MMMM, yyyy", { locale: es });
  
                                return (
                                  <Tooltip key={dIdx}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={cn(
                                          'w-2.5 h-2.5 rounded-sm transition-all duration-200 ease-out hover:scale-115 cursor-pointer',
                                          getCellColorClass(count)
                                        )}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2 py-1 rounded shadow-md border-none">
                                      <span className="font-semibold">{count} {count === 1 ? 'sesión' : 'sesiones'}</span>
                                      <span className="text-muted-foreground dark:text-slate-500 block text-[10px]">{formattedDate}</span>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityHeatmap;
