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
import { useOrganization } from '@/hooks/useOrganization';
import { logActivity } from '@/lib/activityLogger';
import { encryptText } from '@/lib/encryption';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

interface Patient {
    id: string;
    name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    dateOfBirth?: string;
    notes: string;
    tags: string[];
    curp?: string;
    gender?: string;
    occupation?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    rfc?: string;
    tax_name?: string;
    tax_zip_code?: string;
    tax_regime?: string;
    cfdi_use?: string;
}

interface NewPatientDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPatientAdded?: () => void;
    editingPatient?: Patient | null;
}

const CURP_REGEX = /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/;

const patientSchema = z.object({
    name: z.string().min(1, 'El nombre completo es requerido'),
    email: z.string().min(1, 'El correo es requerido').email('Correo electrónico inválido'),
    phone: z.string().min(10, 'Mínimo 10 dígitos'),
    dateOfBirth: z.string().min(1, 'Fecha de nacimiento requerida'),
    curp: z.string().optional().refine(val => !val || CURP_REGEX.test(val.toUpperCase()), 'Formato inválido (18 caracteres)'),
    gender: z.string().optional(),
    occupation: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    notes: z.string().optional(),
    rfc: z.string().optional(),
    taxName: z.string().optional(),
    taxZipCode: z.string().optional(),
    taxRegime: z.string().optional(),
    cfdiUse: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

const NewPatientDialog = ({ open, onOpenChange, onPatientAdded, editingPatient }: NewPatientDialogProps) => {
    const { organization } = useOrganization();
    const isEditing = !!editingPatient;

    const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<PatientFormValues>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            name: '', email: '', phone: '', dateOfBirth: '', curp: '', gender: '', occupation: '',
            emergencyContactName: '', emergencyContactPhone: '', notes: '',
            rfc: '', taxName: '', taxZipCode: '', taxRegime: '', cfdiUse: '',
        }
    });

    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pre-llenar formulario cuando se edita
    useEffect(() => {
        if (editingPatient) {
            reset({
                name: editingPatient.name || '',
                email: editingPatient.email || '',
                phone: editingPatient.phone || '',
                dateOfBirth: editingPatient.date_of_birth || '',
                curp: editingPatient.curp || '',
                gender: editingPatient.gender || '',
                occupation: editingPatient.occupation || '',
                emergencyContactName: editingPatient.emergency_contact_name || '',
                emergencyContactPhone: editingPatient.emergency_contact_phone || '',
                notes: editingPatient.notes || '',
                rfc: editingPatient.rfc || '',
                taxName: editingPatient.tax_name || '',
                taxZipCode: editingPatient.tax_zip_code || '',
                taxRegime: editingPatient.tax_regime || '',
                cfdiUse: editingPatient.cfdi_use || '',
            });
            setTags(editingPatient.tags || []);
        } else {
            reset({
                name: '', email: '', phone: '', dateOfBirth: '',
                curp: '', gender: '', occupation: '',
                emergencyContactName: '', emergencyContactPhone: '', notes: '',
                rfc: '', taxName: '', taxZipCode: '', taxRegime: '', cfdiUse: '',
            });
            setTags([]);
        }
        setTagInput('');
    }, [editingPatient, open, reset]);

    const onSubmitForm = async (data: PatientFormValues) => {
        setIsSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const basePayload = {
                name: data.name,
                email: data.email,
                phone: data.phone,
                date_of_birth: data.dateOfBirth,
                curp: encryptText(data.curp?.toUpperCase() || null),
                gender: data.gender || null,
                occupation: data.occupation || null,
                emergency_contact_name: data.emergencyContactName || null,
                emergency_contact_phone: data.emergencyContactPhone || null,
                tags: tags,
                user_id: user?.id ?? null,
                organization_id: organization?.id,
            };

            const clinicalPayload = {
                notes: data.notes,
                organization_id: organization?.id,
            };

            const fiscalPayload = {
                rfc: encryptText(data.rfc?.toUpperCase() || null),
                tax_name: data.taxName?.toUpperCase() || null,
                tax_zip_code: data.taxZipCode || null,
                tax_regime: data.taxRegime || null,
                cfdi_use: data.cfdiUse || null,
                organization_id: organization?.id,
            };

            if (isEditing && editingPatient) {
                const { error: err1 } = await supabase
                    .from('patients')
                    .update(basePayload)
                    .eq('id', editingPatient.id)
                    .eq('organization_id', organization?.id);
                if (err1) throw err1;

                const { error: err2 } = await supabase
                    .from('patient_clinical_data')
                    .upsert({ patient_id: editingPatient.id, ...clinicalPayload });
                if (err2) throw err2;

                const { error: err3 } = await supabase
                    .from('patient_fiscal_data')
                    .upsert({ patient_id: editingPatient.id, ...fiscalPayload });
                if (err3) throw err3;

                toast.success('Paciente actualizado');
            } else {
                const { data: insertedPatient, error: err1 } = await supabase
                    .from('patients')
                    .insert([basePayload])
                    .select()
                    .single();
                if (err1 || !insertedPatient) throw err1;

                if (clinicalPayload.notes) {
                    await supabase.from('patient_clinical_data').insert({ patient_id: insertedPatient.id, ...clinicalPayload });
                }

                if (fiscalPayload.tax_name || fiscalPayload.rfc || fiscalPayload.tax_zip_code) {
                    await supabase.from('patient_fiscal_data').insert({ patient_id: insertedPatient.id, ...fiscalPayload });
                }

                toast.success('Paciente agregado exitosamente');

                await logActivity({
                    profile_id: user!.id,
                    type: 'patient_created',
                    title: 'Nuevo Paciente Registrado',
                    description: `Has registrado a ${data.name} en tu expediente clínico.`,
                    organization_id: organization?.id,
                });
            }

            if (onPatientAdded) onPatientAdded();
            onOpenChange(false);
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error al guardar paciente:', err);
            toast.error('Error: ' + err.message);
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

    const curpVal = watch('curp');
    const isCurpValid = !curpVal || CURP_REGEX.test(curpVal.toUpperCase());

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
                <div className="px-6 py-4 border-b">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}</DialogTitle>
                        <DialogDescription>
                            {isEditing ? 'Modifica los datos del paciente' : 'Agrega un nuevo paciente a tu expediente clínico'}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit(onSubmitForm)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                        {/* ── Datos generales ──────────────────────────────── */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Datos generales</p>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nombre completo *</Label>
                                    <Input
                                        id="name"
                                        {...register('name')}
                                        placeholder="Ej: María López García"
                                        disabled={isSubmitting}
                                        className={errors.name ? 'border-red-500' : ''}
                                    />
                                    {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Correo electrónico *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            {...register('email')}
                                            placeholder="ejemplo@correo.com"
                                            disabled={isSubmitting}
                                            className={errors.email ? 'border-red-500' : ''}
                                        />
                                        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Teléfono *</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            {...register('phone')}
                                            placeholder="+52 55 1234 5678"
                                            disabled={isSubmitting}
                                            className={errors.phone ? 'border-red-500' : ''}
                                        />
                                        {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dateOfBirth">Fecha de nacimiento *</Label>
                                        <Input
                                            id="dateOfBirth"
                                            type="date"
                                            {...register('dateOfBirth')}
                                            onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                                            max={new Date().toISOString().split('T')[0]}
                                            min={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 90); return d.toISOString().split('T')[0]; })()}
                                            disabled={isSubmitting}
                                            className={errors.dateOfBirth ? 'border-red-500' : ''}
                                        />
                                        {errors.dateOfBirth && <p className="text-xs text-red-500">{errors.dateOfBirth.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="gender">Género</Label>
                                        <Select
                                            value={watch('gender')}
                                            onValueChange={(v) => setValue('gender', v)}
                                        >
                                            <SelectTrigger id="gender">
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

                                <div className="space-y-2">
                                    <Label htmlFor="occupation">Ocupación</Label>
                                    <Input
                                        id="occupation"
                                        {...register('occupation')}
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
                                    {...register('curp', {
                                        onChange: (e) => setValue('curp', e.target.value.toUpperCase())
                                    })}
                                    placeholder="LOMP800101MDFGZR02"
                                    maxLength={18}
                                    className={errors.curp ? 'border-destructive focus-visible:ring-destructive' : ''}
                                    disabled={isSubmitting}
                                />
                                {errors.curp && (
                                    <p className="text-xs text-destructive">{errors.curp.message}</p>
                                )}
                                {curpVal && isCurpValid && (
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
                                        {...register('emergencyContactName')}
                                        placeholder="Nombre del contacto"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emergencyContactPhone">Teléfono</Label>
                                    <Input
                                        id="emergencyContactPhone"
                                        type="tel"
                                        {...register('emergencyContactPhone')}
                                        placeholder="+52 55 1234 5678"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── CFDI 4.0 (Facturación) ────────────────────────── */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Información Fiscal (CFDI 4.0)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="rfc">RFC</Label>
                                    <Input
                                        id="rfc"
                                        {...register('rfc', {
                                            onChange: (e) => setValue('rfc', e.target.value.toUpperCase())
                                        })}
                                        placeholder="XAXX010101000"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="taxName">Razón Social</Label>
                                    <Input
                                        id="taxName"
                                        {...register('taxName', {
                                            onChange: (e) => setValue('taxName', e.target.value.toUpperCase())
                                        })}
                                        placeholder="Ej: Juan Pérez López"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="taxZipCode">Código Postal Fiscal</Label>
                                    <Input
                                        id="taxZipCode"
                                        {...register('taxZipCode')}
                                        placeholder="Ej: 06000"
                                        maxLength={5}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cfdiUse">Uso de CFDI</Label>
                                    <Select
                                        value={watch('cfdiUse')}
                                        onValueChange={(v) => setValue('cfdiUse', v)}
                                    >
                                        <SelectTrigger id="cfdiUse">
                                            <SelectValue placeholder="Selecciona" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="D01">D01 - Honorarios médicos, dentales y gastos hospitalarios</SelectItem>
                                            <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                                            <SelectItem value="P01">P01 - Por definir</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="taxRegime">Régimen Fiscal</Label>
                                    <Select
                                        value={watch('taxRegime')}
                                        onValueChange={(v) => setValue('taxRegime', v)}
                                    >
                                        <SelectTrigger id="taxRegime">
                                            <SelectValue placeholder="Selecciona" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="605">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</SelectItem>
                                            <SelectItem value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</SelectItem>
                                            <SelectItem value="601">601 - General de Ley Personas Morales</SelectItem>
                                            <SelectItem value="616">616 - Sin obligaciones fiscales</SelectItem>
                                            <SelectItem value="626">626 - Régimen Simplificado de Confianza</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                                {...register('notes')}
                                placeholder="Información adicional sobre el paciente..."
                                rows={3}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t bg-background">
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="zen" disabled={isSubmitting}>
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
