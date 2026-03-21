import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { X, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface NewPatientDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPatientAdded?: () => void;
    editingPatient?: {
        id: string;
        name: string;
        email: string;
        phone: string;
        date_of_birth: string;
        notes: string;
        tags: string[];
        curp?: string;
        sex?: string;
        occupation?: string;
        emergency_contact_name?: string;
        emergency_contact_phone?: string;
    } | null;
}

// Validación básica del formato CURP
const CURP_REGEX = /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/;

const validateCURP = (curp: string): boolean => {
    if (!curp) return true; // Opcional
    return CURP_REGEX.test(curp.toUpperCase());
};

const NewPatientDialog = ({ open, onOpenChange, onPatientAdded, editingPatient }: NewPatientDialogProps) => {
    const isEditing = !!editingPatient;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        curp: '',
        sex: '',
        occupation: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        notes: '',
    });
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [curpError, setCurpError] = useState('');

    // Pre-llenar formulario cuando se edita
    useEffect(() => {
        if (editingPatient) {
            setFormData({
                name: editingPatient.name || '',
                email: editingPatient.email || '',
                phone: editingPatient.phone || '',
                dateOfBirth: editingPatient.date_of_birth || '',
                curp: editingPatient.curp || '',
                sex: editingPatient.sex || '',
                occupation: editingPatient.occupation || '',
                emergencyContactName: editingPatient.emergency_contact_name || '',
                emergencyContactPhone: editingPatient.emergency_contact_phone || '',
                notes: editingPatient.notes || '',
            });
            setTags(editingPatient.tags || []);
        } else {
            setFormData({
                name: '', email: '', phone: '', dateOfBirth: '',
                curp: '', sex: '', occupation: '',
                emergencyContactName: '', emergencyContactPhone: '', notes: '',
            });
            setTags([]);
        }
        setTagInput('');
        setCurpError('');
    }, [editingPatient, open]);

    const handleCURPChange = (val: string) => {
        const upper = val.toUpperCase();
        setFormData({ ...formData, curp: upper });
        if (upper && !validateCURP(upper)) {
            setCurpError('Formato inválido (18 caracteres: 4 letras, 6 dígitos, sexo, estado, 3 letras, 2 alfanuméricos)');
        } else {
            setCurpError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.phone || !formData.dateOfBirth) {
            toast.error('Por favor completa todos los campos requeridos');
            return;
        }

        if (formData.curp && !validateCURP(formData.curp)) {
            toast.error('El CURP ingresado no tiene un formato válido');
            return;
        }

        setIsSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                date_of_birth: formData.dateOfBirth,
                curp: formData.curp || null,
                sex: formData.sex || null,
                occupation: formData.occupation || null,
                emergency_contact_name: formData.emergencyContactName || null,
                emergency_contact_phone: formData.emergencyContactPhone || null,
                notes: formData.notes,
                tags: tags,
                user_id: user?.id ?? null,
            };

            if (isEditing && editingPatient) {
                const { error } = await supabase
                    .from('patients')
                    .update(payload)
                    .eq('id', editingPatient.id);
                if (error) throw error;
                toast.success('Paciente actualizado');
            } else {
                const { error } = await supabase
                    .from('patients')
                    .insert([payload])
                    .select();
                if (error) throw error;
                toast.success('Paciente agregado exitosamente');
            }

            if (onPatientAdded) onPatientAdded();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error al guardar paciente:', error);
            toast.error('Error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
                {/* Header fijo */}
                <div className="px-6 py-4 border-b">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}</DialogTitle>
                        <DialogDescription>
                            {isEditing ? 'Modifica los datos del paciente' : 'Agrega un nuevo paciente a tu expediente clínico'}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Cuerpo con scroll */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

                        {/* ── Datos generales ──────────────────────────────── */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Datos generales</p>
                            <div className="space-y-4">
                                {/* Nombre completo */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nombre completo *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: María López García"
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>

                                {/* Email y Teléfono */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Correo electrónico *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="ejemplo@correo.com"
                                            required
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Teléfono *</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="+52 55 1234 5678"
                                            required
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                {/* Fecha de nacimiento y Sexo */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dateOfBirth">Fecha de nacimiento *</Label>
                                        <Input
                                            id="dateOfBirth"
                                            type="date"
                                            value={formData.dateOfBirth}
                                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                            onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                                            max={new Date().toISOString().split('T')[0]}
                                            min={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 90); return d.toISOString().split('T')[0]; })()}
                                            required
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sex">Sexo</Label>
                                        <Select
                                            value={formData.sex}
                                            onValueChange={(v) => setFormData({ ...formData, sex: v })}
                                        >
                                            <SelectTrigger id="sex">
                                                <SelectValue placeholder="Selecciona" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="F">Femenino</SelectItem>
                                                <SelectItem value="M">Masculino</SelectItem>
                                                <SelectItem value="otro">Prefiero no decirlo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Ocupación */}
                                <div className="space-y-2">
                                    <Label htmlFor="occupation">Ocupación</Label>
                                    <Input
                                        id="occupation"
                                        value={formData.occupation}
                                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                                        placeholder="Ej: Docente, estudiante, comerciante..."
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── CURP (NOM-024) ────────────────────────────────── */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Identificación oficial (NOM-024)
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="curp">
                                    CURP
                                    <span className="ml-2 text-xs text-muted-foreground font-normal">— 18 caracteres</span>
                                </Label>
                                <Input
                                    id="curp"
                                    value={formData.curp}
                                    onChange={(e) => handleCURPChange(e.target.value)}
                                    placeholder="LOMP800101MDFGZR02"
                                    maxLength={18}
                                    className={curpError ? 'border-destructive focus-visible:ring-destructive' : ''}
                                    disabled={isSubmitting}
                                />
                                {curpError && (
                                    <p className="text-xs text-destructive">{curpError}</p>
                                )}
                                {formData.curp && !curpError && (
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <ShieldCheck className="h-3 w-3" /> CURP válido
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Requerido por NOM-024-SSA3-2012 para identificación en el expediente clínico.
                                </p>
                            </div>
                        </div>

                        {/* ── Contacto de emergencia ────────────────────────── */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contacto de emergencia</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="emergencyContactName">Nombre</Label>
                                    <Input
                                        id="emergencyContactName"
                                        value={formData.emergencyContactName}
                                        onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                                        placeholder="Nombre del contacto"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emergencyContactPhone">Teléfono</Label>
                                    <Input
                                        id="emergencyContactPhone"
                                        type="tel"
                                        value={formData.emergencyContactPhone}
                                        onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                                        placeholder="+52 55 1234 5678"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Etiquetas ─────────────────────────────────────── */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Etiquetas</p>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        id="tags"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Agregar etiqueta (presiona Enter)"
                                        disabled={isSubmitting}
                                    />
                                    <Button type="button" variant="outline" onClick={addTag} disabled={isSubmitting}>
                                        Agregar
                                    </Button>
                                </div>
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="gap-1">
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTag(tag)}
                                                    className="ml-1 hover:text-destructive"
                                                    disabled={isSubmitting}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Notas ────────────────────────────────────────── */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Notas internas</p>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Información adicional sobre el paciente..."
                                rows={3}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    {/* Footer fijo */}
                    <div className="px-6 py-4 border-t bg-background">
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="zen" disabled={isSubmitting || !!curpError}>
                                {isSubmitting
                                    ? (isEditing ? 'Guardando...' : 'Agregando...')
                                    : (isEditing ? 'Guardar cambios' : 'Guardar Paciente')}
                            </Button>
                        </DialogFooter>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default NewPatientDialog;
