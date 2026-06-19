import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 lg:p-12 transition-colors duration-200">
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-border">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Aviso de Privacidad</h1>
                            <p className="text-muted-foreground text-sm">Última actualización: 13 de junio de 2026</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="w-fit gap-2">
                        <ArrowLeft className="h-4 w-4" /> Volver
                    </Button>
                </div>

                {/* Content */}
                <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-foreground">
                    <p className="text-muted-foreground leading-relaxed">
                        <strong>Saudade</strong> (en adelante, &quot;Saudade&quot;), con domicilio en Tijuana, Baja California, México, C.P. 22117, reconoce la importancia de garantizar la protección de los datos personales proporcionados por los usuarios (en adelante el “Usuario” o “Usuarios”) que interactúan con nuestra plataforma web <a href="https://app.saudade.mx" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://app.saudade.mx</a>.
                    </p>

                    <p className="text-muted-foreground leading-relaxed">
                        Este Aviso de Privacidad se emite en cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), su Reglamento y los lineamientos del Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI) vigentes en México.
                    </p>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">1. Identidad y Domicilio del Responsable</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Saudade es el responsable del tratamiento de los datos personales que usted nos proporciona. Para cualquier duda o ejercicio de derechos ARCO (Acceso, Rectificación, Cancelación y Oposición), puede contactarnos a través del correo electrónico oficial: <a href="mailto:contacto@saudade.mx" className="text-primary hover:underline">contacto@saudade.mx</a> o el correo de asistencia alterno <a href="mailto:saudade.app.mx@gmail.com" className="text-primary hover:underline">saudade.app.mx@gmail.com</a>, o bien, en nuestro domicilio ubicado en Tijuana, Baja California, México, C.P. 22117.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">2. Datos Personales Recabados</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Para la correcta prestación de nuestros servicios, Saudade recopila:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                <strong>Datos de Identificación y Contacto del Terapeuta:</strong> Nombre completo, cédula profesional, correo electrónico, teléfono, dirección del consultorio, RFC, CURP y datos de facturación/fiscales.
                            </li>
                            <li>
                                <strong>Datos de Pacientes (Cargados por el Terapeuta):</strong> Nombre, edad, datos de contacto, historial clínico, notas de evolución, tareas, diagnósticos (CIE-10) y cualquier información del expediente clínico que el Terapeuta decida almacenar en la plataforma.
                            </li>
                            <li>
                                <strong>Datos Personales Sensibles de Pacientes:</strong> El Terapeuta reconoce y acepta que los expedientes clínicos contienen datos de carácter sensible (relacionados con el estado de salud física y mental, historial de terapias, etc.). Saudade trata esta información bajo estrictas medidas de seguridad y cifrado.
                            </li>
                            <li>
                                <strong>Información Técnica y de Navegación:</strong> Dirección IP, tipo de dispositivo, navegador web utilizado, datos de geolocalización básica y cookies de sesión y analíticas.
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">3. Finalidad del Tratamiento de Datos</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Los datos recopilados se tratan para las siguientes finalidades:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                <strong>Finalidades Primarias (necesarias para el servicio):</strong>
                                <ul className="list-circle pl-6 mt-2 space-y-1">
                                    <li>Provisión de servicios de gestión clínica, expediente digital 360, agenda y CRM de pacientes.</li>
                                    <li>Almacenamiento de expedientes digitales conforme a los estándares de la NOM-024-SSA3-2012.</li>
                                    <li>Procesamiento y generación de notas clínicas mediante herramientas de Inteligencia Artificial (transcripción y dictado).</li>
                                    <li>Procesamiento de pagos y suscripciones premium a través de pasarelas seguras.</li>
                                    <li>Emisión de facturación electrónica CFDI 4.0.</li>
                                    <li>Soporte técnico y atención de solicitudes ARCO.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>Finalidades Secundarias (no necesarias para la relación jurídica):</strong>
                                <ul className="list-circle pl-6 mt-2 space-y-1">
                                    <li>Notificación de actualizaciones del servicio o mejoras en las funcionalidades.</li>
                                    <li>Envío de promociones del programa de referidos de Saudade.</li>
                                    <li>Fines estadísticos agregados y anonimizados para optimizar el rendimiento de la plataforma.</li>
                                </ul>
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">4. Uso de Cookies y Tecnologías de Seguimiento</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            El Sitio Web utiliza cookies y tecnologías similares para mejorar la experiencia del Usuario, personalizar el contenido, y realizar análisis estadísticos sobre el uso de la Plataforma. El Usuario puede deshabilitar las cookies en las configuraciones de su navegador, aunque esto podría afectar la funcionalidad de la Plataforma.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            Algunos terceros podrán agregar cookies durante el uso de nuestros sistemas para proveer servicios de análisis y pago a Saudade. Actualmente, trabajamos con los siguientes proveedores:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li><strong>Stripe</strong> (Procesamiento de pagos y prevención de fraudes): <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://stripe.com/privacy</a></li>
                            <li><strong>Vercel Analytics</strong> (Rendimiento y analíticas de carga): <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://vercel.com/legal/privacy-policy</a></li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">5. Transferencias de Datos y Proveedores de Infraestructura</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Saudade no vende, renta ni comparte datos personales con terceros para fines comerciales. Sus datos personales e información clínica solo serán transferidos en los siguientes supuestos:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                Cuando sea activado y autorizado explícitamente por el Terapeuta para integraciones externas (ej. Google Calendar, Zoom, Google Meet).
                            </li>
                            <li>
                                Ante un requerimiento fundado y motivado de una autoridad judicial o sanitaria competente conforme a la legislación aplicable.
                            </li>
                            <li>
                                Con proveedores externos de infraestructura tecnológica (servicios de hosting, almacenamiento en la nube, procesamiento de base de datos, APIs de Inteligencia Artificial) estrictamente necesarios para la prestación del servicio. Saudade utiliza los siguientes proveedores líderes en seguridad que se sujetan a sus correspondientes políticas de privacidad y seguridad:
                                <ul className="list-circle pl-6 mt-2 space-y-1">
                                    <li><strong>Supabase:</strong> Plataforma para la autenticación de usuarios, base de datos relacional y almacenamiento de archivos en la nube.</li>
                                    <li><strong>Stripe:</strong> Pasarela de pago segura para cobros de suscripciones premium.</li>
                                    <li><strong>Vercel:</strong> Proveedor de alojamiento de la aplicación y analíticas de rendimiento.</li>
                                    <li><strong>OpenAI / APIs de IA:</strong> Modelos de lenguaje natural y procesamiento de voz utilizados para la asistencia y transcripción clínica inteligente (ambient scribe). Los datos clínicos procesados por este medio no son compartidos con terceros para entrenamiento de modelos públicos.</li>
                                </ul>
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">6. Medidas de Seguridad</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Saudade implementa medidas de seguridad técnicas, físicas y administrativas avanzadas para garantizar la confidencialidad, integridad y disponibilidad de la información de terapeutas y pacientes:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li><strong>Cifrado de datos:</strong> Cifrado de extremo a extremo en tránsito (SSL/TLS) y cifrado de datos sensibles en reposo.</li>
                            <li><strong>Cifrado a Nivel de Aplicación (ALE):</strong> Encriptación avanzada para datos ultra-sensibles como CURP y RFC utilizando claves simétricas.</li>
                            <li><strong>Trazabilidad e Inmutabilidad (NOM-024):</strong> Registros de auditoría (logs) de inicio de sesión, vistas de página y exportaciones de datos para asegurar el control inmutable de accesos.</li>
                            <li><strong>Segregación de base de datos:</strong> Separación lógica de información fiscal y notas clínicas para minimizar el radio de impacto.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">7. Derechos ARCO</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            El Usuario (Terapeuta) tiene derecho a conocer qué datos tenemos (Acceso), corregirlos si están desactualizados (Rectificación), solicitar su eliminación de nuestros sistemas (Cancelación) u oponerse al uso para fines específicos (Oposición).
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            <strong>Procedimiento:</strong> Para ejercer sus Derechos ARCO, deberá enviar una solicitud formal por correo electrónico a <a href="mailto:contacto@saudade.mx" className="text-primary hover:underline">contacto@saudade.mx</a> con copia a <a href="mailto:saudade.app.mx@gmail.com" className="text-primary hover:underline">saudade.app.mx@gmail.com</a>. La solicitud deberá contener su nombre completo, documento digital que acredite su identidad y una descripción clara de los derechos que desea ejercer. Responderemos en un plazo máximo de 20 días hábiles.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">8. Consentimiento para el Tratamiento de Datos Sensibles</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            De conformidad con el artículo 9 de la LFPDPPP, al aceptar este Aviso, usted (en su calidad de profesional de la salud) declara bajo protesta de decir verdad que ha recabado el consentimiento expreso y por escrito de sus pacientes para el tratamiento de sus datos sensibles, así como para el uso de plataformas digitales de terceros como Saudade para el resguardo de su expediente clínico.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">9. Cambios al Aviso de Privacidad</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Saudade se reserva el derecho de modificar o actualizar este Aviso de Privacidad en cualquier momento. Las modificaciones serán publicadas a través de nuestra plataforma web y se notificará su actualización. El uso continuado del servicio después de la publicación de los cambios constituye la aceptación del aviso vigente.
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
