import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Settings, 
  Users, 
  Calendar, 
  FileText, 
  DollarSign, 
  Shield, 
  ChevronRight, 
  ArrowLeft,
  BookOpen,
  MessageCircle,
  HelpCircle,
  ExternalLink,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// ── Tipos y Datos ─────────────────────────────────────────────────────────────

interface Article {
  id: string;
  title: string;
  content: React.ReactNode;
  category: string;
}

interface Category {
  id: string;
  name: string;
  icon: any;
  description: string;
}

const CATEGORIES: Category[] = [
  { id: 'config', name: 'Configuración', icon: Settings, description: 'Perfiles, horarios, comisiones y credenciales.' },
  { id: 'pacientes', name: 'Pacientes', icon: Users, description: 'Expedientes en 4 pestañas y cumplimiento NOM-024.' },
  { id: 'agenda', name: 'Agenda', icon: Calendar, description: 'Servicios, citas y reserva pública.' },
  { id: 'whatsapp', name: 'WhatsApp CRM', icon: MessageCircle, description: 'Plantillas Meta, estados de entrega y recordatorios.' },
  { id: 'notas', name: 'Notas Clínicas', icon: FileText, description: 'Plantillas dinámicas, dictado IA y NOM-024.' },
  { id: 'finanzas', name: 'Finanzas', icon: DollarSign, description: 'Pagos, Stripe y honorarios netos.' },
  { id: 'seguridad', name: 'Seguridad', icon: Shield, description: 'Protección de datos y accesos.' },
];

const ARTICLES: Article[] = [
  {
    id: 'whatsapp-meta-templates',
    category: 'whatsapp',
    title: 'Plantillas de Meta WhatsApp y Estado de Entrega',
    content: (
      <div className="space-y-6">
        <p>GetMySession se conecta directamente con la API Cloud de Meta WhatsApp para enviar confirmaciones y recordatorios automáticos de citas a tus pacientes.</p>
        
        <h3 className="text-xl font-bold text-black pt-4">Ventana de 24 Horas de Meta</h3>
        <p>Meta exige que para enviar mensajes a un usuario después de transcurridas 24 horas desde su último mensaje, se utilice una <strong>Plantilla Oficial (Template)</strong> registrada en Meta Business Manager.</p>

        <h3 className="text-xl font-bold text-black pt-4">Indicadores de Estado en el Chat</h3>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li><strong>Palomita blanca (✓):</strong> Mensaje enviado a procesar por Meta.</li>
          <li><strong>Doble palomita (✓✓):</strong> Mensaje entregado exitosamente en el celular del paciente.</li>
          <li><strong>Doble palomita azul (✓✓):</strong> Mensaje leído por el paciente.</li>
          <li><strong>⚠️ No entregado (Botón rojo):</strong> Meta rechazó la entrega. Al pasar el cursor o hacer clic, verás el motivo exacto (ej. <em>Error 131047: Ventana de 24h expirada o plantilla inactiva</em>).</li>
        </ul>

        <h3 className="text-xl font-bold text-black pt-4">Cómo registrar la plantilla "reminder" en Meta</h3>
        <ol className="list-decimal pl-5 space-y-2 text-gray-700">
          <li>Accede a tu panel de <a href="https://business.facebook.com/wa/manage/templates" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Meta Business Suite {'>'} Plantillas de WhatsApp</a>.</li>
          <li>Haz clic en <strong>Crear plantilla</strong>.</li>
          <li>Selecciona Categoría: <strong>Utilidad (Utility)</strong>, Nombre: <code className="bg-gray-100 px-2 py-0.5 rounded text-sm font-mono">reminder</code>, Idioma: <strong>Español (México) / es_MX</strong>.</li>
          <li>Ingresa el texto del recordatorio y guarda. Meta aprueba la plantilla automáticamente en menos de 1 minuto.</li>
        </ol>
      </div>
    )
  },
  {
    id: 'config-horarios-save',
    category: 'config',
    title: 'Configuración de Horarios de Atención y Guardado',
    content: (
      <div className="space-y-6">
        <p>Establece tus días laborables, horarios por día y excepciones (días festivos o vacaciones) en <strong>Configuración {'>'} Horarios y Comisiones</strong>.</p>
        
        <h3 className="text-xl font-bold text-black pt-4">Guardado Inmediato</h3>
        <p>Para evitar pérdida de información al cambiar días o rangos de horas, la pestaña cuenta con:</p>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li><strong>Barra Superior de Acción:</strong> Botón <code>✓ Guardar Horarios</code> visible inmediatamente en el encabezado sin necesidad de hacer scroll.</li>
          <li><strong>Pie de Tarjeta de Horario:</strong> Botón secundario al final de la lista de días.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'config-remember-email',
    category: 'config',
    title: 'Recordar Correo Electrónico en el Inicio de Sesión',
    content: (
      <div className="space-y-6">
        <p>En la pantalla de Login (<code className="bg-gray-100 px-2 py-0.5 rounded text-sm font-mono">app.getmysession.mx/login</code>) puedes marcar la casilla <strong>"Recordar mi correo electrónico"</strong>.</p>
        <p>Al activarla, GetMySession guardará de forma segura tu correo en tu navegador local para que en tus siguientes visitas no tengas que volver a escribirlo.</p>
      </div>
    )
  },
  {
    id: 'pacientes-registro-tabs',
    category: 'pacientes',
    title: 'Registro de Pacientes en Modal de 4 Pestañas',
    content: (
      <div className="space-y-6">
        <p>Al hacer clic en <strong>Registrar Paciente</strong>, se abre un cuadro de diálogo amplio dividido en 4 pestañas para mantener una captura ordenada:</p>
        
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li><strong>1. Generales:</strong> Nombre completo, fecha de nacimiento, género y teléfono internacional con selector donde 🇲🇽 México aparece como predeterminado seguido de 🇺🇸 EE.UU.</li>
          <li><strong>2. Emergencia:</strong> Nombre del contacto de emergencia, parentesco y teléfono directo.</li>
          <li><strong>3. Facturación:</strong> RFC, Razón Social, Código Postal y Régimen Fiscal para emisión de facturas CFDI 4.0.</li>
          <li><strong>4. Notas:</strong> Antecedentes iniciales o motivo de consulta de apertura.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'agenda-config',
    category: 'agenda',
    title: 'Configuración de Servicios y Agenda',
    content: (
      <div className="space-y-6">
        <p>GetMySession permite una gestión dual de tu agenda, dividiendo tus actividades en servicios públicos y privados para optimizar tu práctica clínica.</p>
        
        <h3 className="text-xl font-bold text-black pt-4">Servicios y Costos</h3>
        <p>En el panel de Configuración, puedes definir los servicios que ofreces. Cada servicio incluye:</p>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li><strong>Nombre del Servicio:</strong> Ej. Terapia Individual, Pareja, etc.</li>
          <li><strong>Duración:</strong> Tiempo asignado a la sesión.</li>
          <li><strong>Precio:</strong> Honorarios que se mostrarán al paciente.</li>
          <li><strong>Visibilidad:</strong> Elige si el servicio es seleccionable en tu página de reserva pública.</li>
        </ul>

        <h3 className="text-xl font-bold text-black pt-4">Preguntas de Pre-reserva</h3>
        <p>Antes de que un paciente confirme una cita, puedes configurar preguntas clave para entender su motivo de consulta. Esto te permite llegar mejor preparado a la primera sesión.</p>
      </div>
    )
  },
  {
    id: 'notas-templates',
    category: 'notas',
    title: 'Uso de Plantillas Dinámicas y Dictado IA',
    content: (
      <div className="space-y-6">
        <p>Nuestro sistema de notas clínicas está diseñado para adaptarse a tu enfoque terapéutico, cumpliendo con la norma <strong>NOM-024-SSA3-2012</strong>.</p>
        
        <h3 className="text-xl font-bold text-black pt-4">Plantillas del Sistema y Dictado por Voz</h3>
        <p>GetMySession incluye plantillas basadas en los enfoques más utilizados (SOAP, TCC, ACT, DBT, Humanista/Sistémica) y permite utilizar dictado por voz inteligente para redactar en segundos.</p>

        <h3 className="text-xl font-bold text-black pt-4">Personalización Total</h3>
        <p>Puedes crear tus propias plantillas en <strong>Configuración {'>'} Plantillas de Notas</strong>. Elige qué secciones quieres ver (Estado de Ánimo, Plan de Acción, etc.) y personaliza sus nombres.</p>
      </div>
    )
  },
  {
    id: 'finanzas-stripe',
    category: 'finanzas',
    title: 'Integración con Stripe Connect y Honorarios Netos',
    content: (
      <div className="space-y-6">
        <p>GetMySession se integra directamente con Stripe para facilitar el cobro de tus sesiones de forma profesional y segura.</p>
        
        <h3 className="text-xl font-bold text-black pt-4">Cómo conectar tu cuenta</h3>
        <p>Dirígete a <strong>Configuración {'>'} Integraciones</strong> y haz clic en "Conectar con Stripe". Sigue los pasos para vincular tu cuenta bancaria y empezar a recibir pagos internacionales o locales.</p>
        
        <h3 className="text-xl font-bold text-black pt-4">Cálculo de Honorarios Netos</h3>
        <p>El resumen financiero calcula automáticamente el ingreso bruto, descuenta las comisiones pactadas y muestra tu ingreso neto real generado.</p>
      </div>
    )
  },
  {
    id: 'pacientes-expediente',
    category: 'pacientes',
    title: 'El Expediente Clínico Digital',
    content: (
      <div className="space-y-6">
        <p>Centraliza toda la información de tus pacientes en un solo lugar, cumpliendo con los estándares de privacidad más altos.</p>
        
        <h3 className="text-xl font-bold text-black pt-4">Documentación y Consentimiento</h3>
        <p>Cada perfil de paciente incluye una sección de documentos donde puedes cargar el consentimiento informado firmado o cualquier prueba psicométrica aplicada.</p>
        
        <h3 className="text-xl font-bold text-black pt-4">Historial de Sesiones</h3>
        <p>Visualiza el progreso a lo largo del tiempo con la línea de vida del paciente, donde se agrupan sus notas, tareas y evoluciones diagnósticas.</p>
      </div>
    )
  }
];

// ── Componente Principal ──────────────────────────────────────────────────────

const HelpCenter = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Filtrar artículos
  const filteredArticles = useMemo(() => {
    return ARTICLES.filter(art => {
      const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory ? art.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const currentArticle = useMemo(() => 
    ARTICLES.find(a => a.id === selectedArticleId), 
  [selectedArticleId]);

  const handleGoBack = () => {
    if (selectedArticleId) setSelectedArticleId(null);
    else if (selectedCategory) setSelectedCategory(null);
    else navigate(-1);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* Header Superior */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-lg">S</span>
          </div>
          <span className="font-bold tracking-tight text-lg">Help Center</span>
        </div>

        <div className="flex-1 max-w-xl px-8 hidden md:block">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-black transition-colors" />
            <input 
              type="text" 
              placeholder="¿En qué podemos ayudarte?" 
              className="w-full bg-[#F5F5F7] border-none rounded-full h-10 pl-10 pr-4 text-sm focus:ring-1 focus:ring-gray-200 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="rounded-full hover:bg-[#F5F5F7] text-sm font-medium gap-2"
        >
          Volver a la App
        </Button>
      </header>

      <main className="max-w-7xl mx-auto flex min-h-[calc(100vh-64px)]">
        
        {/* Columna Izquierda: Sidebar */}
        <aside className="w-64 border-r border-gray-50 pt-12 pr-6 hidden lg:block sticky top-16 h-[calc(100vh-64px)]">
          <div className="space-y-1">
            <button 
              onClick={() => { setSelectedCategory(null); setSelectedArticleId(null); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                !selectedCategory ? "bg-[#F5F5F7] text-black" : "text-gray-500 hover:bg-gray-50 hover:text-black"
              )}
            >
              <BookOpen className="h-4 w-4" /> Inicio
            </button>
            <div className="pt-6 pb-2 px-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Categorías</span>
            </div>
            {CATEGORIES.map(cat => (
              <button 
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); setSelectedArticleId(null); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  selectedCategory === cat.id ? "bg-[#F5F5F7] text-black" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <cat.icon className="h-4 w-4" />
                {cat.name}
              </button>
            ))}
          </div>

          <div className="mt-12 p-5 bg-[#F5F5F7] rounded-3xl space-y-4">
            <h4 className="font-bold text-sm">¿Necesitas más ayuda?</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">Habla con nuestro equipo de soporte directamente.</p>
            <Button className="w-full bg-black text-white hover:bg-gray-800 rounded-xl text-xs h-9 gap-2">
              <MessageCircle className="h-3.5 w-3.5" /> Contactar Soporte
            </Button>
          </div>
        </aside>

        {/* Columna Central: Contenido */}
        <section className="flex-1 pt-12 px-6 md:px-12 pb-24 overflow-y-auto">
          
          {selectedArticleId && currentArticle ? (
            /* Vista de Artículo */
            <article className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button 
                onClick={() => setSelectedArticleId(null)}
                className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-black mb-8 transition-colors group"
              >
                <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" /> Volver
              </button>
              
              <div className="space-y-4 mb-12">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Guía GetMySession</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {CATEGORIES.find(c => c.id === currentArticle.category)?.name}
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-black leading-tight">
                  {currentArticle.title}
                </h1>
              </div>

              <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed text-lg">
                {currentArticle.content}
              </div>

              <div className="mt-20 pt-12 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-400">¿Fue útil este artículo?</span>
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl px-6">Sí</Button>
                  <Button variant="outline" className="rounded-xl px-6">No</Button>
                </div>
              </div>
            </article>
          ) : selectedCategory ? (
            /* Vista de Categoría */
            <div className="max-w-4xl animate-in fade-in duration-500">
              <div className="mb-12">
                <h2 className="text-3xl font-black tracking-tight mb-2">
                  {CATEGORIES.find(c => c.id === selectedCategory)?.name}
                </h2>
                <p className="text-gray-500">{CATEGORIES.find(c => c.id === selectedCategory)?.description}</p>
              </div>

              <div className="grid gap-4">
                {filteredArticles.length > 0 ? (
                  filteredArticles.map(art => (
                    <button 
                      key={art.id}
                      onClick={() => setSelectedArticleId(art.id)}
                      className="group flex items-center justify-between p-6 rounded-2xl border border-gray-100 bg-white hover:border-black hover:shadow-xl hover:shadow-black/5 transition-all text-left"
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-lg group-hover:text-black">{art.title}</h4>
                        <p className="text-sm text-gray-400">Lectura de 3 min</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all" />
                    </button>
                  ))
                ) : (
                  <div className="py-20 text-center space-y-3">
                    <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                      <HelpCircle className="h-6 w-6" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">No se encontraron artículos en esta categoría.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Vista de Inicio (Grid) */
            <div className="animate-in fade-in duration-700">
              <div className="max-w-2xl mb-16">
                <h1 className="text-5xl font-black tracking-tight text-black mb-6">
                  Estamos aquí para acompañarte.
                </h1>
                <p className="text-xl text-gray-500 leading-relaxed">
                  Explora nuestras guías diseñadas para ayudarte a dominar GetMySession y elevar tu práctica clínica.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="group flex flex-col p-8 rounded-[32px] border border-gray-100 bg-white hover:border-black hover:shadow-2xl hover:shadow-black/5 transition-all text-left"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-[#F5F5F7] flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors">
                      <cat.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{cat.name}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed mb-6">{cat.description}</p>
                    <div className="mt-auto flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">
                      Explorar guías <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-24 p-12 rounded-[48px] bg-black text-white overflow-hidden relative">
                <div className="relative z-10 max-w-lg">
                  <h2 className="text-3xl font-black tracking-tight mb-4">¿Prefieres atención personalizada?</h2>
                  <p className="text-gray-400 mb-8 leading-relaxed">Nuestro equipo de expertos está disponible para resolver dudas técnicas o ayudarte con la configuración inicial de tu consultorio.</p>
                  <Button className="bg-white text-black hover:bg-gray-200 rounded-full px-8 h-12 font-bold">
                    Agendar Llamada de Soporte
                  </Button>
                </div>
                <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-gray-800 to-transparent opacity-50 hidden lg:block" />
              </div>
            </div>
          )}
        </section>

        {/* Columna Derecha: On this page (Solo visible en artículos) */}
        {selectedArticleId && (
          <aside className="w-64 pt-24 pl-8 hidden xl:block sticky top-16 h-[calc(100vh-64px)]">
            <div className="space-y-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">En esta página</span>
              <nav className="space-y-4">
                <button className="block text-sm font-medium text-black border-l-2 border-black pl-4">Introducción</button>
                <button className="block text-sm font-medium text-gray-400 hover:text-black pl-4 transition-colors">Conceptos Clave</button>
                <button className="block text-sm font-medium text-gray-400 hover:text-black pl-4 transition-colors">Pasos a seguir</button>
                <button className="block text-sm font-medium text-gray-400 hover:text-black pl-4 transition-colors">Preguntas Frecuentes</button>
              </nav>

              <div className="pt-12 border-t border-gray-50">
                <button className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-black transition-colors">
                  <ExternalLink className="h-3 w-3" /> Compartir artículo
                </button>
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* Footer Minimalista */}
      <footer className="border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-gray-400 text-[11px] font-medium uppercase tracking-widest">
          <div className="flex items-center gap-6">
            <span>&copy; 2026 GetMySession. Todos los derechos reservados.</span>
            <a href="#" className="hover:text-black transition-colors">Términos</a>
            <a href="#" className="hover:text-black transition-colors">Privacidad</a>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-black transition-colors">Status</a>
            <a href="#" className="hover:text-black transition-colors">Twitter</a>
            <a href="#" className="hover:text-black transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HelpCenter;
