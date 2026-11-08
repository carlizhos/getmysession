import { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, Check, ArrowRightLeft, Sparkles, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DiagnosticItem,
  DIAGNOSTIC_CATALOG,
  searchDiagnostics,
  findDiagnosticByCie10,
  findDiagnosticByDsm5,
} from '@/lib/dsm5Catalog';

export interface DiagnosticValue {
  dsm5Code?: string | null;
  dsm5Description?: string | null;
  cie10Code?: string | null;
  cie10Description?: string | null;
}

interface DiagnosticSelectorProps {
  value?: DiagnosticValue | null;
  onChange: (value: DiagnosticValue | null) => void;
  disabled?: boolean;
  className?: string;
}

export const DiagnosticSelector = ({
  value,
  onChange,
  disabled,
  className,
}: DiagnosticSelectorProps) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dsm5' | 'cie10'>('dsm5');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resultados de búsqueda
  const results = useMemo(() => {
    if (query.trim().length >= 2) {
      return searchDiagnostics(query, 12);
    }
    // Si no hay query y está abierto, sugerir los 8 diagnósticos más comunes en psicología
    return DIAGNOSTIC_CATALOG.slice(0, 8);
  }, [query]);

  // Selección de diagnóstico
  const handleSelect = (item: DiagnosticItem) => {
    onChange({
      dsm5Code: item.dsm5Code,
      dsm5Description: item.dsm5Title,
      cie10Code: item.cie10Code,
      cie10Description: item.cie10Description,
    });
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Manejo de teclado (flechas y Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const hasValue = Boolean(value?.cie10Code || value?.dsm5Code);

  return (
    <div className={cn('space-y-2 relative', className)} ref={containerRef}>
      {hasValue ? (
        /* Tarjeta de Diagnóstico Seleccionado con Homologación Dual */
        <div className="p-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-emerald-500/5 shadow-sm space-y-2 transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              {/* Badge Criterio Clínico DSM-5 */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200 shadow-2xs">
                  <BookOpen className="h-3 w-3 text-purple-700" />
                  DSM-5: {value?.dsm5Code || 'Clínico'}
                </span>
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {value?.dsm5Description || value?.cie10Description}
                </span>
              </div>

              {/* Homologación a MinSalud CIE-10 (RIPS) */}
              <div className="flex items-center gap-2 pt-1 flex-wrap text-xs text-muted-foreground">
                <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold text-slate-600">MinSalud RIPS (CIE-10):</span>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-300 font-mono text-[11px] font-bold"
                >
                  {value?.cie10Code}
                </Badge>
                <span className="text-slate-600 truncate max-w-xs">
                  {value?.cie10Description}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-1.5 py-0.5 rounded">
                  Válido Res. 2275 ✓
                </span>
              </div>
            </div>

            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                onClick={handleClear}
                title="Cambiar diagnóstico"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Barra de Búsqueda Inteligente Omnicanal */
        <div className="space-y-1.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Buscar por DSM-5, CIE-10, acrónimo (TAG, TDAH, TLP, TOC, TEPT) o síntoma..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setSelectedIndex(0);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-20 h-10 rounded-xl bg-white/80 border-slate-200 shadow-2xs focus:ring-2 focus:ring-primary/20 text-sm"
              disabled={disabled}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
              <span className="px-1.5 py-0.5 rounded bg-muted border border-border">DSM-5</span>
              <span className="text-muted-foreground/60">⇄</span>
              <span className="px-1.5 py-0.5 rounded bg-muted border border-border">CIE-10</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground px-1">
            Escribe al menos 2 letras. La plataforma mapea automáticamente el código DSM-5 al CIE-10 requerido por MinSalud.
          </p>
        </div>
      )}

      {/* Menú Desplegable de Resultados */}
      {isOpen && !hasValue && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden backdrop-blur-md">
          {/* Cabecera / Switch de Perspectiva */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>{query.length >= 2 ? `Resultados (${results.length})` : 'Trastornos Frecuentes'}</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('dsm5')}
                className={cn(
                  'px-2 py-0.5 rounded transition-all',
                  activeTab === 'dsm5' ? 'bg-white shadow-xs text-purple-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Vista DSM-5
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cie10')}
                className={cn(
                  'px-2 py-0.5 rounded transition-all',
                  activeTab === 'cie10' ? 'bg-white shadow-xs text-emerald-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Vista CIE-10
              </button>
            </div>
          </div>

          {/* Lista de Resultados */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
            {results.length > 0 ? (
              results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 transition-all flex items-start gap-3 group',
                      isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50 text-slate-800'
                    )}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    {/* Código según la perspectiva activa */}
                    <div className="flex flex-col gap-1 items-start flex-shrink-0 pt-0.5">
                      {activeTab === 'dsm5' ? (
                        <>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                            {item.dsm5Code}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.cie10Code}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {item.cie10Code}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            {item.dsm5Code}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Descripción y categoría */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate leading-tight group-hover:text-primary">
                        {activeTab === 'dsm5' ? item.dsm5Title : item.cie10Description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                        <span className="font-medium text-slate-500">{item.category}</span>
                        <span>•</span>
                        <span className="text-slate-400 truncate">
                          {activeTab === 'dsm5' ? item.cie10Description : item.dsm5Title}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 pt-1 text-muted-foreground group-hover:text-primary">
                      <Check className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground text-xs">
                No se encontraron diagnósticos para "{query}".
                <p className="mt-1 text-[11px] text-slate-400">
                  Prueba buscando por síntoma ("ansiedad", "tristeza", "panico"), código o acrónimo.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosticSelector;
