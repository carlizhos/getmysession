import Layout from '@/components/Layout';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/hooks/useOrganization';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle, Send, Search, User, Phone, Check, CheckCheck,
  Calendar, Brain, DollarSign, Activity, ClipboardList, Loader2, ArrowLeft,
  MapPin, Sparkles, AlertTriangle
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WaMessage {
  id: string;
  patient_id: string | null;
  direction: 'outbound' | 'inbound';
  phone: string;
  body: string;
  template_id: string | null;
  status: string;
  error_message?: string | null;
  read_at: string | null;
  created_at: string;
}

interface Conversation {
  phone: string;
  patient_id: string | null;
  patient_name: string;
  last_message: string;
  last_time: string;
  unread_count: number;
}

const MESSAGE_TEMPLATES = [
  { id: 'reminder_short', label: '📅 Recordatorio (Corto)', icon: Calendar, color: 'primary' },
  { id: 'reminder_presential', label: '📍 Recordatorio Presencial', icon: MapPin, color: 'success' },
  { id: 'payment_reminder', label: '💰 Recordatorio de Pago', icon: DollarSign, color: 'warning' },
  { id: 'reactivation', label: '🌿 Reagendar', icon: Activity, color: 'secondary' },
  { id: 'task_reminder', label: '📋 Recordatorio de Tarea', icon: ClipboardList, color: 'accent' },
  { id: 'followup_short', label: '🧠 Seguimiento Post-Sesión', icon: Brain, color: 'accent' },
  { id: 'birthday_congrats', label: '✨ Cumpleaños', icon: Sparkles, color: 'success' },
  { id: 'test', label: '📋 Test Psicométrico', icon: ClipboardList, color: 'accent' },
];

function getTemplateMessage(templateId: string, name: string): string {
  // Format name in Title Case (e.g. "ana flores" -> "Ana Flores")
  const cleanName = (name || '').trim();
  const formattedName = cleanName 
    ? cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    : 'Paciente';
  const firstName = formattedName.split(' ')[0];

  const templates: Record<string, string> = {
    reminder_short: `¡Hola, ${firstName}! ✨ Te esperamos el [Fecha] a las [Hora] para tu cita. Estamos listos para recibirte. Si necesitas confirmar o realizar algún cambio, responde a este mensaje. ¡Nos vemos pronto!`,
    reminder_presential: `¡Hola, ${firstName}! ✨ Te esperamos el [Fecha] a las [Hora] en [Dirección/Lugar]. Puedes guiarte con este mapa: [Link de Google Maps]. Si tienes alguna duda, puedes responder directamente aquí. ¡Qué ganas de verte!`,
    payment_reminder: `¡Hola, ${firstName}! 🌿 Esperamos que estés muy bien. Te compartimos el recordatorio amable de tu saldo por las sesiones realizadas ($[Monto] MXN).\n\n💳 Puedes realizar tu pago de forma segura aquí: [Link de Pago]\n\nO si realizaste transferencia, puedes responder a este mensaje adjuntando tu comprobante. ¡Muchas gracias por tu confianza!`,
    reactivation: `¡Hola, ${firstName}! Te hemos extrañado. 😊 ¿Te gustaría retomar tu espacio con nosotros? Puedes consultar la disponibilidad de agenda aquí: [Enlace]. ¡Será un gusto volver a coincidir!`,
    task_reminder: `¡Hola, ${firstName}! Paso a recordarte con mucho gusto que tienes pendiente completar: [Nombre de la tarea] para el [Fecha]. ¡Cada avance cuenta! Si tienes cualquier duda, responde aquí.`,
    followup_short: `¡Hola, ${firstName}! Esperamos que hayas tenido una excelente sesión hoy. 🤍 ¿Cómo te has sentido? Si tienes alguna duda o comentario, puedes responder directamente a este mensaje. ¡Gracias!`,
    birthday_congrats: `¡Feliz cumpleaños, ${firstName}! ✨ Celebramos tu vida y nos da mucha alegría acompañarte en tu proceso. Que este nuevo año esté lleno de paz, salud y momentos bonitos. ¡Disfruta mucho tu día! 🎂🤍`,
    test: `Hola ${firstName}, te comparto el enlace para completar tu prueba psicológica: [Enlace]. Es muy rápida y nos ayudará a darle continuidad a tu proceso. 📋`,
  };
  return templates[templateId] || '';
}

function formatMessageTime(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ayer ' + format(d, 'HH:mm');
  return format(d, 'd MMM HH:mm', { locale: es });
}

const Messages = () => {
  const { organization } = useOrganization();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [processingReminders, setProcessingReminders] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleProcessReminders = async () => {
    setProcessingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-whatsapp', {
        body: { action: 'send-batch-reminders' },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(
        `Recordatorios procesados con éxito. Se enviaron ${data.sentCount} recordatorios. ${
          data.isMockMode ? '(Modo Simulación)' : ''
        }`
      );
      fetchConversations();
    } catch (err: any) {
      toast.error('Error al procesar recordatorios: ' + (err.message || 'Error desconocido'));
    } finally {
      setProcessingReminders(false);
    }
  };

  const selectedConvo = conversations.find(c => c.phone === selectedPhone);

  // ── Fetch conversations ────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (!organization?.id) return;

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('id, phone, patient_id, direction, body, status, read_at, created_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }

    // Fetch patient names
    const patientIds = [...new Set((data || []).map(m => m.patient_id).filter(Boolean))];
    const patientMap: Record<string, string> = {};
    if (patientIds.length > 0) {
      const { data: patients } = await supabase
        .from('patients')
        .select('id, name')
        .in('id', (patientIds as string[]))
        .eq('organization_id', organization.id);
      patients?.forEach(p => { patientMap[p.id] = p.name; });
    }

    // Group by phone
    const grouped: Record<string, Conversation> = {};
    (data || []).forEach(m => {
      if (!grouped[m.phone]) {
        grouped[m.phone] = {
          phone: m.phone,
          patient_id: m.patient_id,
          patient_name: m.patient_id ? (patientMap[m.patient_id] || 'Paciente') : m.phone,
          last_message: m.body,
          last_time: m.created_at,
          unread_count: 0,
        };
      }
      if (m.direction === 'inbound' && !m.read_at) {
        grouped[m.phone].unread_count++;
      }
    });

    const sorted = Object.values(grouped).sort(
      (a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime()
    );
    setConversations(sorted);
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ── Realtime subscription ──────────────────────────────────────────────
  useEffect(() => {
    if (!organization?.id) return;
    const channel = supabase
      .channel('wa-messages')
      .on('postgres_changes', {
        event: '*', // Listen to INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `organization_id=eq.${organization.id}`,
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new as WaMessage;
          setMessages(prev => {
            // Prevent duplicates
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          fetchConversations();
        } else if (payload.eventType === 'UPDATE') {
          const msg = payload.new as WaMessage;
          setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [organization?.id, fetchConversations]);

  // ── Fetch messages for selected conversation ───────────────────────────
  useEffect(() => {
    if (!selectedPhone || !organization?.id) { setMessages([]); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('phone', selectedPhone)
        .order('created_at', { ascending: true });

      setMessages(data || []);

      // Mark inbound as read
      await supabase
        .from('whatsapp_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('organization_id', organization.id)
        .eq('phone', selectedPhone)
        .eq('direction', 'inbound')
        .is('read_at', null);

      fetchConversations();
    };
    fetch();
  }, [selectedPhone, organization?.id, fetchConversations]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // ── Send message ───────────────────────────────────────────────────────
  const handleSend = async (text?: string, templateId?: string) => {
    const body = text || newMessage.trim();
    if (!body || !selectedPhone || !organization?.id) return;

    const activeTplId = templateId || selectedTemplateId || undefined;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-whatsapp', {
        body: {
          action: 'send',
          phone: selectedPhone,
          body,
          organization_id: organization.id,
          patient_id: selectedConvo?.patient_id || null,
          template_id: activeTplId || null,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setNewMessage('');
      setSelectedTemplateId(null);
      setShowTemplates(false);
      inputRef.current?.focus();

      // Re-fetch messages
      const { data: msgs } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('phone', selectedPhone)
        .order('created_at', { ascending: true });
      setMessages(msgs || []);
      fetchConversations();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error('Error al enviar: ' + (error.message || 'Error desconocido'));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConvos = conversations.filter(c =>
    c.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  // ── Status icons ───────────────────────────────────────────────────────
  const StatusIcon = ({ status, errorMessage }: { status: string; errorMessage?: string | null }) => {
    if (status === 'read') return <CheckCheck className="h-3.5 w-3.5 text-blue-300" title="Leído en WhatsApp" />;
    if (status === 'delivered') return <CheckCheck className="h-3.5 w-3.5 text-white/90" title="Entregado en WhatsApp" />;
    if (status === 'failed') return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-200 bg-red-950/80 px-2 py-0.5 rounded-md border border-red-500/50 shadow-2xs" title={errorMessage || 'Meta WhatsApp rechazó la entrega (Ventana de 24h expirada o plantilla inactiva)'}>
        <AlertTriangle className="h-3 w-3 text-red-300 shrink-0" />
        <span>No entregado</span>
      </span>
    );
    return <Check className="h-3.5 w-3.5 text-white/70" title="Enviado a procesar" />;
  };

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header Section (Island Style) */}
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-5 rounded-2xl border border-border shadow-soft animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-black tracking-tight text-foreground">Mensajes</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Comunicación WhatsApp</p>
            </div>
          </div>
          <div className="flex gap-2 items-center w-full lg:w-auto justify-end">
            <Button
              variant="zen"
              onClick={handleProcessReminders}
              disabled={processingReminders || loading}
              className="bg-primary hover:bg-primary/90 text-white gap-2 h-10 px-4 rounded-xl shadow-md transition-all duration-200"
            >
              {processingReminders ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Procesar Recordatorios
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Chat Layout */}
        <Card variant="flat" className="flex h-[calc(100vh-260px)] overflow-hidden border-border shadow-soft">
          {/* Left: Conversation List */}
          <div className={cn(
            "flex flex-col border-r border-border bg-muted/20",
            selectedPhone ? "hidden lg:flex lg:w-80" : "w-full lg:w-80"
          )}>
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversación..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-background"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto scrollbar-zen">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConvos.length === 0 ? (
                <div className="text-center p-8">
                  <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">
                    {searchQuery ? 'Sin resultados' : 'No hay conversaciones aún'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Envía el primer mensaje desde el expediente de un paciente
                  </p>
                </div>
              ) : (
                filteredConvos.map(c => (
                  <button
                    key={c.phone}
                    onClick={() => setSelectedPhone(c.phone)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 text-left transition-all hover:bg-muted/60 border-b border-border/30",
                      selectedPhone === c.phone && "bg-primary/5 border-l-2 border-l-primary"
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-success" />
                      </div>
                      {c.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-success text-[10px] font-bold text-white">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn("text-sm font-semibold truncate", c.unread_count > 0 && "text-foreground")}>{c.patient_name}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                          {formatMessageTime(c.last_time)}
                        </span>
                      </div>
                      <p className={cn("text-xs truncate mt-0.5", c.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {c.last_message}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: Chat Area */}
          <div className={cn(
            "flex-1 flex flex-col",
            !selectedPhone ? "hidden lg:flex" : "flex"
          )}>
            {!selectedPhone ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="h-20 w-20 rounded-full bg-success/5 flex items-center justify-center mb-4">
                  <MessageCircle className="h-10 w-10 text-success/30" />
                </div>
                <h3 className="text-lg font-bold text-muted-foreground mb-1">Saudade Messaging</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Selecciona una conversación para ver los mensajes o envía uno nuevo desde el expediente de un paciente.
                </p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/10">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="lg:hidden"
                    onClick={() => setSelectedPhone(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="h-9 w-9 rounded-full bg-success/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{selectedConvo?.patient_name || selectedPhone}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>+{selectedPhone}</span>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-zen bg-gradient-to-b from-muted/10 to-background">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-sm text-muted-foreground">No hay mensajes aún. ¡Envía el primero!</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.direction === 'outbound' ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                          msg.direction === 'outbound'
                            ? "bg-success/90 text-white rounded-br-md"
                            : "bg-white border border-border rounded-bl-md"
                        )}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                          <div className={cn(
                            "flex items-center justify-end gap-1 mt-1",
                            msg.direction === 'outbound' ? "text-white/70" : "text-muted-foreground"
                          )}>
                            <span className="text-[10px]">{format(parseISO(msg.created_at), 'HH:mm')}</span>
                            {msg.direction === 'outbound' && <StatusIcon status={msg.status} errorMessage={msg.error_message} />}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Template Quick Actions */}
                {showTemplates && (
                  <div className="border-t border-border bg-muted/20 p-3">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {MESSAGE_TEMPLATES.map(tpl => (
                        <button
                          key={tpl.id}
                          onClick={() => {
                            const name = selectedConvo?.patient_name?.split(' ')[0] || 'paciente';
                            const msg = getTemplateMessage(tpl.id, name);
                            setNewMessage(msg);
                            setSelectedTemplateId(tpl.id);
                            setShowTemplates(false);
                            inputRef.current?.focus();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-xs font-medium whitespace-nowrap hover:bg-muted transition-colors"
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-3 border-t border-border bg-background">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowTemplates(!showTemplates)}
                      title="Plantillas"
                      className={cn(showTemplates && "text-success bg-success/10")}
                    >
                      <ClipboardList className="h-4 w-4" />
                    </Button>
                    <Input
                      ref={inputRef}
                      placeholder="Escribe un mensaje..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sending}
                      className="flex-1 bg-muted/30"
                    />
                    <Button
                      variant="zen"
                      size="icon-sm"
                      onClick={() => handleSend()}
                      disabled={!newMessage.trim() || sending}
                      className="bg-success hover:bg-success/90 text-white"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Messages;
