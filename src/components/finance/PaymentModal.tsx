import { useState } from 'react';
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
import { Wallet, ArrowLeftRight, CreditCard, Loader2, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOrganization } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/activityLogger';

interface Appointment {
    id: string;
    patient_name: string;
    start_time: string;
    fee: number;
}

interface PaymentModalProps {
    open: boolean;
    appointment: Appointment | null;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

type Method = 'efectivo' | 'transferencia' | 'stripe';

const METHODS: { id: Method; label: string; description: string; icon: typeof Wallet; color: string }[] = [
    {
        id: 'efectivo',
        label: 'Efectivo',
        description: 'El paciente paga en mano. Registra el cobro manualmente.',
        icon: Wallet,
        color: 'text-success border-success/30 bg-success/5 hover:bg-success/10',
    },
    {
        id: 'transferencia',
        label: 'Transferencia',
        description: 'SPEI, depósito o pago por app bancaria ya realizado.',
        icon: ArrowLeftRight,
        color: 'text-zen-sky border-zen-sky/30 bg-zen-sky/5 hover:bg-zen-sky/10',
    },
    {
        id: 'stripe',
        label: 'Pago en línea (Stripe)',
        description: 'Genera un link. Ábrelo aquí o envíaselo al paciente por WhatsApp/email.',
        icon: CreditCard,
        color: 'text-primary border-primary/30 bg-primary/5 hover:bg-primary/10',
    },
];

const PaymentModal = ({ open, appointment, onOpenChange, onSuccess }: PaymentModalProps) => {
    const { organization } = useOrganization();
    const [selected, setSelected] = useState<Method | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [note, setNote] = useState('');
    // Estado para mostrar el link de Stripe generado
    const [stripeUrl, setStripeUrl] = useState<string | null>(null);

    const handleClose = () => {
        onOpenChange(false);
        setSelected(null);
        setStripeUrl(null);
        setNote('');
    };

    const handleConfirm = async () => {
        if (!appointment || !selected) return;
        setIsProcessing(true);

        try {
            if (selected === 'stripe') {
                // Obtener sesión activa con refresh para garantizar token válido
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData.session?.access_token;

                if (!token) throw new Error('No hay sesión activa. Vuelve a iniciar sesión.');

                const SUPABASE_URL = 'https://zhnbrftspwzacarpjqxd.supabase.co';
                const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobmJyZnRzcHd6YWNhcnBqcXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzQyNDgsImV4cCI6MjA4NTgxMDI0OH0.56Jis1mnVl-Rfof091ejuHR5g8oINumZKiwGL7bygVA';

                const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'apikey': SUPABASE_ANON_KEY,
                    },
                    body: JSON.stringify({
                        appointment_id: appointment.id,
                        amount_mxn: appointment.fee,
                        patient_name: appointment.patient_name,
                        description: `Sesión terapéutica — ${appointment.patient_name} — ${format(parseISO(appointment.start_time), 'd MMM yyyy', { locale: es })}`,
                    }),
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error || 'Error al crear sesión de pago');

                // Guardar URL para mostrarla en el modal
                setStripeUrl(result.url);
                toast.success('Link de pago generado');
                return;
            }

            // Efectivo o Transferencia: marcar como pagado directamente
            const { data: { user } } = await supabase.auth.getUser();

            const { error: aptError } = await supabase
                .from('appointments')
                .update({ payment_status: 'paid' })
                .eq('id', appointment.id);

            if (aptError) throw aptError;

            await supabase.from('payments').insert({
                appointment_id: appointment.id,
                patient_name: appointment.patient_name,
                amount: appointment.fee,
                currency: 'mxn',
                status: 'paid',
                method: selected,
                paid_at: new Date().toISOString(),
                user_id: user?.id,
                organization_id: organization?.id,
                notes: note.trim() || null,
            });

            const label = selected === 'efectivo' ? 'Efectivo' : 'Transferencia';
            toast.success(`Pago en ${label} registrado correctamente`);
            
            await logActivity({
                profile_id: user!.id,
                type: 'payment_received',
                title: 'Pago Recibido',
                description: `Has registrado un pago de ${appointment.patient_name} por $${appointment.fee} (${label}).`,
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
        if (!stripeUrl) return;
        navigator.clipboard.writeText(stripeUrl);
        toast.success('Link copiado al portapapeles');
    };

    const apt = appointment;

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Registrar Pago</DialogTitle>
                    <DialogDescription>
                        {apt
                            ? `${apt.patient_name} · ${format(parseISO(apt.start_time), "d 'de' MMMM yyyy", { locale: es })}`
                            : ''}
                    </DialogDescription>
                </DialogHeader>

                {/* Monto */}
                {apt && (
                    <div className="flex items-center justify-center py-3">
                        <p className="text-4xl font-bold text-primary">
                            ${apt.fee.toLocaleString('es-MX')}
                            <span className="text-base font-normal text-muted-foreground ml-2">MXN</span>
                        </p>
                    </div>
                )}

                {/* ── Pantalla de link generado ── */}
                {stripeUrl ? (
                    <div className="space-y-4">
                        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center space-y-2">
                            <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
                            <p className="font-semibold text-sm">Link de pago listo</p>
                            <p className="text-xs text-muted-foreground">
                                Ábrelo aquí o cópialo para enviárselo al paciente
                            </p>
                        </div>

                        {/* Campo copiable */}
                        <div className="flex gap-2">
                            <Input
                                readOnly
                                value={stripeUrl}
                                className="text-xs font-mono"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copiar link">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={handleClose}>
                                Cerrar
                            </Button>
                            <Button
                                variant="zen"
                                className="flex-1 gap-2"
                                onClick={() => window.open(stripeUrl, '_blank')}
                            >
                                <ExternalLink className="h-4 w-4" />
                                Abrir página de pago
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Métodos */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Selecciona el método de pago</p>
                            {METHODS.map((m) => {
                                const Icon = m.icon;
                                const isSelected = selected === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setSelected(m.id)}
                                        className={cn(
                                            'w-full flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150',
                                            isSelected ? `${m.color} border-current` : 'border-border hover:border-muted-foreground/30',
                                        )}
                                    >
                                        <div className={cn(
                                            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                                            isSelected ? 'bg-current/10' : 'bg-muted',
                                        )}>
                                            <Icon className={cn('h-5 w-5', isSelected ? 'text-current' : 'text-muted-foreground')} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">{m.label}</span>
                                                {isSelected && <CheckCircle2 className="h-4 w-4 text-current" />}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Nota / referencia (solo efectivo y transferencia) */}
                        {selected && selected !== 'stripe' && (
                            <div className="space-y-1.5">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {selected === 'transferencia' ? 'Referencia de la transferencia' : 'Número de recibo'}
                                    <span className="ml-1 text-xs font-normal">(opcional)</span>
                                </p>
                                <Textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder={
                                        selected === 'transferencia'
                                            ? 'Ej: SPEI · Ref. 12345678 · enviado desde HSBC'
                                            : 'Ej: Recibo #042'
                                    }
                                    rows={2}
                                    className="resize-none text-sm"
                                />
                            </div>
                        )}

                        {/* Botones */}
                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={isProcessing}>
                                Cancelar
                            </Button>
                            <Button
                                variant="zen"
                                className="flex-1"
                                onClick={handleConfirm}
                                disabled={!selected || isProcessing}
                            >
                                {isProcessing
                                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Procesando...</>
                                    : selected === 'stripe' ? 'Generar link →' : 'Confirmar Pago'}
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default PaymentModal;
