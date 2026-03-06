import { useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Brain, PartyPopper, Star, Heart, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DischargeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientName: string;
}

const Confetti = () => {
    const pieces = Array.from({ length: 24 }, (_, i) => i);
    const colors = ['#facc15', '#f472b6', '#60a5fa', '#34d399', '#a78bfa', '#fb923c'];

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl z-0">
            {pieces.map((i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        width: '8px',
                        height: '8px',
                        borderRadius: '2px',
                        backgroundColor: colors[i % colors.length],
                        left: `${(i / pieces.length) * 100}%`,
                        top: '-10px',
                        opacity: 0,
                        animation: `confetti-fall ${0.9 + (i % 5) * 0.25}s ease-in ${(i % 7) * 0.08}s forwards`,
                        transform: `rotate(${i * 37}deg)`,
                    }}
                />
            ))}
        </div>
    );
};

const DischargeModal = ({ open, onOpenChange, patientName }: DischargeModalProps) => {
    const navigate = useNavigate();
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (open) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 2800);
            return () => clearTimeout(timer);
        }
    }, [open]);

    return (
        <>
            <style>{`
                @keyframes confetti-fall {
                    0%   { transform: translateY(0) rotate(0deg);      opacity: 1; }
                    100% { transform: translateY(420px) rotate(720deg); opacity: 0; }
                }
                @keyframes bounce-in {
                    0%   { transform: scale(0.5); opacity: 0; }
                    60%  { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); }
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
                    50%      { box-shadow: 0 0 0 16px rgba(168, 85, 247, 0); }
                }
                .bounce-in  { animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
            `}</style>

            <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
                <DialogPrimitive.Portal>
                    {/* Overlay oscuro */}
                    <DialogPrimitive.Overlay
                        className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                    />

                    {/* Wrapper de centrado: ocupa todo el viewport como flex */}
                    <DialogPrimitive.Content
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                        {/* Card del modal */}
                        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-violet-950/40 dark:via-background dark:to-purple-950/40 shadow-2xl">
                            {showConfetti && <Confetti />}

                            {/* Botón cerrar */}
                            <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                <X className="h-4 w-4" />
                                <span className="sr-only">Cerrar</span>
                            </DialogPrimitive.Close>

                            {/* Contenido */}
                            <div className="flex flex-col items-center px-8 py-10 text-center">
                                {/* Icono principal */}
                                <div className="bounce-in mb-6">
                                    <div className="pulse-glow flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                                        <PartyPopper className="h-12 w-12 text-white" />
                                    </div>
                                </div>

                                {/* Estrellas */}
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>

                                {/* Título */}
                                <h2 className="text-2xl font-bold text-foreground mb-2">
                                    ¡Nuevo paciente! 🎉
                                </h2>

                                {/* Mensaje */}
                                <p className="text-muted-foreground mb-2 leading-relaxed">
                                    <span className="font-semibold text-foreground">{patientName}</span> se ha convertido
                                    en paciente activo.
                                </p>
                                <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                                    ¡Tu pipeline de captación está funcionando! Considera crear su expediente clínico.{' '}
                                    <Heart className="inline h-4 w-4 fill-red-400 text-red-400" />
                                </p>

                                {/* Sugerencia */}
                                <div className="w-full rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30 p-4 mb-6 text-left">
                                    <p className="text-sm font-medium text-violet-800 dark:text-violet-300 mb-1">
                                        💡 Sugerencia
                                    </p>
                                    <p className="text-xs text-violet-700 dark:text-violet-400">
                                        Genera el Reporte Final de IA con todas las notas acumuladas del proceso terapéutico.
                                    </p>
                                </div>

                                {/* Botones */}
                                <div className="flex w-full flex-col gap-3">
                                    <Button
                                        className="w-full gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md"
                                        onClick={() => {
                                            onOpenChange(false);
                                            navigate('/ai-assistant');
                                        }}
                                    >
                                        <Brain className="h-4 w-4" />
                                        Generar Reporte Final de IA
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full text-muted-foreground"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        Cerrar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
            </DialogPrimitive.Root>
        </>
    );
};

export default DischargeModal;
