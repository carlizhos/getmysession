import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 lg:p-12">
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-border">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Políticas de Uso</h1>
                            <p className="text-muted-foreground">Última actualización: Mayo 2026</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="w-fit gap-2">
                        <ArrowLeft className="h-4 w-4" /> Volver
                    </Button>
                </div>

                {/* Content */}
                <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold text-foreground">1. Introducción</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Bienvenido a Saudade. Nos comprometemos a proteger su privacidad y asegurar que su información personal sea tratada de forma segura y responsable.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">2. Recopilación de Datos</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Recopilamos información necesaria para la gestión de su práctica clínica, incluyendo datos de pacientes, notas de sesión y registros financieros. Estos datos se almacenan de forma cifrada y cumpliendo con estándares internacionales de seguridad.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">3. Uso de la Información</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Su información se utiliza exclusivamente para proporcionar los servicios de la plataforma, mejorar su experiencia y garantizar la integridad de los datos clínicos. No compartimos sus datos con terceros con fines comerciales.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">4. Seguridad</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos contra el acceso no autorizado, la alteración o la destrucción.
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <footer className="pt-12 text-center text-xs text-muted-foreground border-t border-border">
                    <p>© 2026 Saudade · Todos los derechos reservados.</p>
                </footer>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
