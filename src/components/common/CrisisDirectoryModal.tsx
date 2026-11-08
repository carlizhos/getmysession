import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, PhoneCall, AlertTriangle, Search, ShieldCheck, HeartPulse, ExternalLink } from 'lucide-react';
import { COLOMBIA_CRISIS_LINES, CrisisLineItem } from '@/lib/colombiaCrisisDirectory';
import { cn } from '@/lib/utils';

interface CrisisDirectoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CrisisDirectoryModal: React.FC<CrisisDirectoryModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredLines = COLOMBIA_CRISIS_LINES.filter((line) => {
    const matchesSearch =
      line.name.toLowerCase().includes(search.toLowerCase()) ||
      line.coverage.toLowerCase().includes(search.toLowerCase()) ||
      line.number.includes(search) ||
      line.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || line.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col gap-0 overflow-hidden rounded-2xl border-border">
        {/* Header con advertencia clínica */}
        <div className="p-6 pb-4 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-primary/5 border-b border-border/60">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <HeartPulse className="h-5 w-5 text-red-600 animate-pulse" />
              Directorio de Crisis y Salud Mental (Colombia)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Líneas oficiales gratuitas de atención en crisis, apoyo psicosocial y urgencias psiquiátricas conforme a los protocolos del Ministerio de Salud e ICBF.
            </DialogDescription>
          </DialogHeader>

          {/* Banner de protocolo vital */}
          <div className="mt-3 p-3 rounded-xl bg-red-100/80 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-start gap-2.5 text-xs text-red-900 dark:text-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Protocolo de Riesgo Vital Inminente (Ley 1090 de 2006):</p>
              <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                Si un paciente presenta ideación suicida con plan estructurado o intento en curso, contacta de inmediato al <strong>123</strong> o comunica al contacto de emergencia local designado en su expediente.
              </p>
            </div>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="p-4 border-b border-border/40 bg-muted/20 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ciudad (Bogotá, Medellín, Cali...), línea o motivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-background"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap text-xs">
            {[
              { id: 'all', label: 'Todas las líneas' },
              { id: 'vital', label: '🚨 Riesgo Vital (123)' },
              { id: 'general', label: '🧠 Salud Mental / MinSalud' },
              { id: 'infancia', label: '🧒 Niñez e ICBF (141)' },
              { id: 'mujeres', label: '💜 Violencia / Código Fucsia' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Líneas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-border/30">
          {filteredLines.length > 0 ? (
            filteredLines.map((line) => (
              <div
                key={line.id}
                className={cn(
                  'pt-3 first:pt-0 p-3 rounded-xl transition-all',
                  line.isUrgent
                    ? 'bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40'
                    : 'hover:bg-muted/30 border border-transparent hover:border-border/50'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {line.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.2',
                          line.isUrgent
                            ? 'bg-red-100 text-red-700 border-red-300'
                            : 'bg-primary/10 text-primary border-primary/20'
                        )}
                      >
                        {line.badge}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {line.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex-wrap">
                      <span>📍 <strong>Cobertura:</strong> {line.coverage}</span>
                      <span>🕒 <strong>Disponibilidad:</strong> {line.available}</span>
                    </div>
                  </div>

                  {/* Botón de Llamada Rápida */}
                  <div className="shrink-0 pt-0.5">
                    <a href={`tel:${line.number.replace(/\s+/g, '')}`}>
                      <Button
                        size="sm"
                        className={cn(
                          'gap-1.5 h-8 text-xs font-bold rounded-xl shadow-xs',
                          line.isUrgent
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        )}
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                        <span>Llamar {line.displayPhone}</span>
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No se encontraron líneas de crisis para "{search}".
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CrisisDirectoryModal;
