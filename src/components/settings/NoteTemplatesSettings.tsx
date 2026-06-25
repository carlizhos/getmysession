import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  useNoteTemplatesQuery, 
  useSaveNoteTemplateMutation, 
  useDeleteNoteTemplateMutation 
} from '@/hooks/useSettingsData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  Plus, 
  Loader2, 
  Lock, 
  Palette, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  Brain, 
  ClipboardList, 
  List, 
  Lightbulb, 
  Target, 
  PenLine, 
  Eye as EyeIcon, 
  BookOpen, 
  Settings as SettingsIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { NoteTemplate } from '@/types';

const TEMPLATE_SECTIONS: { key: string; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'mood', label: 'Estado de Ánimo', icon: Brain, description: 'Slider 1-100 con notas' },
  { key: 'bridge', label: 'Puente Intersesión', icon: ClipboardList, description: 'Revisión de tareas previas' },
  { key: 'agenda', label: 'Agenda / Conceptualización', icon: List, description: 'Temas, pensamientos, emociones' },
  { key: 'beliefs', label: 'Creencias', icon: Lightbulb, description: 'Nucleares y alternativas' },
  { key: 'action_plan', label: 'Plan de Acción', icon: Target, description: 'Tareas y recomendaciones' },
  { key: 'free_text', label: 'Texto Libre', icon: PenLine, description: 'Campo abierto narrativo' },
  { key: 'techniques', label: 'Técnicas', icon: SettingsIcon, description: 'Intervenciones aplicadas' },
  { key: 'observations', label: 'Observaciones', icon: EyeIcon, description: 'Notas del terapeuta' },
  { key: 'goals', label: 'Objetivos', icon: Target, description: 'Metas de la sesión' },
  { key: 'homework', label: 'Tarea para Casa', icon: BookOpen, description: 'Ejercicios para el paciente' },
];

const TEMPLATE_COLORS: { value: string; bg: string; text: string }[] = [
  { value: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' },
  { value: 'green', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { value: 'amber', bg: 'bg-amber-100', text: 'text-amber-700' },
  { value: 'rose', bg: 'bg-rose-100', text: 'text-rose-700' },
  { value: 'violet', bg: 'bg-violet-100', text: 'text-violet-700' },
  { value: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700' },
];

export default function NoteTemplatesSettings() {
  const { user } = useAuth();
  const { organization } = useOrganization();

  const { data: noteTemplates = [], isLoading: isLoadingTemplates } = useNoteTemplatesQuery(user?.id);
  const saveTemplateMutation = useSaveNoteTemplateMutation();
  const deleteTemplateMutation = useDeleteNoteTemplateMutation();

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);
  const [templateView, setTemplateView] = useState<'system' | 'custom'>('system');

  const handleSaveTemplate = async (templateData: NoteTemplate) => {
    if (!user || !organization) return;
    try {
      await saveTemplateMutation.mutateAsync({
        userId: user.id,
        organizationId: organization.id,
        template: templateData
      });
      toast.success(templateData.id ? 'Plantilla actualizada' : 'Plantilla creada');
      setShowTemplateModal(false);
      setEditingTemplate(null);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!user || !confirm('¿Eliminar esta plantilla?')) return;
    try {
      await deleteTemplateMutation.mutateAsync({
        userId: user.id,
        id
      });
      toast.success('Plantilla eliminada');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card variant="flat" className="border border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Plantillas de Notas Clínicas</CardTitle>
                <CardDescription>Estructuras predefinidas para registrar sesiones según tu enfoque terapéutico</CardDescription>
              </div>
            </div>
            <Button 
              variant="zen" 
              size="sm" 
              className="gap-1.5 font-bold" 
              onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}
            >
              <Plus className="h-3.5 w-3.5" /> Nueva Plantilla
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* View toggle */}
          <div className="flex bg-muted/20 p-1 rounded-xl border border-border/40 mb-6 w-fit">
            <button
              onClick={() => setTemplateView('system')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                templateView === 'system' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Lock className="h-3 w-3" /> Del Sistema ({noteTemplates.filter(t => t.is_system).length})
            </button>
            <button
              onClick={() => setTemplateView('custom')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                templateView === 'custom' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Palette className="h-3 w-3" /> Mis Plantillas ({noteTemplates.filter(t => !t.is_system).length})
            </button>
          </div>

          {isLoadingTemplates ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
              <p className="text-xs text-muted-foreground font-medium animate-pulse">Cargando plantillas...</p>
            </div>
          ) : (
            <>
              {/* System Templates */}
              {templateView === 'system' && (
                <div className="space-y-4">
                  {noteTemplates.filter(t => t.is_system).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Lock className="h-8 w-8 text-muted-foreground/20 mb-3" />
                      <p className="text-sm text-muted-foreground">No hay plantillas del sistema disponibles.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {noteTemplates.filter(t => t.is_system).map(template => {
                        const colorDef = TEMPLATE_COLORS.find(c => c.value === template.color) || TEMPLATE_COLORS[4];
                        return (
                          <div key={template.id} className="group relative rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden">
                            <div className="flex items-start gap-3 mb-3">
                              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", colorDef.bg)}>
                                <FileText className={cn("h-5 w-5", colorDef.text)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm">{template.name}</h4>
                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 mt-1 gap-1">
                                  <Lock className="h-2 w-2" /> SISTEMA
                                </Badge>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">{template.description}</p>
                            <div className="flex flex-wrap gap-1 mb-4">
                              {template.sections.map(s => {
                                const sec = TEMPLATE_SECTIONS.find(ts => ts.key === s);
                                return (
                                  <Badge key={s} variant="secondary" className="text-[9px] h-5 px-1.5 gap-1">
                                    {sec && <sec.icon className="h-2.5 w-2.5" />}
                                    {template.section_labels?.[s] || sec?.label || s}
                                  </Badge>
                                );
                              })}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-2 text-xs font-bold"
                              onClick={() => { setEditingTemplate(template); setShowTemplateModal(true); }}
                            >
                              <Eye className="h-3.5 w-3.5" /> Ver Estructura
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Custom Templates */}
              {templateView === 'custom' && (
                <div className="space-y-4">
                  {noteTemplates.filter(t => !t.is_system).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/40 rounded-2xl bg-muted/5">
                      <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                        <Palette className="h-8 w-8 text-primary/20" />
                      </div>
                      <h3 className="text-base font-bold text-foreground">Sin plantillas personalizadas</h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[300px]">
                        Crea tus propias plantillas adaptadas a tu enfoque terapéutico y estilo de trabajo.
                      </p>
                      <Button variant="outline" size="sm" className="mt-6 gap-2" onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}>
                        <Plus className="h-3.5 w-3.5" /> Crear mi primera plantilla
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {noteTemplates.filter(t => !t.is_system).map(template => {
                        const colorDef = TEMPLATE_COLORS.find(c => c.value === template.color) || TEMPLATE_COLORS[4];
                        return (
                          <div key={template.id} className="group relative rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden">
                            <div className="flex items-start gap-3 mb-3">
                              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", colorDef.bg)}>
                                <FileText className={cn("h-5 w-5", colorDef.text)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm">{template.name}</h4>
                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 mt-1 gap-1">
                                  <Palette className="h-2 w-2" /> PERSONALIZADA
                                </Badge>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">{template.description || 'Sin descripción'}</p>
                            <div className="flex flex-wrap gap-1 mb-4">
                              {template.sections.map(s => {
                                const sec = TEMPLATE_SECTIONS.find(ts => ts.key === s);
                                return (
                                  <Badge key={s} variant="secondary" className="text-[9px] h-5 px-1.5 gap-1">
                                    {sec && <sec.icon className="h-2.5 w-2.5" />}
                                    {template.section_labels?.[s] || sec?.label || s}
                                  </Badge>
                                );
                              })}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 gap-2 text-xs font-bold"
                                onClick={() => { setEditingTemplate(template); setShowTemplateModal(true); }}
                              >
                                <SettingsIcon className="h-3.5 w-3.5" /> Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                onClick={() => handleDeleteTemplate(template.id!)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="pt-4 border-t border-border/30 mt-6">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              Las plantillas del sistema están optimizadas para cada enfoque terapéutico. Crea las tuyas para personalizar tu flujo de trabajo.
            </p>
          </div>
        </CardContent>
      </Card>

      <TemplateModal 
        open={showTemplateModal} 
        onOpenChange={setShowTemplateModal} 
        template={editingTemplate} 
        onSave={handleSaveTemplate} 
        isSaving={saveTemplateMutation.isLoading} 
      />
    </div>
  );
}

const TemplateModal = ({ open, onOpenChange, template, onSave, isSaving }: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  template: NoteTemplate | null,
  onSave: (data: NoteTemplate) => void,
  isSaving: boolean
}) => {
  const isSystem = template?.is_system === true;
  const isEditing = template && !isSystem;
  const isViewing = isSystem;

  const [formData, setFormData] = useState<NoteTemplate>({
    name: '',
    description: '',
    sections: [],
    section_labels: {},
    is_system: false,
    color: 'violet',
    active: true
  });

  useEffect(() => {
    if (template) {
      setFormData({ ...template });
    } else {
      setFormData({
        name: '',
        description: '',
        sections: [],
        section_labels: {},
        is_system: false,
        color: 'violet',
        active: true
      });
    }
  }, [template, open]);

  const toggleSection = (key: string) => {
    if (isViewing) return;
    setFormData(prev => {
      const exists = prev.sections.includes(key);
      const newSections = exists
        ? prev.sections.filter(s => s !== key)
        : [...prev.sections, key];
      const newLabels = { ...prev.section_labels };
      if (exists) {
        delete newLabels[key];
      } else {
        const sec = TEMPLATE_SECTIONS.find(s => s.key === key);
        if (sec) newLabels[key] = sec.label;
      }
      return { ...prev, sections: newSections, section_labels: newLabels };
    });
  };

  const updateLabel = (key: string, label: string) => {
    if (isViewing) return;
    setFormData(prev => ({
      ...prev,
      section_labels: { ...prev.section_labels, [key]: label }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {isViewing ? template?.name : isEditing ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </DialogTitle>
          <DialogDescription>
            {isViewing
              ? 'Esta plantilla del sistema no puede modificarse.'
              : 'Define la estructura de secciones para tus notas clínicas.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 space-y-5 pb-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Name & Description (hidden for system view) */}
          {!isViewing && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Mi plantilla TCC adaptada"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve descripción del enfoque..."
                  className="h-11"
                />
              </div>
              {/* Color selector */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Color</Label>
                <div className="flex gap-2">
                  {TEMPLATE_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      className={cn(
                        "h-8 w-8 rounded-full transition-all border-2",
                        c.bg,
                        formData.color === c.value ? "border-primary scale-110 shadow-md" : "border-transparent hover:scale-105"
                      )}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* System template info */}
          {isViewing && template && (
            <div className="p-4 rounded-xl bg-muted/10 border border-border">
              <p className="text-sm text-muted-foreground leading-relaxed">{template.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="text-[9px] gap-1">
                  <Lock className="h-2 w-2" /> Solo lectura
                </Badge>
                <Badge variant="secondary" className="text-[9px]">
                  {template.sections.length} secciones
                </Badge>
              </div>
            </div>
          )}

          {/* Section Toggles */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isViewing ? 'Secciones incluidas' : 'Secciones (selecciona las que necesites)'}
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATE_SECTIONS.map(sec => {
                const isActive = formData.sections.includes(sec.key);
                const Icon = sec.icon;
                return (
                  <button
                    key={sec.key}
                    type="button"
                    onClick={() => toggleSection(sec.key)}
                    disabled={isViewing && !isActive}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : isViewing
                          ? "border-border/30 bg-muted/5 opacity-40"
                          : "border-border bg-card hover:border-primary/30 hover:bg-primary/5",
                      isViewing && "cursor-default"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                      isActive ? "bg-primary/10 text-primary" : "bg-muted/20 text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-xs font-bold",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}>{sec.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{sec.description}</p>
                    </div>
                    {isActive && !isViewing && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                    {isActive && isViewing && (
                      <Badge variant="outline" className="text-[8px] h-4 px-1 shrink-0">Activa</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Labels (only for editing/creating) */}
          {!isViewing && formData.sections.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Etiquetas personalizadas
              </Label>
              <div className="space-y-2">
                {formData.sections.map(sKey => {
                  const sec = TEMPLATE_SECTIONS.find(s => s.key === sKey);
                  return (
                    <div key={sKey} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-32 shrink-0">
                        {sec && <sec.icon className="h-3 w-3 text-muted-foreground" />}
                        <span className="text-[10px] font-bold text-muted-foreground truncate">{sec?.label}</span>
                      </div>
                      <Input
                        value={formData.section_labels[sKey] || ''}
                        onChange={e => updateLabel(sKey, e.target.value)}
                        placeholder={sec?.label}
                        className="h-8 text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section labels preview for system */}
          {isViewing && formData.sections.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Etiquetas de la plantilla
              </Label>
              <div className="space-y-1.5">
                {formData.sections.map((sKey, idx) => {
                  const sec = TEMPLATE_SECTIONS.find(s => s.key === sKey);
                  const Icon = sec?.icon || FileText;
                  return (
                    <div key={sKey} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/10 border border-border/30">
                      <span className="text-[10px] font-black text-muted-foreground/40 w-5 text-center">{idx + 1}</span>
                      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-sm font-medium">{formData.section_labels[sKey] || sec?.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-6 bg-muted/20 gap-3 border-t border-border/50">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-6 font-bold">
            {isViewing ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!isViewing && (
            <Button
              variant="zen"
              onClick={() => onSave(formData)}
              disabled={isSaving || !formData.name || formData.sections.length === 0}
              className="rounded-xl h-11 px-8 font-bold gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEditing ? 'Actualizar Plantilla' : 'Crear Plantilla'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
