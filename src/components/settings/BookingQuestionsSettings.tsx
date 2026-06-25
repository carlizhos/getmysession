import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  useBookingQuestionsQuery, 
  useSaveBookingQuestionMutation, 
  useDeleteBookingQuestionMutation 
} from '@/hooks/useSettingsData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  HelpCircle, 
  Plus, 
  Loader2, 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  CircleDot, 
  CheckSquare, 
  Type, 
  AlignLeft, 
  ToggleLeft,
  Settings as SettingsIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { BookingQuestion } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

const QUESTION_TYPES = [
  { value: 'text', label: 'Texto corto', icon: Type },
  { value: 'textarea', label: 'Texto largo', icon: AlignLeft },
  { value: 'yes_no', label: 'Sí / No', icon: ToggleLeft },
  { value: 'select_one', label: 'Opción única', icon: CircleDot },
  { value: 'select_many', label: 'Opción múltiple', icon: CheckSquare },
];

export default function BookingQuestionsSettings() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const { data: bookingQuestions = [], isLoading: isLoadingQuestions } = useBookingQuestionsQuery(user?.id);
  const saveQuestionMutation = useSaveBookingQuestionMutation();
  const deleteQuestionMutation = useDeleteBookingQuestionMutation();

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<BookingQuestion | null>(null);

  const handleSaveQuestion = async (questionData: BookingQuestion) => {
    if (!user || !organization) return;
    try {
      const payload = {
        ...questionData,
        sort_order: questionData.id ? questionData.sort_order : bookingQuestions.length
      };

      await saveQuestionMutation.mutateAsync({
        userId: user.id,
        organizationId: organization.id,
        question: payload
      });

      toast.success(questionData.id ? 'Pregunta actualizada' : 'Pregunta creada');
      setShowQuestionModal(false);
      setEditingQuestion(null);
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!user || !confirm('¿Eliminar esta pregunta?')) return;
    try {
      await deleteQuestionMutation.mutateAsync({
        userId: user.id,
        id
      });
      toast.success('Pregunta eliminada');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleToggleQuestion = async (id: string, active: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('booking_questions')
        .update({ active })
        .eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['settings-questions', user.id] });
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleMoveQuestion = async (id: string, direction: 'up' | 'down') => {
    if (!user) return;
    const idx = bookingQuestions.findIndex(q => q.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= bookingQuestions.length) return;

    const updated = [...bookingQuestions];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    const updates = updated.map((q, i) => ({ ...q, sort_order: i }));

    // Optimistic local state update in query cache
    queryClient.setQueryData(['settings-questions', user.id], updates);

    try {
      await Promise.all([
        supabase.from('booking_questions').update({ sort_order: updates[idx].sort_order }).eq('id', updates[idx].id!),
        supabase.from('booking_questions').update({ sort_order: updates[swapIdx].sort_order }).eq('id', updates[swapIdx].id!),
      ]);
    } catch (err) {
      console.error('Error reordering:', err);
      queryClient.invalidateQueries({ queryKey: ['settings-questions', user.id] });
    }
  };

  return (
    <div className="space-y-6">
      <Card variant="flat" className="border border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <HelpCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Preguntas de Reserva</CardTitle>
                <CardDescription>Configura preguntas que tus pacientes responderán al agendar una cita</CardDescription>
              </div>
            </div>
            <Button 
              variant="zen" 
              size="sm" 
              className="gap-1.5 font-bold" 
              onClick={() => { setEditingQuestion(null); setShowQuestionModal(true); }}
            >
              <Plus className="h-3.5 w-3.5" /> Nueva Pregunta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingQuestions ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
              <p className="text-xs text-muted-foreground font-medium animate-pulse">Cargando preguntas...</p>
            </div>
          ) : bookingQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/40 rounded-2xl bg-muted/5">
              <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                <HelpCircle className="h-8 w-8 text-primary/20" />
              </div>
              <h3 className="text-base font-bold text-foreground">Sin preguntas configuradas</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[300px]">
                Agrega preguntas personalizadas para conocer mejor a tus pacientes antes de la primera sesión.
              </p>
              <Button variant="outline" size="sm" className="mt-6 gap-2" onClick={() => setShowQuestionModal(true)}>
                <Plus className="h-3.5 w-3.5" /> Crear mi primera pregunta
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {bookingQuestions.map((q, idx) => (
                <div key={q.id} className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border transition-all group",
                  q.active ? "bg-card border-border hover:shadow-sm" : "bg-muted/10 border-border/40 opacity-60"
                )}>
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveQuestion(q.id!, 'up')}
                      disabled={idx === 0}
                      className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveQuestion(q.id!, 'down')}
                      disabled={idx === bookingQuestions.length - 1}
                      className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Question info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm truncate">{q.label}</h4>
                      {q.is_required && (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1.5">Obligatoria</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-1">
                        {(() => {
                          const qt = QUESTION_TYPES.find(t => t.value === q.type);
                          const Icon = qt?.icon || Type;
                          return <><Icon className="h-2.5 w-2.5" /> {qt?.label || q.type}</>;
                        })()}
                      </Badge>
                      {(q.type === 'select_one' || q.type === 'select_many') && q.options.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{q.options.length} opciones</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={q.active}
                      onCheckedChange={(v) => handleToggleQuestion(q.id!, v)}
                      className="scale-75"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5" 
                      onClick={() => { setEditingQuestion(q); setShowQuestionModal(true); }}
                    >
                      <SettingsIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5" 
                      onClick={() => handleDeleteQuestion(q.id!)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-border/30">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <HelpCircle className="h-3 w-3" />
                  Estas preguntas se mostrarán a los pacientes en tu portal público de reservas.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <QuestionModal 
        open={showQuestionModal} 
        onOpenChange={setShowQuestionModal} 
        question={editingQuestion} 
        onSave={handleSaveQuestion} 
        isSaving={saveQuestionMutation.isLoading} 
      />
    </div>
  );
}

const QuestionModal = ({ open, onOpenChange, question, onSave, isSaving }: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  question: BookingQuestion | null,
  onSave: (data: BookingQuestion) => void,
  isSaving: boolean
}) => {
  const [formData, setFormData] = useState<BookingQuestion>({
    label: '',
    type: 'text',
    options: [],
    is_required: false,
    sort_order: 0,
    active: true
  });
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    if (question) {
      setFormData(question);
    } else {
      setFormData({
        label: '',
        type: 'text',
        options: [],
        is_required: false,
        sort_order: 0,
        active: true
      });
    }
    setNewOption('');
  }, [question, open]);

  const addOption = () => {
    if (!newOption.trim()) return;
    setFormData(prev => ({ ...prev, options: [...prev.options, newOption.trim()] }));
    setNewOption('');
  };

  const removeOption = (idx: number) => {
    setFormData(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));
  };

  const needsOptions = formData.type === 'select_one' || formData.type === 'select_many';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden rounded-3xl">
        <div className="h-2 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {question ? 'Editar Pregunta' : 'Nueva Pregunta de Reserva'}
          </DialogTitle>
          <DialogDescription>
            Esta pregunta se mostrará en tu portal público de reservas.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 space-y-5 pb-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Label */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pregunta</Label>
            <Input
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="Ej. ¿Has recibido atención psicológica antes?"
              className="h-11"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de respuesta</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUESTION_TYPES.map(qt => {
                const Icon = qt.icon;
                return (
                  <button
                    key={qt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: qt.value as BookingQuestion['type'] })}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition-all",
                      formData.type === qt.value
                        ? "border-primary bg-primary/5 text-primary font-semibold shadow-sm"
                        : "border-border bg-card hover:border-primary/30 hover:bg-primary/5 text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate text-xs">{qt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options (for select_one / select_many) */}
          {needsOptions && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opciones</Label>
              <div className="space-y-2">
                {formData.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 p-2.5 px-3 rounded-lg border border-border bg-muted/10">
                      {formData.type === 'select_one' ? (
                        <CircleDot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <CheckSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm">{opt}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                    placeholder="Escribe una opción y presiona Enter"
                    className="h-10"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addOption} disabled={!newOption.trim()}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Required */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border">
            <div>
              <p className="text-sm font-medium">Obligatoria</p>
              <p className="text-xs text-muted-foreground">El paciente debe responder para poder agendar</p>
            </div>
            <Switch
              checked={formData.is_required}
              onCheckedChange={(v) => setFormData({ ...formData, is_required: v })}
            />
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vista previa</Label>
            <div className="p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5">
              <p className="text-sm font-medium mb-2">
                {formData.label || 'Tu pregunta aquí...'} {formData.is_required && <span className="text-destructive">*</span>}
              </p>
              {formData.type === 'text' && (
                <div className="h-10 rounded-md border border-border bg-white/60 px-3 flex items-center text-xs text-muted-foreground">Respuesta...</div>
              )}
              {formData.type === 'textarea' && (
                <div className="h-20 rounded-md border border-border bg-white/60 px-3 pt-2 text-xs text-muted-foreground">Respuesta...</div>
              )}
              {formData.type === 'yes_no' && (
                <div className="flex gap-2">
                  <div className="flex-1 h-10 rounded-lg border border-border bg-white/60 flex items-center justify-center text-sm font-medium text-muted-foreground">Sí</div>
                  <div className="flex-1 h-10 rounded-lg border border-border bg-white/60 flex items-center justify-center text-sm font-medium text-muted-foreground">No</div>
                </div>
              )}
              {formData.type === 'select_one' && formData.options.length > 0 && (
                <div className="space-y-1.5">
                  {formData.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 rounded-full border-2 border-border shrink-0" />
                      {opt}
                    </div>
                  ))}
                </div>
              )}
              {formData.type === 'select_many' && formData.options.length > 0 && (
                <div className="space-y-1.5">
                  {formData.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 rounded border-2 border-border shrink-0" />
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-6 bg-muted/20 gap-3 border-t border-border/50">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-6 font-bold">
            Cancelar
          </Button>
          <Button
            variant="zen"
            onClick={() => onSave(formData)}
            disabled={isSaving || !formData.label || (needsOptions && formData.options.length === 0)}
            className="rounded-xl h-11 px-8 font-bold gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {question ? 'Actualizar Pregunta' : 'Crear Pregunta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
