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
                        <strong>GetMySession</strong> (en adelante, &quot;GetMySession&quot;), reconoce la importancia de garantizar la protección de los datos personales y clínicos proporcionados por los usuarios (en adelante el “Usuario” o “Usuarios”) que interactúan con nuestra plataforma web <a href="https://app.getmysession.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://app.getmysession.com</a>.
                    </p>

                    <p className="text-muted-foreground leading-relaxed">
                        Esta Política de Privacidad y Tratamiento de Información se emite en estricto cumplimiento de la <strong>Ley Estatutaria 1581 de 2012</strong> de Protección de Datos Personales (Habeas Data), su Decreto Reglamentario 1377 de 2013, las circulares de la <strong>Superintendencia de Industria y Comercio (SIC)</strong> de Colombia y la normativa de historia clínica electrónica del Ministerio de Salud y Protección Social (<strong>Ley 2015 de 2020</strong> y <strong>Resolución 1995 de 1999</strong>).
                    </p>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">1. Identidad y Domicilio del Responsable</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            GetMySession es el responsable y encargado del tratamiento de los datos en su infraestructura de software. Para cualquier duda o ejercicio de sus derechos de Habeas Data (conocer, actualizar, rectificar y suprimir datos), puede contactarnos a través del canal oficial: <a href="mailto:contacto@getmysession.com" className="text-primary hover:underline">contacto@getmysession.com</a>.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">2. Datos Personales Recabados</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Para la correcta prestación de nuestros servicios, GetMySession recopila:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                <strong>Datos de Identificación y Contacto del Terapeuta:</strong> Nombre completo, Cédula de Ciudadanía / NIT, tarjeta profesional (Colpsic), registro ReTHUS, código de habilitación REPS, correo electrónico, teléfono, dirección del consultorio y datos de facturación electrónica DIAN.
                            </li>
                            <li>
                                <strong>Datos de Pacientes (Cargados por el Terapeuta):</strong> Nombre, tipo y número de documento (CC, TI, CE, PPT), fecha de nacimiento, sexo, municipio de residencia (código DANE), zona territorial, tipo de usuario SGSSS, historial clínico, notas de evolución, tareas, diagnósticos (CIE-10) y datos de la historia clínica que el Terapeuta decida custodiar en la plataforma.
                            </li>
                            <li>
                                <strong>Datos Personales Sensibles de Pacientes:</strong> El Terapeuta reconoce y acepta que las historias clínicas contienen datos de carácter sensible (relacionados con el estado de salud física y mental, historial de terapias, etc.). GetMySession trata esta información bajo estrictas medidas de seguridad y cifrado.
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
                                    <li>Provisión de servicios de gestión clínica, historia clínica electrónica interoperable, agenda y CRM de pacientes.</li>
                                    <li>Almacenamiento y custodia de historias clínicas conforme a los estándares de la Ley 2015 de 2020 y la Resolución 1995 de 1999 de MinSalud.</li>
                                    <li>Procesamiento y generación de notas clínicas mediante herramientas de Inteligencia Artificial (transcripción y dictado).</li>
                                    <li>Procesamiento de pagos y suscripciones premium a través de pasarelas seguras.</li>
                                    <li>Emisión de Facturación Electrónica en Salud (FEV Salud) ante la DIAN y generación de archivos RIPS (JSON Res. 2275 de 2023 de MinSalud).</li>
                                    <li>Soporte técnico y atención de solicitudes de Habeas Data.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>Finalidades Secundarias (no necesarias para la relación jurídica):</strong>
                                <ul className="list-circle pl-6 mt-2 space-y-1">
                                    <li>Notificación de actualizaciones del servicio o mejoras en las funcionalidades.</li>
                                    <li>Envío de promociones del programa de referidos de GetMySession.</li>
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
                            Algunos terceros podrán agregar cookies durante el uso de nuestros sistemas para proveer servicios de análisis y pago a GetMySession. Actualmente, trabajamos con los siguientes proveedores:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li><strong>Stripe</strong> (Procesamiento de pagos y prevención de fraudes): <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://stripe.com/privacy</a></li>
                            <li><strong>Vercel Analytics</strong> (Rendimiento y analíticas de carga): <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://vercel.com/legal/privacy-policy</a></li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">5. Transferencias de Datos y Proveedores de Infraestructura</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            GetMySession no vende, renta ni comparte datos personales con terceros para fines comerciales. Sus datos personales e información clínica solo serán transferidos en los siguientes supuestos:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                Cuando sea activado y autorizado explícitamente por el Terapeuta para integraciones externas (ej. Google Calendar, Zoom, Google Meet).
                            </li>
                            <li>
                                Ante un requerimiento fundado y motivado de una autoridad judicial o sanitaria competente conforme a la legislación aplicable.
                            </li>
                            <li>
                                Con proveedores externos de infraestructura tecnológica (servicios de hosting, almacenamiento en la nube, procesamiento de base de datos, APIs de Inteligencia Artificial) estrictamente necesarios para la prestación del servicio. GetMySession utiliza los siguientes proveedores líderes en seguridad que se sujetan a sus correspondientes políticas de privacidad y seguridad:
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
                            GetMySession implementa medidas de seguridad técnicas, físicas y administrativas avanzadas para garantizar la confidencialidad, integridad y disponibilidad de la información de terapeutas y pacientes:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li><strong>Cifrado de datos:</strong> Cifrado de extremo a extremo en tránsito (SSL/TLS) y cifrado de datos sensibles en reposo.</li>
                            <li><strong>Cifrado a Nivel de Aplicación (ALE):</strong> Encriptación avanzada para datos sensibles de identificación (cédulas y NIT) utilizando claves simétricas.</li>
                            <li><strong>Trazabilidad e Inmutabilidad (Ley 2015 de 2020 & Res. 1995 de 1999):</strong> Registros de auditoría (logs) de inicio de sesión, vistas de página y exportaciones de datos para asegurar el control inmutable de accesos a la historia clínica.</li>
                            <li><strong>Segregación de base de datos:</strong> Separación lógica de información fiscal y notas clínicas para minimizar el radio de impacto.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">7. Derechos de los Titulares (Habeas Data - Ley 1581 de 2012)</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Los titulares de los datos tienen derecho a conocer, actualizar, rectificar y suprimir su información personal en nuestros registros, así como a revocar la autorización otorgada para el tratamiento de sus datos, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            <strong>Procedimiento:</strong> Para ejercer sus derechos de Habeas Data, deberá enviar una solicitud formal por correo electrónico a <a href="mailto:contacto@getmysession.com" className="text-primary hover:underline">contacto@getmysession.com</a>. La solicitud deberá contener su nombre completo, documento digital que acredite su identidad y una descripción clara de la consulta o reclamo. Responderemos en el término legal de quince (15) días hábiles previsto por el Artículo 15 de la Ley 1581 de 2012.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">8. Consentimiento para el Tratamiento de Datos Sensibles en Salud</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            De conformidad con la Ley 1581 de 2012, la Ley 1090 de 2006 (Código Deontológico del Psicólogo en Colombia) y la Resolución 1995 de 1999 de MinSalud, al utilizar nuestra plataforma, usted (en su calidad de profesional de la salud habilitado) declara bajo la gravedad de juramento que ha recabado el consentimiento informado, expreso y por escrito de sus pacientes para la atención psicológica y el registro de sus datos de salud en una historia clínica electrónica.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">9. Cambios al Aviso de Privacidad</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            GetMySession se reserva el derecho de modificar o actualizar este Aviso de Privacidad en cualquier momento. Las modificaciones serán publicadas a través de nuestra plataforma web y se notificará su actualización. El uso continuado del servicio después de la publicación de los cambios constituye la aceptación del aviso vigente.
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

export default PrivacyPolicy;
