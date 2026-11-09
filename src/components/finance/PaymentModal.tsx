import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Wallet,
    ArrowLeftRight,
    CreditCard,
    Loader2,
    CheckCircle2,
    Copy,
    ExternalLink,
    Smartphone,
    Building2,
    Share2,
    MessageCircle,
    Settings,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOrganization } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/activityLogger';
import { ColombiaPaymentConfig } from '@/types';
import ColombiaPaymentConfigModal from '@/components/settings/ColombiaPaymentConfigModal';

interface Appointment {
    id: string;
    patient_name: string;
    start_time: string;
    fee?: number;
    patient_id?: string | null;
    patient_phone?: string | null;
}

interface PaymentModalProps {
    open: boolean;
    appointment: Appointment | null;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export type PaymentMethodType = 'nequi' | 'daviplata' | 'transferencia' | 'wompi' | 'bold' | 'efectivo' | 'stripe';

const METHODS: {
    id: PaymentMethodType;
    label: string;
    badge?: string;
    description: string;
    icon: React.ElementType;
    color: string;
    highlight?: boolean;
}[] = [
    {
        id: 'nequi',
        label: 'Nequi',
        badge: '0% comisión',
        description: 'Transferencia a número de celular Nequi.',
        icon: Smartphone,
        color: 'text-purple-600 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10',
        highlight: true,
    },
    {
        id: 'daviplata',
        label: 'Daviplata',
        badge: '0% comisión',
        description: 'Transferencia a número de celular Daviplata.',
        icon: Smartphone,
        color: 'text-rose-600 border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10',
        highlight: true,
    },
    {
        id: 'transferencia',
        label: 'Transferencia Bancolombia / Ahorros',
        badge: '0% comisión',
        description: 'Transferencia interbancaria, Bre-B o Transfiya.',
        icon: ArrowLeftRight,
        color: 'text-sky-600 border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10',
    },
    {
        id: 'wompi',
        label: 'Wompi (PSE / Tarjetas)',
        badge: 'Bancolombia',
        description: 'Cobro en línea con débito PSE de cualquier banco y Nequi.',
        icon: CreditCard,
        color: 'text-teal-600 border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10',
    },
    {
        id: 'bold',
        label: 'Bold (Link de Pago)',
        description: 'Enlace personalizado de Bold para PSE y tarjetas.',
        icon: Building2,
        color: 'text-blue-600 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10',
    },
    {
        id: 'efectivo',
        label: 'Efectivo',
        description: 'El paciente paga en mano en el consultorio.',
        icon: Wallet,
        color: 'text-emerald-600 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10',
    },
    {
        id: 'stripe',
        label: 'Stripe (Internacional)',
        description: 'Para pacientes fuera de Colombia con tarjetas globales.',
        icon: CreditCard,
        color: 'text-indigo-600 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10',
    },
];

const PaymentModal = ({ open, appointment, onOpenChange, onSuccess }: PaymentModalProps) => {
    const { organization } = useOrganization();
    const [selected, setSelected] = useState<PaymentMethodType | null>('nequi');
    const [isProcessing, setIsProcessing] = useState(false);
    const [note, setNote] = useState('');
    const [onlineUrl, setOnlineUrl] = useState<string | null>(null);
    const [paymentConfig, setPaymentConfig] = useState<ColombiaPaymentConfig>({});
    const [patientPhone, setPatientPhone] = useState<string | null>(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

    const loadPaymentConfig = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUserId(user.id);
            const { data: prof } = await supabase
                .from('profiles')
                .select('colombia_payment_config')
                .eq('id', user.id)
                .maybeSingle();
            if (prof?.colombia_payment_config) {
                setPaymentConfig(prof.colombia_payment_config);
            }
        }
    };

    useEffect(() => {
        if (open) {
            loadPaymentConfig();

            // Resolve patient phone for direct WhatsApp dispatch
            if (appointment?.patient_phone) {
                setPatientPhone(appointment.patient_phone);
            } else if (appointment?.patient_id) {
                supabase
                    .from('patients')
                    .select('phone')
                    .eq('id', appointment.patient_id)
                    .maybeSingle()
                    .then(({ data }) => {
                        if (data?.phone) setPatientPhone(data.phone);
                    });
            } else {
                setPatientPhone(null);
            }
        }
    }, [open, appointment]);

    const handleClose = () => {
        onOpenChange(false);
        setSelected('nequi');
        setOnlineUrl(null);
        setNote('');
    };

    // Helper for WhatsApp billing message
    const getWhatsAppBillingText = () => {
        if (!appointment) return '';
        const feeAmount = appointment.fee || 0;
        const feeFormatted = `$${feeAmount.toLocaleString('es-CO')} COP`;
        const dateFormatted = format(parseISO(appointment.start_time), "d 'de' MMMM", { locale: es });
        
        let instructions = '';
        if (selected === 'nequi' && paymentConfig.nequi_phone) {
            instructions = `a través de Nequi al número ${paymentConfig.nequi_phone}`;
        } else if (selected === 'daviplata' && paymentConfig.daviplata_phone) {
            instructions = `a través de Daviplata al número ${paymentConfig.daviplata_phone}`;
        } else if (selected === 'transferencia' && paymentConfig.bank_account_number) {
            instructions = `a la cuenta de ${paymentConfig.bank_account_type || 'Ahorros'} ${paymentConfig.bank_name || 'Bancolombia'} No. ${paymentConfig.bank_account_number} a nombre de ${paymentConfig.bank_account_holder || 'profesional'}`;
        } else if (selected === 'bold' && paymentConfig.bold_payment_link) {
            instructions = `en este enlace seguro: ${paymentConfig.bold_payment_link}`;
        } else if (selected === 'wompi' && onlineUrl) {
            instructions = `en este enlace seguro de PSE: ${onlineUrl}`;
        } else {
            instructions = `en los datos acordados`;
        }

        return `Hola ${appointment.patient_name}, para confirmar tu sesión de psicología del ${dateFormatted}, el valor es de ${feeFormatted}. Puedes realizar tu pago ${instructions}. Por favor me envías el comprobante. ¡Muchas gracias!`;
    };

    const handleShareWhatsApp = () => {
        if (selected === 'nequi' && !paymentConfig.nequi_phone) {
            toast.error('Configura tu número de Nequi antes de enviar el cobro');
            setIsConfigModalOpen(true);
            return;
        }
        if (selected === 'daviplata' && !paymentConfig.daviplata_phone) {
            toast.error('Configura tu número de Daviplata antes de enviar el cobro');
            setIsConfigModalOpen(true);
            return;
        }
        if (selected === 'transferencia' && !paymentConfig.bank_account_number) {
            toast.error('Configura tu cuenta bancaria antes de enviar el cobro');
            setIsConfigModalOpen(true);
            return;
        }
        const text = encodeURIComponent(getWhatsAppBillingText());
        let phoneQuery = '';
        if (patientPhone) {
            let digits = patientPhone.replace(/[^0-9]/g, '');
            if (digits.length === 10 && digits.startsWith('3')) {
                digits = `57${digits}`;
            }
            if (digits.length >= 10) {
                phoneQuery = `phone=${digits}&`;
            }
        }
        window.open(`https://api.whatsapp.com/send?${phoneQuery}text=${text}`, '_blank');
    };

    const handleConfirm = async () => {
        if (!appointment || !selected) return;
        setIsProcessing(true);

        try {
            // Stripe flow
            if (selected === 'stripe') {
                const { data: result, error: funcError } = await supabase.functions.invoke('create-checkout-session', {
                    body: {
                        appointment_id: appointment.id,
                        amount: appointment.fee || 0,
                        patient_name: appointment.patient_name,
                        description: `Sesión terapéutica — ${appointment.patient_name} — ${format(parseISO(appointment.start_time), 'd MMM yyyy', { locale: es })}`,
                    },
                });

                if (funcError) throw new Error(funcError.message || 'Error al conectar con el servidor');
                if (result?.error) throw new Error(result.error);

                setOnlineUrl(result.url);
                toast.success('Link de pago Stripe generado');
                return;
            }

            // Wompi link generator if selected and public key exists
            if (selected === 'wompi' && paymentConfig.wompi_public_key && !onlineUrl) {
                const amountCents = Math.round((appointment.fee || 0) * 100);
                const reference = `SES-${appointment.id.slice(0, 8)}-${Date.now()}`;
                const wompiCheckoutUrl = `https://checkout.wompi.co/p/?public-key=${paymentConfig.wompi_public_key}&currency=COP&amount-in-cents=${amountCents}&reference=${reference}`;
                setOnlineUrl(wompiCheckoutUrl);
                toast.success('Link de pago Wompi (PSE) generado');
                return;
            }

            // Bold link if selected and link exists
            if (selected === 'bold' && paymentConfig.bold_payment_link && !onlineUrl) {
                setOnlineUrl(paymentConfig.bold_payment_link);
                toast.success('Link de pago Bold preparado');
                return;
            }

            // Direct payment confirmation (Nequi, Daviplata, Bancolombia, Efectivo, or manual Wompi/Bold)
            const { data: { user } } = await supabase.auth.getUser();

            const { error: aptError } = await supabase
                .from('appointments')
                .update({ payment_status: 'paid' })
                .eq('id', appointment.id);

            if (aptError) throw aptError;

            await supabase.from('payments').insert({
                appointment_id: appointment.id,
                patient_name: appointment.patient_name,
                amount: appointment.fee || 0,
                currency: 'cop',
                status: 'paid',
                method: selected,
                paid_at: new Date().toISOString(),
                user_id: user?.id,
                organization_id: organization?.id,
                notes: note.trim() || null,
            });

            const methodObj = METHODS.find(m => m.id === selected);
            const label = methodObj?.label || selected;
            toast.success(`Pago mediante ${label} registrado correctamente`);
            
            await logActivity({
                profile_id: user!.id,
                type: 'payment_received',
                title: 'Pago Recibido',
                description: `Has registrado un pago de ${appointment.patient_name} por $${(appointment.fee || 0).toLocaleString('es-CO')} COP (${label}).`,
                organization_id: organization?.id,
            });
            
            handleClose();
            onSuccess();
        } catch (err: any) {
            toast.error('Error al registrar pago: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCopyLink = () => {
        if (!onlineUrl) return;
        navigator.clipboard.writeText(onlineUrl);
        toast.success('Link copiado al portapapeles');
    };

    const apt = appointment;

    return (
        <>
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Registrar Cobro de Sesión</DialogTitle>
                    <DialogDescription>
                        {apt
                            ? `${apt.patient_name} · ${format(parseISO(apt.start_time), "d 'de' MMMM yyyy", { locale: es })}`
                            : ''}
                    </DialogDescription>
                </DialogHeader>

                {/* Monto */}
                {apt && (
                    <div className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-border/60">
                        <p className="text-3xl font-extrabold text-primary">
                            ${(apt.fee || 0).toLocaleString('es-CO')}
                            <span className="text-xs font-semibold text-muted-foreground ml-2 uppercase">COP</span>
                        </p>
                    </div>
                )}

                {/* ── Pantalla de link generado (Wompi, Bold o Stripe) ── */}
                {onlineUrl ? (
                    <div className="space-y-4">
                        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center space-y-2">
                            <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
                            <p className="font-semibold text-sm">Link de pago listo</p>
                            <p className="text-xs text-muted-foreground">
                                Cópialo o envíaselo directamente por WhatsApp al paciente
                            </p>
                        </div>

                        {/* Campo copiable */}
                        <div className="flex gap-2">
                            <Input
                                readOnly
                                value={onlineUrl}
                                className="text-xs font-mono"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copiar link">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setOnlineUrl(null)}>
                                Volver a Métodos
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 gap-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                onClick={handleShareWhatsApp}
                            >
                                <MessageCircle className="h-4 w-4" />
                                WhatsApp
                            </Button>
                            <Button
                                variant="zen"
                                className="flex-1 gap-2 font-bold"
                                onClick={() => window.open(onlineUrl, '_blank')}
                            >
                                <ExternalLink className="h-4 w-4" />
                                Abrir Link
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Métodos */}
                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Selecciona el método de pago
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {METHODS.map((m) => {
                                    const Icon = m.icon;
                                    const isSelected = selected === m.id;
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setSelected(m.id)}
                                            className={cn(
                                                'flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all duration-150',
                                                isSelected ? `${m.color} border-current` : 'border-border hover:border-muted-foreground/30',
                                            )}
                                        >
                                            <div className={cn(
                                                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                                                isSelected ? 'bg-current/10' : 'bg-muted',
                                            )}>
                                                <Icon className={cn('h-4 w-4', isSelected ? 'text-current' : 'text-muted-foreground')} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="font-semibold text-xs truncate">{m.label}</span>
                                                    {m.badge && (
                                                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-muted text-muted-foreground">
                                                            {m.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{m.description}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Datos de cuenta según método seleccionado */}
                        {selected === 'nequi' && (
                            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                                        Número de Nequi: {paymentConfig.nequi_phone || 'No configurado'}
                                    </span>
                                    {paymentConfig.nequi_phone && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-purple-700"
                                            onClick={() => {
                                                navigator.clipboard.writeText(paymentConfig.nequi_phone!);
                                                toast.success('Número Nequi copiado');
                                            }}
                                        >
                                            <Copy className="h-3 w-3 mr-1" /> Copiar
                                        </Button>
                                    )}
                                </div>
                                {paymentConfig.nequi_phone ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1.5"
                                        onClick={handleShareWhatsApp}
                                    >
                                        <MessageCircle className="h-3.5 w-3.5" /> Enviar datos de Nequi por WhatsApp al paciente
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs text-purple-700 border-purple-300 hover:bg-purple-50 gap-1.5 font-bold"
                                        onClick={() => setIsConfigModalOpen(true)}
                                    >
                                        <Settings className="h-3.5 w-3.5" /> Configurar mi número Nequi ahora
                                    </Button>
                                )}
                            </div>
                        )}

                        {selected === 'daviplata' && (
                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                                        Número de Daviplata: {paymentConfig.daviplata_phone || 'No configurado'}
                                    </span>
                                    {paymentConfig.daviplata_phone && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-rose-700"
                                            onClick={() => {
                                                navigator.clipboard.writeText(paymentConfig.daviplata_phone!);
                                                toast.success('Número Daviplata copiado');
                                            }}
                                        >
                                            <Copy className="h-3 w-3 mr-1" /> Copiar
                                        </Button>
                                    )}
                                </div>
                                {paymentConfig.daviplata_phone ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1.5"
                                        onClick={handleShareWhatsApp}
                                    >
                                        <MessageCircle className="h-3.5 w-3.5" /> Enviar datos de Daviplata por WhatsApp
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs text-rose-700 border-rose-300 hover:bg-rose-50 gap-1.5 font-bold"
                                        onClick={() => setIsConfigModalOpen(true)}
                                    >
                                        <Settings className="h-3.5 w-3.5" /> Configurar mi número Daviplata ahora
                                    </Button>
                                )}
                            </div>
                        )}

                        {selected === 'transferencia' && (
                            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 space-y-2">
                                <div className="text-xs space-y-1 text-sky-800 dark:text-sky-300">
                                    <p className="font-semibold">
                                        {paymentConfig.bank_name || 'Bancolombia'} · Cuenta {paymentConfig.bank_account_type || 'Ahorros'}: {paymentConfig.bank_account_number || 'No configurada'}
                                    </p>
                                    {paymentConfig.bank_account_holder && (
                                        <p className="text-[11px] text-muted-foreground">Titular: {paymentConfig.bank_account_holder}</p>
                                    )}
                                </div>
                                {paymentConfig.bank_account_number && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs h-7"
                                            onClick={() => {
                                                navigator.clipboard.writeText(paymentConfig.bank_account_number!);
                                                toast.success('Número de cuenta copiado');
                                            }}
                                        >
                                            <Copy className="h-3 w-3 mr-1" /> Copiar Cuenta
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs h-7 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                            onClick={handleShareWhatsApp}
                                        >
                                            <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                                        </Button>
                                    </div>
                                )}
                                {!paymentConfig.bank_account_number && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs text-sky-700 border-sky-300 hover:bg-sky-50 gap-1.5 font-bold"
                                        onClick={() => setIsConfigModalOpen(true)}
                                    >
                                        <Settings className="h-3.5 w-3.5" /> Configurar mi cuenta bancaria ahora
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Nota / referencia de pago */}
                        <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground">
                                Referencia o Número de Comprobante <span className="text-[10px] font-normal">(opcional)</span>
                            </p>
                            <Textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Ej: Nequi M1234567 · Transfiya #890 · Recibo No. 42"
                                rows={2}
                                className="resize-none text-xs"
                            />
                        </div>

                        {/* Botones de acción */}
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <Button variant="outline" className="sm:w-28" onClick={handleClose} disabled={isProcessing}>
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 gap-1.5 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold"
                                onClick={handleShareWhatsApp}
                                disabled={isProcessing}
                            >
                                <MessageCircle className="h-4 w-4 text-emerald-600" />
                                Compartir WhatsApp
                            </Button>
                            <Button
                                variant="zen"
                                className="flex-1 font-bold"
                                onClick={handleConfirm}
                                disabled={!selected || isProcessing}
                            >
                                {isProcessing ? (
                                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Procesando...</>
                                ) : selected === 'stripe' ? (
                                    'Generar link Stripe →'
                                ) : selected === 'wompi' && paymentConfig.wompi_public_key ? (
                                    'Generar link Wompi (PSE) →'
                                ) : selected === 'bold' && paymentConfig.bold_payment_link ? (
                                    'Ver link Bold →'
                                ) : (
                                    'Confirmar Pago'
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>

        <ColombiaPaymentConfigModal
            open={isConfigModalOpen}
            onOpenChange={setIsConfigModalOpen}
            userId={currentUserId}
            initialConfig={paymentConfig}
            onSaved={loadPaymentConfig}
        />
        </>
    );
};

export default PaymentModal;
