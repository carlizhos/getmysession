import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import CIE10Selector from '@/components/notes/CIE10Selector';
import MentalStatusSection from '@/components/notes/MentalStatusSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, Save, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import PatientAutocomplete from '@/components/patients/PatientAutocomplete';
import { Slider } from '@/components/ui/slider';

interface StructuredNoteFormProps {
    onSave: (note: any) => void;
    onCancel: () => void;
    initialPatientId?: string;
    initialPatientName?: string;
    templateId?: string;
}

interface NoteTemplate {
    id: string;
    name: string;
    sections: string[];
    section_labels: Record<string, string>;
}

const StructuredNoteForm = ({ onSave, onCancel, initialPatientId, initialPatientName, templateId }: StructuredNoteFormProps) => {
    const [template, setTemplate] = useState<NoteTemplate | null>(null);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

    // General Info
    const [patientId, setPatientId] = useState(initialPatientId || '');
    const [patientName, setPatientName] = useState(initialPatientName || '');
    const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
    const [sessionNumber, setSessionNumber] = useState('1');

    // Fetch consecutive session number when patient changes
    useEffect(() => {
        const fetchSessionNumber = async () => {
            if (!patientId) {
                setSessionNumber('1');
                return;
            }
            try {
                const { count, error } = await supabase
                    .from('session_notes')
                    .select('*', { count: 'exact', head: true })
                    .eq('patient_id', patientId)
                    .is('deleted_at', null);

                if (!error && count !== null) {
                    setSessionNumber((count + 1).toString());
                } else {
                    setSessionNumber('1');
                }
            } catch (err) {
                console.error('Error fetching notes count:', err);
                setSessionNumber('1');
            }
        };

        fetchSessionNumber();
    }, [patientId]);

    // Mood
    const [moodRating, setMoodRating] = useState([50]);
    const [moodNotes, setMoodNotes] = useState('');

    // Bridge
    const [bridgeItems, setBridgeItems] = useState<{ text: string; completed: boolean }[]>([]);
    const [newBridgeItem, setNewBridgeItem] = useState('');
    const [bridgeNotes, setBridgeNotes] = useState('');

    // Mental Status Exam
    const [mentalStatus, setMentalStatus] = useState<Record<string, string[]> | null>(null);

    // Agenda
    const [agendaItems, setAgendaItems] = useState<{
        id: string;
        topic: string;
        situation: string;
        thoughts: string;
        emotions: string;
        interventions: string;
    }[]>([]);

    // Beliefs
    const [coreBeliefs, setCoreBeliefs] = useState('');
    const [alternativeBeliefs, setAlternativeBeliefs] = useState('');

    // Action Plan
    const [actionPlanItems, setActionPlanItems] = useState<string[]>([]);
    const [newActionPlanItem, setNewActionPlanItem] = useState('');

    // CIE-10 (NOM-024 INT-01)
    const [cie10, setCie10] = useState<{ code: string; description: string } | null>(null);
    const [diagnosticoPrincipal, setDiagnosticoPrincipal] = useState('');

    // Dynamic Sections State (for generic text areas)
    const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});

    // Load Template
    useEffect(() => {
        const fetchTemplate = async () => {
            if (!templateId) return;
            setIsLoadingTemplate(true);
            try {
                const { data, error } = await supabase
                    .from('note_templates')
                    .select('*')
                    .eq('id', templateId)
                    .single();
                
                if (data) {
                    setTemplate(data);
                    // Initialize dynamic fields
                    const initialFields: Record<string, string> = {};
                    data.sections.forEach((s: string) => {
                        if (['free_text', 'techniques', 'observations', 'goals', 'homework'].includes(s)) {
                            initialFields[s] = '';
                        }
                    });
                    setDynamicFields(initialFields);
                }
            } catch (err) {
                console.error('Error loading template:', err);
            } finally {
                setIsLoadingTemplate(false);
            }
        };

        fetchTemplate();
    }, [templateId]);

    const hasSection = (key: string) => !template || template.sections.includes(key);
    const getLabel = (key: string, defaultLabel: string) => template?.section_labels?.[key] || defaultLabel;


    // Handlers
    const handleAddBridgeItem = () => {
        if (newBridgeItem.trim()) {
            setBridgeItems([...bridgeItems, { text: newBridgeItem, completed: false }]);
            setNewBridgeItem('');
        }
    };

    const toggleBridgeItem = (index: number) => {
        const newItems = [...bridgeItems];
        newItems[index].completed = !newItems[index].completed;
        setBridgeItems(newItems);
    };

    const handleAddAgendaItem = () => {
        setAgendaItems([
            ...agendaItems,
            {
                id: Math.random().toString(36).substr(2, 9),
                topic: '',
                situation: '',
                thoughts: '',
                emotions: '',
                interventions: ''
            }
        ]);
    };

    const updateAgendaItem = (index: number, field: string, value: string) => {
        const newItems = [...agendaItems];
        (newItems[index] as any)[field] = value;
        setAgendaItems(newItems);
    };

    const handleAddActionPlanItem = () => {
        if (newActionPlanItem.trim()) {
            setActionPlanItems([...actionPlanItems, newActionPlanItem]);
            setNewActionPlanItem('');
        }
    };

    const handleSave = () => {
        const noteData = {
            patientId,
            patientName,
            date: sessionDate,
            sessionNumber,
            mood: { rating: moodRating[0], notes: moodNotes },
            bridge: { items: bridgeItems, notes: bridgeNotes },
            mentalStatus,
            agenda: agendaItems,
            beliefs: { core: coreBeliefs, alternative: alternativeBeliefs },
            actionPlan: actionPlanItems,
            cie10Code: cie10?.code || null,
            cie10Description: cie10?.description || null,
            diagnosticoPrincipal: diagnosticoPrincipal || null,
            createdAt: new Date().toISOString()
        };
        onSave(noteData);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex justify-end gap-2 mb-6">
                <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button onClick={handleSave} className="gap-2">
                    <Save className="h-4 w-4" />
                    Guardar Nota
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Header - Patient Info */}
                <div className="md:col-span-2 bg-red-50/50 p-6 rounded-2xl border border-red-100 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-red-900">Paciente</label>
                            <PatientAutocomplete
                                value={patientId}
                                onSelect={(id, name) => {
                                    setPatientId(id);
                                    setPatientName(name);
                                }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-red-900">Fecha</label>
                                <Input
                                    type="date"
                                    value={sessionDate}
                                    onChange={(e) => setSessionDate(e.target.value)}
                                    className="bg-white/50 border-red-200 focus:border-red-400 focus:ring-red-400"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-red-900">Sesión #</label>
                                <Input
                                    type="text"
                                    value={sessionNumber}
                                    readOnly
                                    className="bg-white/50 border-red-200 text-muted-foreground font-medium cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>

                    {/* CIE-10 Diagnóstico (NOM-024 INT-01) */}
                    <div className="space-y-3 pt-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                            🏥 Diagnóstico CIE-10 (NOM-024)
                        </label>
                        <div className="relative">
                            <CIE10Selector value={cie10} onChange={setCie10} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-red-700">Diagnóstico principal (texto libre)</label>
                            <input
                                type="text"
                                value={diagnosticoPrincipal}
                                onChange={(e) => setDiagnosticoPrincipal(e.target.value)}
                                placeholder="Ej: Trastorno de ansiedad generalizada con episodio depresivo leve..."
                                className="w-full text-sm rounded-md border border-red-200 bg-white/50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
                            />
                        </div>
                    </div>
                </div>

                {/* Mood Section */}
                {hasSection('mood') && (
                    <Card className="border-border shadow-sm">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-primary">{getLabel('mood', 'Estado de Ánimo')}</CardTitle>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{moodRating[0]}%</Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Slider
                                value={moodRating}
                                onValueChange={setMoodRating}
                                max={100}
                                step={1}
                                className="py-4"
                            />
                            <Textarea
                                placeholder="Notas sobre el estado de ánimo..."
                                value={moodNotes}
                                onChange={(e) => setMoodNotes(e.target.value)}
                                className="min-h-[80px]"
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Bridge Section */}
                {hasSection('bridge') && (
                    <Card className="border-border shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-primary">{getLabel('bridge', 'Puente Intersesión')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                {bridgeItems.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between group p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => toggleBridgeItem(index)}>
                                                {item.completed ? (
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </button>
                                            <span className={cn("text-sm", item.completed && "line-through text-muted-foreground")}>
                                                {item.text}
                                            </span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => setBridgeItems(bridgeItems.filter((_, i) => i !== index))}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Nueva tarea o tema pendiente..."
                                    value={newBridgeItem}
                                    onChange={(e) => setNewBridgeItem(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddBridgeItem()}
                                />
                                <Button variant="outline" size="icon" onClick={handleAddBridgeItem}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <Textarea
                                placeholder="Notas sobre el puente..."
                                value={bridgeNotes}
                                onChange={(e) => setBridgeNotes(e.target.value)}
                                className="h-full min-h-[80px] bg-white/50 border-purple-200"
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Mental Status Exam Section */}
                {hasSection('mental_status') && (
                    <MentalStatusSection
                        value={mentalStatus}
                        onChange={setMentalStatus}
                    />
                )}

                {/* Agenda Section */}
                {hasSection('agenda') && (
                    <Card className="border-border shadow-sm">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-primary">{getLabel('agenda', 'Agenda / Conceptualización')}</CardTitle>
                            <Button variant="outline" size="sm" onClick={handleAddAgendaItem} className="h-8 gap-1.5 font-bold">
                                <Plus className="h-3.5 w-3.5" /> Agregar Tema
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {agendaItems.map((item, index) => (
                                <div key={item.id} className="space-y-4 p-4 rounded-xl border border-border bg-muted/30 relative">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => setAgendaItems(agendaItems.filter(i => i.id !== item.id))}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">Tema / Problema</Label>
                                            <Input
                                                value={item.topic}
                                                onChange={(e) => updateAgendaItem(index, 'topic', e.target.value)}
                                                placeholder="¿De qué trata este punto?"
                                                className="bg-background h-9 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">Situación</Label>
                                            <Input
                                                value={item.situation}
                                                onChange={(e) => updateAgendaItem(index, 'situation', e.target.value)}
                                                placeholder="¿Qué pasó exactamente?"
                                                className="bg-background h-9 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">Pensamientos</Label>
                                            <Textarea
                                                value={item.thoughts}
                                                onChange={(e) => updateAgendaItem(index, 'thoughts', e.target.value)}
                                                placeholder="Cogniciones / Creencias"
                                                className="bg-background min-h-[60px] text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">Emociones</Label>
                                            <Input
                                                value={item.emotions}
                                                onChange={(e) => updateAgendaItem(index, 'emotions', e.target.value)}
                                                placeholder="Sentimientos e intensidad"
                                                className="bg-background h-9 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">Intervenciones / Reestructuración</Label>
                                        <Textarea
                                            value={item.interventions}
                                            onChange={(e) => updateAgendaItem(index, 'interventions', e.target.value)}
                                            placeholder="¿Qué técnicas se aplicaron?"
                                            className="bg-background min-h-[60px] text-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Beliefs Section */}
                {hasSection('beliefs') && (
                    <Card className="border-border shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-primary">{getLabel('beliefs', 'Creencias Nucleares')}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground">Creencias Identificadas</Label>
                                <Textarea
                                    value={coreBeliefs}
                                    onChange={(e) => setCoreBeliefs(e.target.value)}
                                    placeholder="Creencias nucleares o intermedias..."
                                    className="min-h-[100px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground">Creencias Alternativas</Label>
                                <Textarea
                                    value={alternativeBeliefs}
                                    onChange={(e) => setAlternativeBeliefs(e.target.value)}
                                    placeholder="Nuevas perspectivas desarrolladas..."
                                    className="min-h-[100px]"
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Dynamic Text Areas (Generic sections from template) */}
                {template?.sections.filter(s => ['free_text', 'techniques', 'observations', 'goals', 'homework'].includes(s)).map(sKey => (
                    <Card key={sKey} className="border-border shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-primary">{getLabel(sKey, sKey)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={dynamicFields[sKey] || ''}
                                onChange={(e) => setDynamicFields({ ...dynamicFields, [sKey]: e.target.value })}
                                placeholder={`Escribe aquí...`}
                                className="min-h-[120px]"
                            />
                        </CardContent>
                    </Card>
                ))}

                {/* Action Plan Section */}
                {hasSection('action_plan') && (
                    <Card className="border-border shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-primary">{getLabel('action_plan', 'Plan de Acción / Tareas')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                {actionPlanItems.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 group">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            <span className="text-sm font-medium text-emerald-900">{item}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => setActionPlanItems(actionPlanItems.filter((_, i) => i !== index))}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Siguiente paso, tarea o recomendación..."
                                    value={newActionPlanItem}
                                    onChange={(e) => setNewActionPlanItem(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddActionPlanItem()}
                                />
                                <Button variant="zen" size="icon" onClick={handleAddActionPlanItem}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* CIE-10 Selector */}
                <Card className="border-border shadow-sm bg-muted/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                            <Save className="h-4 w-4" /> Diagnóstico y Clasificación (NOM-024)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">Búsqueda CIE-10</Label>
                            <CIE10Selector onSelect={setCie10} />
                            {cie10 && (
                                <div className="mt-2 p-3 bg-white rounded-lg border border-primary/20 flex items-center justify-between">
                                    <div>
                                        <span className="font-bold text-primary mr-2">{cie10.code}</span>
                                        <span className="text-sm text-muted-foreground">{cie10.description}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCie10(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">Impresión Diagnóstica</Label>
                            <Textarea
                                placeholder="Detalles específicos del diagnóstico..."
                                value={diagnosticoPrincipal}
                                onChange={(e) => setDiagnosticoPrincipal(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border mt-8">
                <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button variant="zen" onClick={handleSave} className="gap-2">
                    <Save className="h-4 w-4" /> Guardar Nota
                </Button>
            </div>
        </div>
    );
};

export default StructuredNoteForm;
