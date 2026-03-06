import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ShieldAlert, Clock, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InactivityModalProps {
    open: boolean;
    countdownSeconds: number;
    onContinue: () => void;
    onLogout: () => void;
}

const InactivityModal = ({ open, countdownSeconds, onContinue, onLogout }: InactivityModalProps) => {
    const [remaining, setRemaining] = useState(countdownSeconds);

    // Reiniciar y arrancar el countdown cuando el modal se abre
    useEffect(() => {
        if (!open) { setRemaining(countdownSeconds); return; }
        setRemaining(countdownSeconds);
        const interval = setInterval(() => {
            setRemaining(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [open, countdownSeconds]);

    // Auto-logout cuando llega a 0
    useEffect(() => {
        if (open && remaining === 0) {
            const timeout = setTimeout(() => onLogout(), 500);
            return () => clearTimeout(timeout);
        }
    }, [remaining, open, onLogout]);

    const progress = (remaining / countdownSeconds) * 100;
    const isUrgent = remaining <= 10;

    return (
        <DialogPrimitive.Root open={open}>
            <DialogPrimitive.Portal>
                {/* Overlay */}
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />

                {/* Contenedor centrado */}
                <DialogPrimitive.Content
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onInteractOutside={e => e.preventDefault()}
                    onEscapeKeyDown={e => e.preventDefault()}
                >
                    <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-scale-in">
                        {/* Barra de progreso superior */}
                        <div className="h-1.5 w-full bg-muted overflow-hidden">
                            <div
                                className={cn(
                                    'h-full transition-all duration-1000 ease-linear',
                                    isUrgent ? 'bg-destructive' : 'bg-amber-500'
                                )}
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <div className="p-6 text-center space-y-5">
                            {/* Icono */}
                            <div className={cn(
                                'mx-auto flex h-16 w-16 items-center justify-center rounded-full transition-colors',
                                isUrgent ? 'bg-destructive/10' : 'bg-amber-500/10'
                            )}>
                                <ShieldAlert className={cn(
                                    'h-8 w-8',
                                    isUrgent ? 'text-destructive' : 'text-amber-500'
                                )} />
                            </div>

                            {/* Título */}
                            <div>
                                <h2 className="text-lg font-bold">Sesión a punto de expirar</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Tu sesión se cerrará automáticamente por inactividad.
                                </p>
                            </div>

                            {/* Countdown */}
                            <div className={cn(
                                'flex items-center justify-center gap-2 rounded-xl py-3 px-4',
                                isUrgent ? 'bg-destructive/10' : 'bg-muted/60'
                            )}>
                                <Clock className={cn('h-5 w-5', isUrgent ? 'text-destructive' : 'text-amber-500')} />
                                <span className={cn(
                                    'text-2xl font-bold tabular-nums',
                                    isUrgent ? 'text-destructive' : 'text-foreground'
                                )}>
                                    {remaining}s
                                </span>
                                <span className="text-sm text-muted-foreground">restantes</span>
                            </div>

                            {/* Botones */}
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="zen"
                                    className="w-full gap-2"
                                    onClick={onContinue}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Continuar sesión
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                                    onClick={onLogout}
                                >
                                    <LogOut className="h-4 w-4" />
                                    Cerrar sesión ahora
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
};

export default InactivityModal;
