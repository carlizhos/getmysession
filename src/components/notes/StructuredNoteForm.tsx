import { useState } from 'react';
import CIE10Selector from '@/components/notes/CIE10Selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
}

const StructuredNoteForm = ({ onSave, onCancel, initialPatientId, initialPatientName }: StructuredNoteFormProps) => {
    // General Info
    const [patientId, setPatientId] = useState(initialPatientId || '');
    const [patientName, setPatientName] = useState(initialPatientName || '');
    const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
    const [sessionNumber, setSessionNumber] = useState('1');

    // Mood
    const [moodRating, setMoodRating] = useState([50]);
    const [moodNotes, setMoodNotes] = useState('');

    // Bridge
    const [bridgeItems, setBridgeItems] = useState<{ text: string; completed: boolean }[]>([
        { text: 'Higiene del sueño', completed: true },
        { text: 'Lista de pensamientos automáticos', completed: true }
    ]);
    const [newBridgeItem, setNewBridgeItem] = useState('');
    const [bridgeNotes, setBridgeNotes] = useState('');

    // Agenda
    const [agendaItems, setAgendaItems] = useState<{
        id: string;
        topic: string;
        situation: string;
        thoughts: string;
        emotions: string;
        interventions: string;
    }[]>([
        {
            id: '1',
            topic: 'Laboral',
            situation: 'Jefe le pregunta como va "Tengo que terminar ya"',
            thoughts: 'Estrés y agobio -> Procrastinar',
            emotions: 'Ansiedad (8/10)',
            interventions: 'Reestructuración cognitiva + Psicoeducación distorsiones + Técnica manejo estrés'
        }
    ]);

    // Beliefs
    const [coreBeliefs, setCoreBeliefs] = useState('');
    const [alternativeBeliefs, setAlternativeBeliefs] = useState('');

    // Action Plan
    const [actionPlanItems, setActionPlanItems] = useState<string[]>([]);
    const [newActionPlanItem, setNewActionPlanItem] = useState('');

    // CIE-10 (NOM-024 INT-01)
    const [cie10, setCie10] = useState<{ code: string; description: string } | null>(null);
    const [diagnosticoPrincipal, setDiagnosticoPrincipal] = useState('');

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
                                    type="number"
                                    value={sessionNumber}
                                    onChange={(e) => setSessionNumber(e.target.value)}
                                    className="bg-white/50 border-red-200 focus:border-red-400 focus:ring-red-400"
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

                {/* Mood Tracker */}
                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
                    <label className="text-sm font-medium text-blue-900">Estado de ánimo (1-100)</label>
                    <div className="flex items-center gap-4">
                        <Slider
                            value={moodRating}
                            onValueChange={setMoodRating}
                            max={100}
                            step={1}
                            className="flex-1"
                        />
                        <span className="font-bold text-blue-700 w-8">{moodRating[0]}</span>
                    </div>
                    <Textarea
                        placeholder="Cómo se siente el paciente..."
                        value={moodNotes}
                        onChange={(e) => setMoodNotes(e.target.value)}
                        className="bg-white/50 border-blue-200 focus:border-blue-400 focus:ring-blue-400 min-h-[80px]"
                    />
                </div>
            </div>

            {/* Bridge Section */}
            <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 space-y-4">
                <h3 className="font-medium text-purple-900 flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">Puente</Badge>
                    Sesión pasada y tarea
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className="text-sm text-purple-800">Revisión de Tareas</label>
                        <div className="space-y-2">
                            {bridgeItems.map((item, index) => (
                                <div key={index} className="flex items-center gap-2 group">
                                    <button onClick={() => toggleBridgeItem(index)} className="text-purple-600 hover:text-purple-800">
                                        {item.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                    </button>
                                    <span className={cn("flex-1 text-sm", item.completed && "line-through text-muted-foreground")}>
                                        {item.text}
                                    </span>
                                    <button
                                        onClick={() => {
                                            const newItems = bridgeItems.filter((_, i) => i !== index);
                                            setBridgeItems(newItems);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            <div className="flex gap-2 mt-2">
                                <Input
                                    placeholder="Nueva tarea revisada..."
                                    value={newBridgeItem}
                                    onChange={(e) => setNewBridgeItem(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddBridgeItem()}
                                    className="bg-white/50 border-purple-200"
                                />
                                <Button size="icon" variant="ghost" onClick={handleAddBridgeItem} className="text-purple-600 hover:bg-purple-100">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-purple-800">Notas del Puente</label>
                        <Textarea
                            placeholder="Comentarios sobre la sesión anterior..."
                            value={bridgeNotes}
                            onChange={(e) => setBridgeNotes(e.target.value)}
                            className="h-full min-h-[120px] bg-white/50 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                        />
                    </div>
                </div>
            </div>

            {/* Agenda Section */}
            <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium text-orange-900 flex items-center gap-2">
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">Agenda</Badge>
                        Situaciones, pensamientos, emociones, conductas e intervenciones
                    </h3>
                    <Button size="sm" variant="outline" onClick={handleAddAgendaItem} className="text-orange-700 border-orange-200 hover:bg-orange-100">
                        <Plus className="h-4 w-4 mr-2" /> Agregar Item
                    </Button>
                </div>

                <div className="space-y-4">
                    {agendaItems.map((item, index) => (
                        <div key={item.id} className="bg-white/60 p-4 rounded-xl border border-orange-200 relative group transition-all hover:shadow-sm">
                            <button
                                onClick={() => {
                                    const newItems = agendaItems.filter((_, i) => i !== index);
                                    setAgendaItems(newItems);
                                }}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            <div className="grid md:grid-cols-12 gap-4">
                                <div className="md:col-span-1 flex items-center justify-center">
                                    <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold border border-orange-200">
                                        {index + 1}
                                    </div>
                                </div>

                                <div className="md:col-span-11 grid gap-4">
                                    <Input
                                        placeholder="Tema / Título (Ej: Laboral)"
                                        value={item.topic}
                                        onChange={(e) => updateAgendaItem(index, 'topic', e.target.value)}
                                        className="font-medium border-orange-200 focus:border-orange-400"
                                    />

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <Textarea
                                            placeholder="Situación / Activador..."
                                            value={item.situation}
                                            onChange={(e) => updateAgendaItem(index, 'situation', e.target.value)}
                                            className="min-h-[80px] text-sm border-orange-200 focus:border-orange-400"
                                        />
                                        <Textarea
                                            placeholder="Pensamientos y Emociones..."
                                            value={item.thoughts}
                                            onChange={(e) => updateAgendaItem(index, 'thoughts', e.target.value)}
                                            className="min-h-[80px] text-sm border-orange-200 focus:border-orange-400"
                                        />
                                    </div>

                                    <Textarea
                                        placeholder="Intervenciones y Técnicas Aplicadas..."
                                        value={item.interventions}
                                        onChange={(e) => updateAgendaItem(index, 'interventions', e.target.value)}
                                        className="min-h-[60px] text-sm bg-orange-50/30 border-orange-200 focus:border-orange-400"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Beliefs Section */}
            <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 space-y-4">
                <h3 className="font-medium text-amber-900 flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">Creencias</Badge>
                    Nucleares y Alternativas
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-amber-800">Creencias Limitantes / Nucleares</label>
                        <Textarea
                            placeholder="Escribe las creencias identificadas..."
                            value={coreBeliefs}
                            onChange={(e) => setCoreBeliefs(e.target.value)}
                            className="min-h-[120px] bg-white/50 border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-amber-800">Creencias Alternativas / Adaptativas</label>
                        <Textarea
                            placeholder="Reestructuración y nuevas creencias..."
                            value={alternativeBeliefs}
                            onChange={(e) => setAlternativeBeliefs(e.target.value)}
                            className="min-h-[120px] bg-white/50 border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                        />
                    </div>
                </div>
            </div>

            {/* Action Plan Section */}
            <div className="bg-pink-50/50 p-6 rounded-2xl border border-pink-100 space-y-4">
                <h3 className="font-medium text-pink-900 flex items-center gap-2 px-1">
                    Tareas y Recomendaciones
                </h3>

                <div className="space-y-3">
                    {actionPlanItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 bg-white/60 p-3 rounded-lg border border-pink-200">
                            <div className="h-2 w-2 rounded-full bg-pink-400" />
                            <span className="flex-1 text-sm">{item}</span>
                            <button
                                onClick={() => {
                                    const newItems = actionPlanItems.filter((_, i) => i !== index);
                                    setActionPlanItems(newItems);
                                }}
                                className="text-pink-400 hover:text-pink-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}

                    <div className="flex gap-2">
                        <Input
                            placeholder="Nueva tarea o recomendación..."
                            value={newActionPlanItem}
                            onChange={(e) => setNewActionPlanItem(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddActionPlanItem()}
                            className="bg-white/50 border-pink-200 focus:border-pink-400"
                        />
                        <Button onClick={handleAddActionPlanItem} className="bg-pink-500 hover:bg-pink-600 text-white border-none">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StructuredNoteForm;
