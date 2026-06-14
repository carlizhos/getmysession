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
                            <p className="text-muted-foreground text-sm">Última actualización: Junio 2026</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="w-fit gap-2">
                        <ArrowLeft className="h-4 w-4" /> Volver
                    </Button>
                </div>

                {/* Content */}
                <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-foreground">
                    <p className="text-muted-foreground leading-relaxed">
                        <strong>Saudade</strong>, con domicilio en Tijuana, Baja California, México, C.P. 22117, reconoce la importancia de garantizar la protección de los datos personales proporcionados por los usuarios (en adelante el “Usuario” o “Usuarios”) que interactúan con nuestro sitio web <a href="https://saudade.mx/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://saudade.mx/</a>, o cualquier otro medio digital que utilicemos para ofrecer nuestros servicios (en adelante la “Plataforma”).
                    </p>

                    <p className="text-muted-foreground leading-relaxed">
                        Este Aviso de Privacidad se emite en cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y otras normativas aplicables. Su objetivo es que el Usuario tenga conocimiento sobre cómo recopilamos, utilizamos, almacenamos y, en su caso, transferimos sus datos personales.
                    </p>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">1. ACEPTACIÓN DE LOS TÉRMINOS</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            El acceso, navegación y/o uso de la Plataforma implica la aceptación expresa del presente Aviso de Privacidad y de los Términos y Condiciones de Uso por parte del Usuario. Si el Usuario no está de acuerdo con este aviso, deberá abstenerse de utilizar la Plataforma.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            El presente aviso de privacidad no aplica a los datos recopilados por terceros ajenos a Saudade. El Usuario deberá recibir un aviso de privacidad correspondiente de cualquier producto o servicio obtenido de terceros.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">2. DATOS PERSONALES RECOPILADOS</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Saudade podrá recopilar los siguientes tipos de datos personales del Usuario:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                <strong>Información de identificación personal:</strong> nombre completo, dirección de correo electrónico, número de teléfono, cédula profesional y otros datos necesarios para la correcta prestación de nuestros servicios y la verificación del perfil del profesional de la salud mental.
                            </li>
                            <li>
                                <strong>Datos financieros:</strong> información sobre métodos de pago y facturación, necesaria para procesar las transacciones y cobros de suscripción que el Usuario realice en la Plataforma.
                            </li>
                            <li>
                                <strong>Información técnica y de navegación:</strong> dirección IP, tipo de dispositivo, navegador utilizado, datos de geolocalización y otros datos generados a partir del uso de la Plataforma.
                            </li>
                            <li>
                                <strong>Datos sensibles y de pacientes:</strong> Podremos procesar y almacenar información relacionada con el estado de salud (física o mental) de los pacientes atendidos por el Usuario a través del uso de la herramienta de inteligencia artificial, grabaciones de audio de las sesiones (ambient scribe) o notas clínicas ingresadas en la Plataforma. Estos datos serán tratados con especial cuidado y estricta confidencialidad conforme a la LFPDPPP, implementando medidas avanzadas de cifrado.
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">3. FINALIDAD DEL TRATAMIENTO DE DATOS</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Los datos personales proporcionados serán utilizados para los siguientes fines:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                <strong>Prestación de servicios:</strong> para gestionar la cuenta del Usuario, proveer el expediente clínico digital, agenda, herramientas de transcripción y facilitar la interacción con herramientas de inteligencia artificial que ayudan a procesar las sesiones clínicas y redactar notas de evolución.
                            </li>
                            <li>
                                <strong>Cumplimiento de obligaciones legales:</strong> para cumplir con las normativas aplicables en materia de salud y protección de datos.
                            </li>
                            <li>
                                <strong>Mejora de la experiencia del Usuario:</strong> mediante el análisis de datos de navegación y uso de la Plataforma.
                            </li>
                            <li>
                                <strong>Facturación y pagos:</strong> para procesar cargos por las suscripciones contratadas a través de la Plataforma y emitir los comprobantes o facturas correspondientes.
                            </li>
                            <li>
                                <strong>Fines publicitarios y de marketing:</strong> para enviar información sobre novedades, mejoras, o eventos de la plataforma, siempre bajo el consentimiento del Usuario.
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">4. USO DE COOKIES</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            El Sitio Web utiliza cookies y tecnologías similares para mejorar la experiencia del Usuario, personalizar el contenido, y realizar análisis estadísticos sobre el uso de la Plataforma. El Usuario puede deshabilitar las cookies en las configuraciones de su navegador, aunque esto podría afectar la funcionalidad de la Plataforma.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            Algunos terceros podrán agregar cookies durante el uso de nuestros sistemas para proveer servicios de análisis y pago a Saudade. Actualmente, trabajamos con los siguientes proveedores:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li><strong>Stripe</strong> (Procesamiento de pagos): <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://stripe.com/privacy</a></li>
                            <li><strong>Vercel Analytics</strong> (Rendimiento y analíticas): <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://vercel.com/legal/privacy-policy</a></li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">5. INTELIGENCIA ARTIFICIAL Y DATOS RECOGIDOS</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Saudade utiliza herramientas de inteligencia artificial (IA) para procesar grabaciones de audio y texto introducido por el Usuario, facilitando la redacción automatizada de notas clínicas (formato SOAP u otros). Esta información se procesa para:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>Proporcionar resúmenes, transcripciones y borradores de notas de evolución personalizadas para el Usuario de manera rápida.</li>
                            <li>Mejorar la precisión y efectividad de la herramienta de procesamiento de lenguaje natural de la Plataforma.</li>
                            <li>Realizar análisis de patrones de uso para optimizar la experiencia general de la Plataforma.</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed">
                            *Nota: Toda la información de carácter clínico y de grabaciones procesada por la IA se trata bajo estrictas medidas de confidencialidad y procesamiento seguro de datos. No se comparten datos clínicos con terceros para el entrenamiento de modelos de inteligencia artificial públicos o generales.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">6. TRANSFERENCIA DE DATOS PERSONALES</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Saudade no compartirá ni divulgará los datos personales del Usuario o de sus pacientes a terceros, salvo en los siguientes casos:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                <strong>Terceros proveedores:</strong> En ocasiones, contratamos a proveedores externos para prestar servicios auxiliares (como procesamiento de pagos, almacenamiento en nube o procesamiento de modelos de IA). Estos terceros están obligados contractualmente a tratar los datos bajo estrictas medidas de confidencialidad y seguridad.
                            </li>
                            <li>
                                <strong>Obligaciones legales:</strong> Saudade puede compartir datos personales con autoridades gubernamentales o judiciales cuando sea legalmente requerido.
                            </li>
                            <li>
                                <strong>Fusión o adquisición:</strong> En caso de una venta, fusión o adquisición de Saudade, los datos personales podrían transferirse como parte de los activos de la plataforma.
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">7. CONFIDENCIALIDAD Y SEGURIDAD DE LOS DATOS</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Saudade adopta medidas de seguridad técnicas, físicas y administrativas adecuadas para proteger los datos personales e información clínica contra pérdida, uso indebido, acceso no autorizado, alteración o destrucción. Estas medidas incluyen:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li><strong>Cifrado de Datos:</strong> Durante la transmisión (SSL/TLS) entre el dispositivo del Usuario y nuestros servidores, así como el cifrado de datos en reposo.</li>
                            <li><strong>Control de Acceso:</strong> Limitamos el acceso a los datos únicamente al personal autorizado y bajo estrictos roles de seguridad.</li>
                            <li><strong>Copias de Seguridad:</strong> Realizamos respaldos periódicos y cifrados de la información en ubicaciones seguras.</li>
                            <li><strong>Auditorías de Seguridad:</strong> Evaluamos periódicamente nuestras herramientas e infraestructura para prevenir vulnerabilidades.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">8. PAGOS</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Los pagos realizados en la Plataforma se procesan de forma segura a través de la pasarela de Stripe. El Usuario autoriza a Saudade a procesar cargos utilizando esta herramienta y se sujeta a los términos, condiciones y políticas de privacidad correspondientes de Stripe.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">9. DERECHOS ARCO</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            El Usuario tiene el derecho de acceder, rectificar, cancelar u oponerse al tratamiento de sus datos personales (Derechos ARCO). Para ejercer estos derechos, deberá enviar una solicitud al correo electrónico <a href="mailto:contacto@saudade.mx" className="text-primary hover:underline">contacto@saudade.mx</a>.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            La solicitud deberá incluir:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>Nombre completo del Usuario y datos de contacto.</li>
                            <li>Documentación que acredite fehacientemente su identidad.</li>
                            <li>Descripción clara y precisa de los datos respecto de los cuales desea ejercer los Derechos ARCO.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">10. PROVEEDORES DE INFRAESTRUCTURA TECNOLÓGICA</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Saudade utiliza plataformas de cómputo en la nube y otros servicios tecnológicos líderes en el mercado para alojar, almacenar y procesar los datos de forma ágil y segura. Estos proveedores incluyen:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li><strong>Supabase:</strong> Plataforma para la autenticación de usuarios, base de datos relacional y almacenamiento en la nube.</li>
                            <li><strong>Stripe:</strong> Pasarela segura para la gestión de suscripciones y procesamiento de cargos recurrentes.</li>
                            <li><strong>Vercel:</strong> Proveedor de alojamiento web de la aplicación y herramientas de análisis del rendimiento del sitio.</li>
                            <li><strong>OpenAI:</strong> API y modelos de procesamiento de lenguaje natural utilizados para la transcripción y el dictado clínico inteligente (ambient scribe).</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed">
                            El Usuario acepta y entiende que sus datos pueden ser transferidos, almacenados y procesados por estos Proveedores de Infraestructura Tecnológica de acuerdo con sus respectivos términos y políticas de privacidad, garantizando niveles óptimos de seguridad.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">11. MODIFICACIONES AL AVISO DE PRIVACIDAD</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Saudade se reserva el derecho de modificar este Aviso de Privacidad en cualquier momento. Las modificaciones serán publicadas en la Plataforma y serán accesibles desde este apartado. Es responsabilidad del Usuario revisar periódicamente este documento. Al continuar usando la Plataforma, el Usuario acepta el Aviso de Privacidad vigente.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">12. CONTACTO</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Para cualquier duda o aclaración sobre este Aviso de Privacidad, el Usuario puede contactarnos a través del correo electrónico <a href="mailto:contacto@saudade.mx" className="text-primary hover:underline">contacto@saudade.mx</a> o en nuestro domicilio fiscal ubicado en Tijuana, Baja California, México, C.P. 22117.
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
