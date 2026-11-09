import { ArrowLeft, Clock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 lg:p-12 flex items-center justify-center transition-colors duration-200">
            <div className="max-w-xl w-full mx-auto space-y-6 text-center animate-fade-in bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-2xl border border-border shadow-sm">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Clock className="h-8 w-8" />
                </div>

                <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        En Actualización
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        Política de Privacidad
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Documento temporalmente en proceso de revisión legal y regulatoria.
                    </p>
                </div>

                <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3 bg-slate-50 dark:bg-slate-950/60 p-5 rounded-xl border border-border/80 text-left">
                    <p>
                        Nuestra <strong>Política de Privacidad y Tratamiento de Información</strong> está siendo actualizada para reflejar los más recientes estándares internacionales de protección de datos personales y salud digital.
                    </p>
                    <p>
                        La versión definitiva estará disponible próximamente en este mismo apartado tras culminar el proceso de revisión jurídica especializada.
                    </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button variant="outline" size="default" onClick={() => navigate(-1)} className="w-full sm:w-auto gap-2">
                        <ArrowLeft className="h-4 w-4" /> Volver
                    </Button>
                    <Button
                        variant="zen"
                        size="default"
                        className="w-full sm:w-auto gap-2 font-bold"
                        onClick={() => window.location.href = 'mailto:contacto@getmysession.com'}
                    >
                        <Mail className="h-4 w-4" /> Contactar a Soporte
                    </Button>
                </div>

                <footer className="pt-6 text-center text-[11px] text-muted-foreground border-t border-border/60">
                    <p>© {new Date().getFullYear()} GetMySession · Todos los derechos reservados.</p>
                </footer>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
