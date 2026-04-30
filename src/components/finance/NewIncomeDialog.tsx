import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
    Wallet, 
    ArrowLeftRight, 
    CreditCard, 
    Loader2, 
    Plus, 
    Calendar as CalendarIcon,
    Tag
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface NewIncomeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

type Method = 'efectivo' | 'transferencia' | 'stripe';
type Category = 'sesion' | 'taller' | 'conferencia' | 'otro';

const METHODS: { id: Method; label: string; icon: typeof Wallet; color: string }[] = [
    { id: 'efectivo', label: 'Efectivo', icon: Wallet, color: 'text-success bg-success/10' },
    { id: 'transferencia', label: 'Transferencia', icon: ArrowLeftRight, color: 'text-sky-600 bg-sky-500/10' },
    { id: 'stripe', label: 'Stripe', icon: CreditCard, color: 'text-primary bg-primary/10' },
];

const CATEGORIES: { id: Category; label: string }[] = [
    { id: 'sesion', label: 'Sesión Extra' },
    { id: 'taller', label: 'Taller' },
    { id: 'conferencia', label: 'Conferencia' },
    { id: 'otro', label: 'Otro' },
];

const NewIncomeDialog = ({ open, onOpenChange, onSuccess }: NewIncomeDialogProps) => {
    const { organization } = useOrganization();
    const { user } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        method: 'efectivo' as Method,
        category: 'otro' as Category,
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
    });

    const handleClose = () => {
        onOpenChange(false);
        setFormData({
            description: '',
            amount: '',
            method: 'efectivo',
            category: 'otro',
            date: format(new Date(), 'yyyy-MM-dd'),
            notes: ''
        });
    };

    const handleConfirm = async () => {
        if (!formData.description || !formData.amount) {
            toast.error('Por favor completa los campos obligatorios');
            return;
        }

        setIsProcessing(true);
        try {
            const amountNum = parseFloat(formData.amount);
            if (isNaN(amountNum)) throw new Error('Monto inválido');

            const { error } = await supabase.from('payments').insert({
                patient_name: formData.description, // Usamos patient_name como descripción general
                amount: amountNum,
                currency: 'mxn',
                status: 'paid',
                method: formData.method,
                category: formData.category,
                paid_at: new Date(formData.date).toISOString(),
                user_id: user?.id,
                organization_id: organization?.id,
                notes: formData.notes.trim() || null,
            });

            if (error) throw error;

            toast.success('Ingreso registrado correctamente');
            handleClose();
            onSuccess();
        } catch (err: any) {
            toast.error('Error al registrar ingreso: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
            <DialogContent className="sm:max-w-lg border-white/20 backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                            <Plus className="h-6 w-6 text-success" />
                        </div>
                        Nuevo Ingreso Manual
                    </DialogTitle>
                    <DialogDescription>
                        Registra ingresos que no provienen de la agenda (talleres, conferencias, etc.)
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Concepto y Monto */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5" /> Concepto
                            </label>
                            <Input 
                                placeholder="Ej: Taller de Ansiedad"
                                value={formData.description}
                                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                className="bg-white/50 dark:bg-slate-950/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                <CreditCard className="h-3.5 w-3.5" /> Monto (MXN)
                            </label>
                            <Input 
                                type="number"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                                className="bg-white/50 dark:bg-slate-950/50 font-mono text-lg"
                            />
                        </div>
                    </div>

                    {/* Fecha y Categoría */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                <CalendarIcon className="h-3.5 w-3.5" /> Fecha
                            </label>
                            <Input 
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                                className="bg-white/50 dark:bg-slate-950/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setFormData(p => ({ ...p, category: c.id }))}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                            formData.category === c.id 
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-muted/50 text-muted-foreground border-transparent hover:border-border"
                                        )}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Método de Pago */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground">Método de Pago</label>
                        <div className="grid grid-cols-3 gap-3">
                            {METHODS.map(m => {
                                const Icon = m.icon;
                                const isSelected = formData.method === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => setFormData(p => ({ ...p, method: m.id }))}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                                            isSelected 
                                                ? "border-primary bg-primary/5" 
                                                : "border-transparent bg-muted/30 hover:bg-muted/50"
                                        )}
                                    >
                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", m.color)}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <span className="text-xs font-semibold">{m.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notas */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Notas adicionales (opcional)</label>
                        <Textarea 
                            placeholder="Detalles sobre el evento o cliente..."
                            value={formData.notes}
                            onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                            className="bg-white/50 dark:bg-slate-950/50 resize-none"
                            rows={3}
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={handleClose} disabled={isProcessing}>
                        Cancelar
                    </Button>
                    <Button 
                        variant="zen" 
                        className="flex-1 rounded-xl shadow-lg shadow-primary/20"
                        onClick={handleConfirm}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            'Registrar Ingreso'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default NewIncomeDialog;
