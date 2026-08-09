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
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Términos y Condiciones de Uso</h1>
                            <p className="text-muted-foreground text-sm">Última actualización: 17 de junio de 2026</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="w-fit gap-2">
                        <ArrowLeft className="h-4 w-4" /> Volver
                    </Button>
                </div>

                {/* Content */}
                <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-foreground">
                    <div className="bg-slate-100 dark:bg-slate-900 p-5 rounded-2xl border border-border/60 text-muted-foreground leading-relaxed text-sm">
                        <p className="mb-2"><strong>Titular:</strong> GetMySession</p>
                        <p className="mb-2"><strong>Sitio Web:</strong> <a href="https://app.getmysession.mx" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://app.getmysession.mx</a></p>
                        <p><strong>Contacto de Soporte:</strong> <a href="mailto:contacto@getmysession.mx" className="text-primary hover:underline">contacto@getmysession.mx</a> o <a href="mailto:getmysession.app.mx@gmail.com" className="text-primary hover:underline">getmysession.app.mx@gmail.com</a></p>
                    </div>

                    <p className="text-muted-foreground leading-relaxed">
                        En GetMySession, entendemos que tu práctica es privada y delicada; por ello, estos términos buscan proteger tanto tu ejercicio profesional como la seguridad de la información de tus pacientes.
                    </p>

                    <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl space-y-2">
                        <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 m-0">AVISO LEGAL Y DESCARGO DE RESPONSABILIDAD CLÍNICA</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed m-0">
                            GetMySession es una plataforma tecnológica (SaaS). GetMySession <strong>NO</strong> presta servicios psicológicos, psiquiátricos, médicos ni terapéuticos; <strong>NO</strong> realiza diagnósticos, <strong>NO</strong> prescribe tratamientos y <strong>NO</strong> interviene en la relación profesional entre el psicólogo y su paciente. Las herramientas de IA son de asistencia administrativa. La IA no suple el juicio clínico del profesional.
                        </p>
                    </div>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">1. Aceptación del Servicio</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Al registrarse o utilizar GetMySession, usted acepta estos Términos en su totalidad.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">2. Elegibilidad y Cédula Profesional</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            El uso del Servicio está restringido exclusivamente a profesionales de la salud mental. Usted garantiza bajo protesta de decir verdad que posee una Cédula Profesional vigente. GetMySession se reserva el derecho de validar su cédula y cancelar cuentas sin habilitación.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">3. Funcionalidades del Servicio</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            GetMySession provee gestión integral: facturación (CFDI), control financiero, expedientes, notas, tareas, citas, integraciones (Google Calendar/Meet/Zoom) y un consultorio virtual integrado para videollamadas encriptadas.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">4. Estándares Técnicos y Cumplimiento de la NOM-024-SSA3-2012</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            GetMySession opera siguiendo las reglas de la NOM-024-SSA3-2012.
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li><strong>Resguardo por 5 años:</strong> Los expedientes clínicos se resguardarán por el periodo obligatorio de 5 años tras el último registro.</li>
                            <li>El profesional es el responsable último de la veracidad y el secreto profesional.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">5. Privacidad y Datos (LFPDPPP)</h2>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li><strong>Terapeuta como Responsable:</strong> El Terapeuta es el Responsable del Tratamiento de datos sensibles de sus pacientes y debe contar con su propio Aviso de Privacidad.</li>
                            <li><strong>GetMySession como Encargado:</strong> Procesamos información por cuenta del Terapeuta con cifrado estándar.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">6. Uso del Asistente de IA (Deslinde Técnico)</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            La IA es una herramienta de asistencia documental. El Terapeuta debe revisar, corregir y validar cualquier contenido generado por IA antes de darle valor clínico o legal.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">7. Pagos, Renovaciones y Cancelaciones</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            <strong>Derecho de Acceso Post-Cancelación:</strong> Si cancela su suscripción, perderá acceso a herramientas premium (IA, facturación, etc.), pero GetMySession mantendrá habilitado el acceso exclusivo para la descarga de expedientes clínicos durante el periodo de 5 años de resguardo legal.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">8. Seguridad y Responsabilidad del Terapeuta</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            El Usuario es el único responsable de la seguridad de sus dispositivos y de configurar métodos de autenticación robustos (incluyendo, de ser posible, la verificación en dos pasos). GetMySession no será responsable por accesos no autorizados derivados del robo de credenciales, uso de contraseñas débiles o negligencia en el manejo de dispositivos por parte del Terapeuta.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">9. Propiedad de los Datos</h2>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li><strong>Propiedad del Usuario:</strong> Usted retiene la propiedad total de los expedientes y datos de sus pacientes.</li>
                            <li><strong>Licencia:</strong> Usted otorga a GetMySession una licencia limitada para procesar dicha información únicamente con el propósito de prestar los servicios contratados.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">10. Política de Uso Aceptable</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Queda prohibido realizar actividades ilícitas, extraer datos de terceros (scraping), intentar vulnerar la seguridad del servidor o distribuir malware. El incumplimiento faculta a GetMySession para cancelar la cuenta de inmediato sin reembolso.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">11. Fuerza Mayor y Limitación de Responsabilidad Financiera</h2>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li><strong>Fuerza Mayor:</strong> GetMySession no será responsable por fallas derivadas de eventos fuera de nuestro control (desastres naturales, fallas eléctricas, ataques externos, etc.).</li>
                            <li><strong>Tope de Responsabilidad:</strong> La responsabilidad total de GetMySession ante cualquier reclamo se limitará al monto total pagado por el Usuario en los 6 meses anteriores al evento.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">12. Jurisdicción y Ley Aplicable</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Para cualquier controversia, las partes se someten a las leyes federales de México y a la jurisdicción exclusiva de los tribunales competentes de Tijuana, Baja California, México.
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <footer className="pt-12 text-center text-xs text-muted-foreground border-t border-border">
                    <p>© 2026 GetMySession · Todos los derechos reservados.</p>
                </footer>
            </div>
        </div>
    );
};

export default TermsOfService;
