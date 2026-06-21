import { useState } from 'react';
import { useAsyncInsights } from '@/hooks/useAsyncInsights';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  AlertTriangle,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Brain,
  RefreshCw,
  Mic,
  PenLine,
  Globe,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { AsyncMessage } from '@/types';

interface PatientAsyncInsightsProps {
  patientId: string;
}

// ── Emotion color mapping ───────────────────────────────────────────────

const emotionColorMap: Record<string, string> = {
  'ansiedad': 'bg-zen-lavender-light text-zen-lavender border-zen-lavender/20',
  'tristeza': 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-200/30',
  'miedo': 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200/30',
  'ira': 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200/30',
  'alegría': 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/30',
  'esperanza': 'bg-zen-sage-light text-zen-sage border-zen-sage/20',
  'frustración': 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200/30',
  'culpa': 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200/30',
  'confusión': 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200/30',
  'soledad': 'bg-slate-100 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 border-slate-200/30',
};

const getEmotionClasses = (emotion: string): string => {
  const key = emotion.toLowerCase().trim();
  return emotionColorMap[key] || 'bg-primary/5 text-primary/80 border-primary/15';
};

// ── Source type labels & icons ──────────────────────────────────────────

const sourceConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  whatsapp: { label: 'WhatsApp', icon: <MessageCircle className="h-3 w-3" /> },
  whatsapp_audio: { label: 'Audio', icon: <Mic className="h-3 w-3" /> },
  portal: { label: 'Portal', icon: <Globe className="h-3 w-3" /> },
  manual: { label: 'Manual', icon: <PenLine className="h-3 w-3" /> },
};

// ── Insight Card ────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: AsyncMessage }) {
  const [showSuggestion, setShowSuggestion] = useState(false);
  const source = sourceConfig[insight.source_type] || sourceConfig.manual;

  return (
    <div
      className={cn(
        'backdrop-blur-xl bg-white/40 dark:bg-slate-950/30 border border-white/30 dark:border-white/5 shadow-soft rounded-2xl p-5 transition-all',
        insight.ai_red_flag && 'border-l-[3px] border-l-[#9B2335]/60'
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1 text-[11px] font-medium bg-white/50 dark:bg-white/5"
          >
            {source.icon}
            {source.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(insight.created_at), {
              addSuffix: true,
              locale: es,
            })}
          </span>
        </div>

        {insight.ai_red_flag && (
          <div className="flex items-center gap-1.5 text-[#9B2335]/80">
            <AlertTriangle className="h-3.5 w-3.5 opacity-80" />
            <span className="text-[11px] font-medium">Alerta</span>
          </div>
        )}
      </div>

      {/* Red flag reason */}
      {insight.ai_red_flag && insight.ai_red_flag_reason && (
        <p className="text-muted-foreground text-xs mb-3 pl-0.5 leading-relaxed">
          {insight.ai_red_flag_reason}
        </p>
      )}

      {/* AI Summary */}
      {insight.ai_summary && (
        <p className="text-sm text-foreground/90 leading-relaxed mb-4">
          {insight.ai_summary}
        </p>
      )}

      {/* Emotions */}
      {insight.ai_emotions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {insight.ai_emotions.map((emotion) => (
            <Badge
              key={emotion}
              variant="outline"
              className={cn('text-[11px] font-normal', getEmotionClasses(emotion))}
            >
              {emotion}
            </Badge>
          ))}
        </div>
      )}

      {/* Key points */}
      {insight.ai_key_points.length > 0 && (
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground leading-relaxed mb-4">
          {insight.ai_key_points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      )}

      {/* Approach suggestion (collapsible) */}
      {insight.ai_approach_suggestion && (
        <div className="pt-2 border-t border-white/20 dark:border-white/5">
          <button
            onClick={() => setShowSuggestion(!showSuggestion)}
            className="flex items-center gap-2 text-xs text-primary/70 hover:text-primary transition-colors w-full text-left py-1"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            <span className="font-medium">Sugerencia de abordaje</span>
            {showSuggestion ? (
              <ChevronUp className="h-3 w-3 ml-auto" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-auto" />
            )}
          </button>
          {showSuggestion && (
            <p className="text-sm text-muted-foreground leading-relaxed mt-2 pl-5 animate-in fade-in slide-in-from-top-1 duration-200">
              {insight.ai_approach_suggestion}
            </p>
          )}
        </div>
      )}

      {/* Footer timestamp */}
      <div className="mt-3 pt-2 border-t border-white/10 dark:border-white/5">
        <span className="text-[10px] text-muted-foreground/60">
          {format(new Date(insight.created_at), "d MMM yyyy · HH:mm", { locale: es })}
          {insight.ai_processed_at && (
            <> · Procesado {formatDistanceToNow(new Date(insight.ai_processed_at), { addSuffix: true, locale: es })}</>
          )}
        </span>
      </div>
    </div>
  );
}

// ── Loading Skeleton ────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="backdrop-blur-xl bg-white/40 dark:bg-slate-950/30 border border-white/30 dark:border-white/5 shadow-soft rounded-2xl p-5 animate-pulse"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-20 bg-muted/40 rounded-full" />
            <div className="h-3 w-24 bg-muted/30 rounded" />
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-4 w-full bg-muted/30 rounded" />
            <div className="h-4 w-4/5 bg-muted/30 rounded" />
          </div>
          <div className="flex gap-1.5 mb-3">
            <div className="h-5 w-16 bg-muted/20 rounded-full" />
            <div className="h-5 w-20 bg-muted/20 rounded-full" />
            <div className="h-5 w-14 bg-muted/20 rounded-full" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-3/4 bg-muted/20 rounded" />
            <div className="h-3 w-2/3 bg-muted/20 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="backdrop-blur-xl bg-white/30 dark:bg-slate-950/20 rounded-full p-5 mb-6">
        <MessageCircle className="h-10 w-10 text-primary/40" />
      </div>
      <h3 className="text-lg font-semibold text-foreground/80 mb-2">
        Sin mensajes procesados
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
        Conecta WhatsApp o utiliza el portal del paciente para recibir mensajes entre sesiones. 
        La IA los analizará automáticamente.
      </p>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

export default function PatientAsyncInsights({ patientId }: PatientAsyncInsightsProps) {
  const {
    insights,
    thisWeekInsights,
    redFlagCount,
    isLoading,
    refetch,
  } = useAsyncInsights(patientId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="backdrop-blur-xl bg-primary/10 rounded-xl p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              Seguimiento Asíncrono
              {thisWeekInsights.length > 0 && (
                <Badge variant="outline" className="text-[11px] font-normal bg-primary/5 text-primary/80 border-primary/15">
                  {thisWeekInsights.length} esta semana
                </Badge>
              )}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Análisis IA de mensajes entre sesiones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {redFlagCount > 0 && (
            <Badge
              variant="outline"
              className="text-[11px] font-medium bg-[#9B2335]/5 text-[#9B2335]/70 border-[#9B2335]/15 gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              {redFlagCount} {redFlagCount === 1 ? 'alerta' : 'alertas'}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : insights.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
