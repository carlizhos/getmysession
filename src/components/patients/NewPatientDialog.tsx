import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { X, ShieldCheck, User, ShieldAlert, Receipt, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/hooks/useOrganization';
import { logActivity } from '@/lib/activityLogger';
import { encryptText } from '@/lib/encryption';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PhoneInput } from '@/components/ui/PhoneInput';

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
    phone: z.string().refine(val => val.replace(/\D/g, '').length >= 7, 'Número telefónico inválido'),
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
                notes: encryptText(data.notes || null),
            };

            const fiscalPayload = {
                rfc: data.rfc?.toUpperCase() || null,
                tax_name: data.taxName?.toUpperCase() || null,
                tax_zip_code: data.taxZipCode || null,
                tax_regime: data.taxRegime || null,
                cfdi_use: data.cfdiUse || null,
            };

            if (isEditing && editingPatient) {
                const { error: updateErr } = await supabase
                    .from('patients')
                    .update(basePayload)
                    .eq('id', editingPatient.id);

                if (updateErr) throw updateErr;

                await supabase.from('patient_clinical_data').upsert({
                    patient_id: editingPatient.id,
                    ...clinicalPayload
                }, { onConflict: 'patient_id' });

                await supabase.from('patient_fiscal_data').upsert({
                    patient_id: editingPatient.id,
                    ...fiscalPayload
                }, { onConflict: 'patient_id' });

                toast.success('Paciente actualizado exitosamente');
            } else {
                const { data: insertedPatient, error: insertErr } = await supabase
                    .from('patients')
                    .insert(basePayload)
                    .select()
                    .single();

                if (insertErr) throw insertErr;

                if (insertedPatient && clinicalPayload.notes) {
                    await supabase.from('patient_clinical_data').insert({ patient_id: insertedPatient.id, ...clinicalPayload });
                }

                if (insertedPatient && (fiscalPayload.tax_name || fiscalPayload.rfc || fiscalPayload.tax_zip_code)) {
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
            <DialogContent className="max-w-3xl sm:max-w-3xl h-[85vh] p-0 flex flex-col gap-0 overflow-hidden rounded-2xl">
                <div className="px-6 py-4 border-b bg-card">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">{isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}</DialogTitle>
                        <DialogDescription>
                            {isEditing ? 'Modifica los datos del expediente clínico' : 'Agrega un nuevo expediente clínico cumpliendo con la NOM-024'}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit(onSubmitForm)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <Tabs defaultValue="generales" className="flex-1 flex flex-col min-h-0">
                        <div className="px-6 pt-3 pb-2 border-b bg-muted/20">
                            <TabsList className="grid grid-cols-4 w-full h-10 p-1 bg-muted/50 rounded-xl">
                                <TabsTrigger value="generales" className="gap-1.5 text-xs font-bold rounded-lg">
                                    <User className="h-3.5 w-3.5" />
                                    <span>Generales</span>
                                </TabsTrigger>
                                <TabsTrigger value="emergencia" className="gap-1.5 text-xs font-bold rounded-lg">
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    <span>Emergencia</span>
                                </TabsTrigger>
                                <TabsTrigger value="fiscales" className="gap-1.5 text-xs font-bold rounded-lg">
                                    <Receipt className="h-3.5 w-3.5" />
                                    <span>Facturación</span>
                                </TabsTrigger>
                                <TabsTrigger value="notas" className="gap-1.5 text-xs font-bold rounded-lg">
                                    <FileText className="h-3.5 w-3.5" />
                                    <span>Notas</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {/* TAB 1: DATOS GENERALES */}
                            <TabsContent value="generales" className="mt-0 space-y-4 focus-visible:outline-none">
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Teléfono (WhatsApp) *</Label>
                                    <PhoneInput
                                        id="phone"
                                        value={watch('phone')}
                                        onChange={(fullFormatted) => setValue('phone', fullFormatted, { shouldValidate: true })}
                                        disabled={isSubmitting}
                                        error={!!errors.phone}
                                    />
                                    {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    <div className="space-y-2">
                                        <Label htmlFor="occupation">Ocupación</Label>
                                        <Input
                                            id="occupation"
                                            {...register('occupation')}
                                            placeholder="Ej: Docente, estudiante..."
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="curp" className="flex items-center gap-1.5">
                                        <ShieldCheck className="h-4 w-4 text-primary" /> CURP (NOM-024)
                                        <span className="ml-auto text-xs text-muted-foreground font-normal">18 caracteres</span>
                                    </Label>
                                    <Input
                                        id="curp"
                                        {...register('curp', {
                                            onChange: (e) => setValue('curp', e.target.value.toUpperCase())
                                        })}
                                        placeholder="LOMP800101MDFGZR02"
                                        maxLength={18}
                                        className={errors.curp ? 'border-destructive' : ''}
                                        disabled={isSubmitting}
                                    />
                                    {errors.curp && <p className="text-xs text-destructive">{errors.curp.message}</p>}
                                    {curpVal && isCurpValid && (
                                        <p className="text-xs text-emerald-600 flex items-center gap-1">
                                            <ShieldCheck className="h-3 w-3" /> CURP válido según norma NOM-024-SSA3-2012
                                        </p>
                                    )}
                                </div>

                                {/* Etiquetas */}
                                <div className="space-y-2 pt-1">
                                    <Label htmlFor="tag-input">Etiquetas / Diagnósticos iniciales</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="tag-input"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Escribe una etiqueta y presiona Enter..."
                                            disabled={isSubmitting}
                                        />
                                        <Button type="button" variant="outline" onClick={addTag} disabled={isSubmitting || !tagInput.trim()}>
                                            Agregar
                                        </Button>
                                    </div>
                                    {tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-2">
                                            {tags.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="gap-1 px-2.5 py-1 text-xs font-semibold">
                                                    {tag}
                                                    <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-muted-foreground hover:text-foreground">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* TAB 2: CONTACTO DE EMERGENCIA */}
                            <TabsContent value="emergencia" className="mt-0 space-y-4 focus-visible:outline-none">
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                        <ShieldAlert className="h-4 w-4" /> Contacto en Caso de Urgencia
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Información de contacto familiar o tutor responsable requerida para el expediente clínico NOM-024.
                                    </p>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="emergencyContactName">Nombre del contacto de emergencia</Label>
                                        <Input
                                            id="emergencyContactName"
                                            {...register('emergencyContactName')}
                                            placeholder="Ej: Roberto López (Padre / Tutor)"
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="emergencyContactPhone">Teléfono de Emergencia (WhatsApp)</Label>
                                        <PhoneInput
                                            id="emergencyContactPhone"
                                            value={watch('emergencyContactPhone')}
                                            onChange={(fullFormatted) => setValue('emergencyContactPhone', fullFormatted)}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB 3: DATOS FISCALES (CFDI 4.0) */}
                            <TabsContent value="fiscales" className="mt-0 space-y-4 focus-visible:outline-none">
                                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
                                    <p className="text-xs font-bold flex items-center gap-1.5">
                                        <Receipt className="h-4 w-4 text-primary" /> Información de Facturación CFDI 4.0
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Datos necesarios si el paciente requiere factura electrónica de sus honorarios médicos/psicológicos.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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
                                        <Label htmlFor="taxName">Razón Social / Nombre Fiscal</Label>
                                        <Input
                                            id="taxName"
                                            {...register('taxName', {
                                                onChange: (e) => setValue('taxName', e.target.value.toUpperCase())
                                            })}
                                            placeholder="Ej: JUAN PÉREZ LÓPEZ"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="taxZipCode">Código Postal Fiscal</Label>
                                        <Input
                                            id="taxZipCode"
                                            {...register('taxZipCode')}
                                            placeholder="06000"
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
                                    <div className="space-y-2 col-span-1 sm:col-span-2">
                                        <Label htmlFor="taxRegime">Régimen Fiscal</Label>
                                        <Select
                                            value={watch('taxRegime')}
                                            onValueChange={(v) => setValue('taxRegime', v)}
                                        >
                                            <SelectTrigger id="taxRegime">
                                                <SelectValue placeholder="Selecciona el régimen fiscal" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="605">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</SelectItem>
                                                <SelectItem value="606">606 - Arrendamiento</SelectItem>
                                                <SelectItem value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</SelectItem>
                                                <SelectItem value="616">616 - Sin obligaciones fiscales</SelectItem>
                                                <SelectItem value="626">626 - Régimen Simplificado de Confianza (RESICO)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB 4: NOTAS E HISTORIA CLINICA INICIAL */}
                            <TabsContent value="notas" className="mt-0 space-y-4 focus-visible:outline-none">
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Observaciones / Antecedentes Iniciales</Label>
                                    <Textarea
                                        id="notes"
                                        {...register('notes')}
                                        placeholder="Notas confidenciales sobre el motivo de consulta, historial o canalización inicial..."
                                        rows={7}
                                        disabled={isSubmitting}
                                        className="resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Estas notas se guardan de forma encriptada en el expediente clínico del paciente.
                                    </p>
                                </div>
                            </TabsContent>
                        </div>

                        <DialogFooter className="px-6 py-4 border-t bg-card gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="zen"
                                disabled={isSubmitting}
                                className="gap-2 font-bold px-6"
                            >
                                {isSubmitting ? (
                                    <>Guardando...</>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        {isEditing ? 'Guardar Cambios' : 'Crear Expediente'}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </Tabs>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default NewPatientDialog;
