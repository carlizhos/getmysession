import { FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 lg:p-12">
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-border">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Términos y Condiciones</h1>
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
                        <h2 className="text-xl font-semibold text-foreground">1. Aceptación de Términos</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Al acceder y utilizar Saudade, usted acepta estar sujeto a estos términos y condiciones de uso. Si no está de acuerdo con alguna parte de estos términos, no podrá utilizar nuestros servicios.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">2. Uso del Servicio</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            El servicio está diseñado para profesionales de la salud mental. Usted es responsable de mantener la confidencialidad de sus credenciales y de toda la actividad que ocurra bajo su cuenta.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">3. Responsabilidad Profesional</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Saudade es una herramienta de apoyo a la gestión clínica. El profesional sigue siendo el único responsable del diagnóstico, tratamiento y custodia de la información sensible de sus pacientes conforme a la ley local.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">4. Modificaciones</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado de la plataforma tras dichos cambios constituirá su aceptación de los nuevos términos.
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

export default TermsOfService;
