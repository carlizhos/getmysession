import { useEffect, useState, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Save,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { NoteTemplate } from '@/types';
import { DEFAULT_MSE_CATEGORIES, MSECategory } from '@/lib/mentalStatusConfig';
import { supabase } from '@/lib/supabase';

const TEMPLATE_SECTIONS: { key: string; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'mood', label: 'Estado de Ánimo', icon: Brain, description: 'Slider 1-100 con notas' },
  { key: 'bridge', label: 'Puente Intersesión', icon: ClipboardList, description: 'Revisión de tareas previas' },
  { key: 'mental_status', label: 'Examen del Estado Mental', icon: ShieldCheck, description: 'Checklist de observación clínica' },
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
  const { organization, refresh: refreshOrganization, isAdmin } = useOrganization();

  const { data: noteTemplates = [], isLoading: isLoadingTemplates } = useNoteTemplatesQuery(user?.id);
  const saveTemplateMutation = useSaveNoteTemplateMutation();
  const deleteTemplateMutation = useDeleteNoteTemplateMutation();

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);
  const [templateView, setTemplateView] = useState<'system' | 'custom'>('system');

  // ── MSE Configuration State ───────────────────────────────────────────
  const getInitialMSECategories = useCallback((): MSECategory[] => {
    try {
      const config = (organization?.settings as any)?.mental_status_config;
      if (config?.categories && Array.isArray(config.categories) && config.categories.length > 0) {
        return config.categories;
      }
    } catch (e) { /* fallback to defaults */ }
    return DEFAULT_MSE_CATEGORIES;
  }, [organization]);

  const [mseCategories, setMseCategories] = useState<MSECategory[]>(getInitialMSECategories);
  const [mseSelectedId, setMseSelectedId] = useState<string | null>(null);
  const [mseNewOption, setMseNewOption] = useState('');
  const [mseDirty, setMseDirty] = useState(false);
  const [mseSaving, setMseSaving] = useState(false);
  const [mseShowPreview, setMseShowPreview] = useState(false);

  useEffect(() => {
    setMseCategories(getInitialMSECategories());
    setMseDirty(false);
  }, [organization, getInitialMSECategories]);

  // Auto-select first category
  useEffect(() => {
    if (!mseSelectedId && mseCategories.length > 0) {
      setMseSelectedId(mseCategories[0].id);
    }
  }, [mseCategories, mseSelectedId]);

  const mseSelectedCategory = mseCategories.find(c => c.id === mseSelectedId) || null;

  const handleMseUpdateCategory = (categoryId: string, updates: Partial<MSECategory>) => {
    setMseCategories(prev => prev.map(c => c.id === categoryId ? { ...c, ...updates } : c));
    setMseDirty(true);
  };

  const handleMseAddOption = (categoryId: string) => {
    const trimmed = mseNewOption.trim();
    if (!trimmed) return;
    setMseCategories(prev => prev.map(c => {
      if (c.id !== categoryId) return c;
      if (c.options.includes(trimmed)) { toast.error('Esta opción ya existe.'); return c; }
      return { ...c, options: [...c.options, trimmed] };
    }));
    setMseNewOption('');
    setMseDirty(true);
  };

  const handleMseRemoveOption = (categoryId: string, option: string) => {
    setMseCategories(prev => prev.map(c =>
      c.id === categoryId ? { ...c, options: c.options.filter(o => o !== option) } : c
    ));
    setMseDirty(true);
  };

  const handleMseAddCategory = () => {
    const newId = `cat_${Date.now()}`;
    const newCat: MSECategory = { id: newId, label: 'Nueva Categoría', options: [] };
    setMseCategories(prev => [...prev, newCat]);
    setMseSelectedId(newId);
    setMseDirty(true);
  };

  const handleMseDeleteCategory = (categoryId: string) => {
    setMseCategories(prev => {
      const next = prev.filter(c => c.id !== categoryId);
      if (mseSelectedId === categoryId) {
        setMseSelectedId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
    setMseDirty(true);
  };

  const handleMseReset = () => {
    setMseCategories(DEFAULT_MSE_CATEGORIES.map(c => ({ ...c, options: [...c.options] })));
    setMseSelectedId(DEFAULT_MSE_CATEGORIES[0]?.id || null);
    setMseDirty(true);
  };

  const handleMseSave = async () => {
    if (!organization?.id) return;
    setMseSaving(true);
    try {
      const orgSettings = {
        ...((organization.settings as any) || {}),
        mental_status_config: { categories: mseCategories }
      };
      const { error } = await supabase
        .from('organizations')
        .update({ settings: orgSettings })
        .eq('id', organization.id);
      if (error) throw error;
      await refreshOrganization();
      setMseDirty(false);
      toast.success('Configuración del Examen Mental guardada.');
    } catch (err: any) {
      console.error('Error saving MSE config:', err);
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setMseSaving(false);
    }
  };

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

      {/* ── MSE Configuration Panel ────────────────────────────────────── */}
      <Card variant="flat" className="border border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <ShieldAlert className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Examen del Estado Mental (MSE)
                  {mseDirty && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-1 border-amber-300 text-amber-600 bg-amber-50">
                      Sin guardar
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Personaliza las categorías y opciones del checklist clínico que aparece en tus notas de sesión</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                onClick={() => setMseShowPreview(!mseShowPreview)}
              >
                <Eye className="h-3.5 w-3.5" />
                {mseShowPreview ? 'Ocultar Vista Previa' : 'Vista Previa'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Master–Detail Layout */}
          <div className="flex flex-col lg:flex-row gap-4 min-h-[340px]">
            {/* Left: Category List */}
            <div className="w-full lg:w-56 shrink-0 space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 block">Categorías</Label>
              <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {mseCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setMseSelectedId(cat.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group",
                      mseSelectedId === cat.id
                        ? "bg-primary/10 border border-primary/30 shadow-sm"
                        : "hover:bg-muted/30 border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "h-2 w-2 rounded-full shrink-0 transition-colors",
                      mseSelectedId === cat.id ? "bg-primary" : "bg-muted-foreground/20"
                    )} />
                    <span className={cn(
                      "text-xs font-bold truncate flex-1",
                      mseSelectedId === cat.id ? "text-primary" : "text-foreground/70"
                    )}>{cat.label}</span>
                    <Badge variant="secondary" className="text-[8px] h-4 px-1 shrink-0 font-mono">
                      {cat.options.length}
                    </Badge>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMseDeleteCategory(cat.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 hover:text-destructive shrink-0"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-[10px] h-8 font-bold mt-2 border-dashed"
                onClick={handleMseAddCategory}
              >
                <Plus className="h-3 w-3" /> Nueva Categoría
              </Button>
            </div>

            {/* Right: Category Detail */}
            <div className="flex-1 rounded-2xl border border-border bg-muted/5 p-5">
              {mseSelectedCategory ? (
                <div className="space-y-5 animate-in fade-in duration-300">
                  {/* Category Name */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nombre de la Categoría</Label>
                    <Input
                      value={mseSelectedCategory.label}
                      onChange={(e) => handleMseUpdateCategory(mseSelectedCategory.id, { label: e.target.value })}
                      className="h-10 text-sm font-semibold bg-card"
                      placeholder="Ej. Apariencia"
                    />
                  </div>

                  {/* Options */}
                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Opciones ({mseSelectedCategory.options.length})
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {mseSelectedCategory.options.map((option) => (
                        <div
                          key={option}
                          className="group/tag flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium text-foreground/80 hover:border-destructive/30 transition-all"
                        >
                          <span>{option}</span>
                          <button
                            onClick={() => handleMseRemoveOption(mseSelectedCategory.id, option)}
                            className="opacity-40 group-hover/tag:opacity-100 hover:text-destructive transition-all p-0.5 rounded-full hover:bg-destructive/10"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {mseSelectedCategory.options.length === 0 && (
                        <p className="text-xs text-muted-foreground italic py-2">Sin opciones. Agrega al menos una opción para esta categoría.</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        value={mseNewOption}
                        onChange={(e) => setMseNewOption(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleMseAddOption(mseSelectedCategory.id);
                          }
                        }}
                        placeholder="Escribe una opción nueva..."
                        className="h-9 text-xs flex-1 bg-card"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 text-xs font-bold shrink-0"
                        onClick={() => handleMseAddOption(mseSelectedCategory.id)}
                        disabled={!mseNewOption.trim()}
                      >
                        <Plus className="h-3 w-3" /> Agregar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShieldAlert className="h-10 w-10 text-muted-foreground/15 mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">Selecciona una categoría para editar sus opciones</p>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview */}
          {mseShowPreview && (
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.02] p-5 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-4 w-4 text-primary/60" />
                <span className="text-xs font-black uppercase tracking-widest text-primary/60">Vista Previa — Así se verá en la nota</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mseCategories.map((category) => (
                  <div
                    key={category.id}
                    className="p-3.5 rounded-xl border border-border/60 bg-card space-y-2.5"
                  >
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-primary border-b border-border/40 pb-1.5">
                      {category.label}
                    </h4>
                    <div className="space-y-1.5">
                      {category.options.map((option) => (
                        <div key={option} className="flex items-center gap-2">
                          <Checkbox disabled className="h-3.5 w-3.5" />
                          <span className="text-[11px] text-foreground/70 font-medium">{option}</span>
                        </div>
                      ))}
                      {category.options.length === 0 && (
                        <span className="text-[10px] text-muted-foreground italic">Sin opciones</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-border/30">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
              onClick={handleMseReset}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restablecer Predeterminados
            </Button>
            <Button
              variant="zen"
              size="sm"
              className="gap-1.5 text-xs font-bold px-6"
              onClick={handleMseSave}
              disabled={!mseDirty || mseSaving}
            >
              {mseSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {mseSaving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
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
