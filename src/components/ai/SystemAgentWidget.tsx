import { useState, useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/hooks/useOrganization';
import {
    X,
    Send,
    Loader2,
    User,
    Sparkles,
    RotateCcw,
    Minimize2,
    Zap,
    CalendarPlus,
    FileText,
    BarChart3,
    Search,
    BrainCircuit,
    UserPlus,
    DollarSign,
    ClipboardList,
    CalendarX,
    Users,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

// ── Quick Action Chips ───────────────────────────────────────────────────────
const QUICK_ACTIONS = [
    { label: '📅 Agenda del día', prompt: '¿Qué tengo agendado para hoy?', icon: BarChart3 },
    { label: '➕ Agendar cita', prompt: 'Quiero agendar una cita', icon: CalendarPlus },
    { label: '🔍 Buscar paciente', prompt: 'Busca un paciente', icon: Search },
    { label: '🧑‍⚕️ Nuevo paciente', prompt: 'Quiero registrar un nuevo paciente', icon: UserPlus },
    { label: '💰 Registrar cobro', prompt: 'Quiero cobrar una sesión', icon: DollarSign },
    { label: '🧾 Facturar pagos', prompt: '¿Qué pagos tengo disponibles para facturar?', icon: FileText },
    { label: '📝 Crear nota clínica', prompt: 'Quiero crear una nota de sesión', icon: ClipboardList },
    { label: '❌ Cancelar cita', prompt: 'Necesito cancelar una cita', icon: CalendarX },
    { label: '💵 Resumen financiero', prompt: '¿Cuánto he ganado este mes?', icon: DollarSign },
    { label: '👥 Ver prospectos', prompt: '¿Tengo prospectos web nuevos?', icon: Users },
];

// ── Markdown-lite renderer ──────────────────────────────────────────────────
const renderMarkdown = (text: string): string => {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono">$1</code>')
        .replace(/^[•●]\s/gm, '→ ')
        .replace(/\n/g, '<br />');
};

// ── Component ────────────────────────────────────────────────────────────────
const SystemAgentWidget = () => {
    const { organization } = useOrganization();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPulse, setShowPulse] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
            setShowPulse(false);
        }
    }, [isOpen]);

    // ── Send message ─────────────────────────────────────────────────────────
    const sendMessage = useCallback(async (text?: string) => {
        const content = (text || input).trim();
        if (!content || isLoading) return;

        if (!organization?.id) {
            return;
        }

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content,
            timestamp: new Date(),
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('system-agent', {
                body: {
                    messages: updatedMessages.map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                    organization_id: organization.id,
                },
            });

            if (error) throw error;

            const assistantMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: data.reply || 'Lo siento, no pude procesar tu solicitud.',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (err: unknown) {
            console.error('System agent error:', err);
            setMessages(prev => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: '⚠️ Hubo un error al conectar con el agente. Intenta de nuevo en unos segundos.',
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, organization?.id]);

    // ── Keyboard handling ────────────────────────────────────────────────────
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ── Reset conversation ───────────────────────────────────────────────────
    const resetChat = () => {
        setMessages([]);
        inputRef.current?.focus();
    };

    return (
        <>
            {/* ── Chat Panel ─────────────────────────────────────────────── */}
            <div
                className={cn(
                    'fixed z-[60] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    // Mobile: full screen | Desktop: floating card (left of help widget)
                    'bottom-0 right-0 sm:bottom-24 sm:right-4',
                    'w-full sm:w-[420px] sm:max-w-[calc(100vw-2rem)]',
                    isOpen
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-8 pointer-events-none'
                )}
            >
                <div className={cn(
                    'flex flex-col overflow-hidden bg-background border border-border shadow-2xl',
                    // Mobile: full height | Desktop: rounded card
                    'h-[100dvh] sm:h-[600px] sm:rounded-2xl',
                )}>
                    {/* ── Header ──────────────────────────────────────────── */}
                    <div className="relative flex items-center gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-violet-500/10 via-background to-indigo-500/5">
                        {/* Glow */}
                        <div className="absolute -top-8 -left-8 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl" />
                        <div className="absolute -top-4 right-12 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl" />

                        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 shadow-inner">
                            <BrainCircuit className="h-5 w-5 text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0 relative">
                            <h3 className="font-bold text-sm tracking-tight">Saudade AI</h3>
                            <p className="text-xs text-muted-foreground">
                                Agente inteligente · Ejecuta acciones
                            </p>
                        </div>
                        <div className="flex items-center gap-1 relative">
                            {messages.length > 0 && (
                                <button
                                    onClick={resetChat}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    title="Nueva conversación"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                            )}
                            {/* Desktop minimize, Mobile close */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="Cerrar"
                            >
                                <span className="hidden sm:block"><Minimize2 className="h-3.5 w-3.5" /></span>
                                <span className="sm:hidden"><X className="h-4 w-4" /></span>
                            </button>
                        </div>
                    </div>

                    {/* ── Messages ────────────────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
                        {messages.length === 0 ? (
                            /* Empty State */
                            <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
                                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/15 to-indigo-500/10 flex items-center justify-center mb-5 shadow-lg shadow-violet-500/5">
                                    <BrainCircuit className="h-8 w-8 text-violet-500" />
                                </div>
                                <h4 className="font-bold text-base mb-1.5">
                                    ¡Hola! 🧠
                                </h4>
                                <p className="text-sm text-muted-foreground mb-6 max-w-[280px] leading-relaxed">
                                    Soy tu mano derecha digital. Agendo citas, registro cobros, creo notas clínicas, facturo, asigno tests y mucho más. ¡Solo dime qué necesitas!
                                </p>

                                {/* Quick action chips */}
                                <div className="w-full space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                                        Acciones rápidas
                                    </p>
                                    {QUICK_ACTIONS.map((action, i) => (
                                        <button
                                            key={i}
                                            onClick={() => sendMessage(action.prompt)}
                                            className={cn(
                                                'w-full text-left text-sm px-4 py-2.5 rounded-xl',
                                                'border border-border/60 bg-card/50 hover:bg-violet-500/5 hover:border-violet-500/20',
                                                'text-foreground/80 hover:text-foreground',
                                                'transition-all duration-200 group/q flex items-center gap-3'
                                            )}
                                            style={{ animationDelay: `${i * 80}ms` }}
                                        >
                                            <action.icon className="h-4 w-4 text-muted-foreground group-hover/q:text-violet-500 transition-colors flex-shrink-0" />
                                            <span>{action.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Message bubbles */
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        'flex gap-2.5 animate-fade-in',
                                        msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                    )}
                                >
                                    {/* Avatar */}
                                    <div
                                        className={cn(
                                            'flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 mt-0.5',
                                            msg.role === 'user'
                                                ? 'bg-primary/15'
                                                : 'bg-gradient-to-br from-violet-500/20 to-indigo-500/10'
                                        )}
                                    >
                                        {msg.role === 'user' ? (
                                            <User className="h-3.5 w-3.5 text-primary" />
                                        ) : (
                                            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                                        )}
                                    </div>

                                    {/* Bubble */}
                                    <div
                                        className={cn(
                                            'rounded-2xl px-4 py-2.5 max-w-[85%] text-sm leading-relaxed',
                                            msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                                : 'bg-muted/60 border border-border/40 text-foreground rounded-bl-md'
                                        )}
                                        dangerouslySetInnerHTML={
                                            msg.role === 'assistant'
                                                ? { __html: DOMPurify.sanitize(renderMarkdown(msg.content)) }
                                                : undefined
                                        }
                                    >
                                        {msg.role === 'user' ? msg.content : undefined}
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="flex gap-2.5 animate-fade-in">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/10 flex-shrink-0">
                                    <Sparkles className="h-3.5 w-3.5 text-violet-500 animate-pulse" />
                                </div>
                                <div className="rounded-2xl rounded-bl-md bg-muted/60 border border-border/40 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-1.5 w-1.5 rounded-full bg-violet-500/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="h-1.5 w-1.5 rounded-full bg-violet-500/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="h-1.5 w-1.5 rounded-full bg-violet-500/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span className="text-xs text-muted-foreground ml-1">Procesando...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* ── Input Area ──────────────────────────────────────── */}
                    <div className="border-t border-border bg-background/80 backdrop-blur-md px-4 py-3">
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribe un comando o pregunta..."
                                rows={1}
                                className={cn(
                                    'flex-1 resize-none rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm',
                                    'outline-none transition-all placeholder:text-muted-foreground/60',
                                    'focus:border-violet-500/30 focus:ring-2 focus:ring-violet-500/10 focus:bg-background',
                                    'max-h-[100px]'
                                )}
                                style={{ minHeight: '40px' }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = '40px';
                                    target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                                }}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || isLoading}
                                className={cn(
                                    'flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 transition-all duration-200',
                                    input.trim() && !isLoading
                                        ? 'bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/20 hover:scale-105 active:scale-95'
                                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                                )}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
                            Saudade AI · Agente con acceso al sistema
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Floating Action Button ──────────────────────────────────── */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className={cn(
                    'fixed z-[61] bottom-5 right-[5.5rem] flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    'h-14 w-14 rounded-2xl shadow-2xl',
                    'bg-gradient-to-br from-violet-500 to-indigo-500 text-white',
                    'hover:scale-110 hover:shadow-violet-500/30 active:scale-95',
                    'group/fab',
                    isOpen && 'sm:scale-100 scale-0 sm:opacity-100 opacity-0'
                )}
                title="Agente Inteligente"
                aria-label="Abrir agente inteligente Saudade AI"
            >
                {/* Pulse ring */}
                {showPulse && !isOpen && (
                    <span className="absolute inset-0 rounded-2xl bg-violet-500/30 animate-ping" />
                )}

                {isOpen ? (
                    <X className="h-5 w-5 transition-transform duration-300" />
                ) : (
                    <Zap className="h-6 w-6 transition-transform duration-300 group-hover/fab:rotate-12" />
                )}
            </button>
        </>
    );
};

export default SystemAgentWidget;
