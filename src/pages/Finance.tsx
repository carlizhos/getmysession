import Layout from '@/components/Layout';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Receipt,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Loader2,
  Wallet,
  ArrowLeftRight,
  Building2,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PaymentModal from '@/components/finance/PaymentModal';

interface Appointment {
  id: string;
  patient_name: string;
  start_time: string;
  fee: number;
  payment_status: 'pending' | 'paid' | 'partial';
  status: string;
  stripe_checkout_id?: string;
}

interface Payment {
  id: string;
  appointment_id: string | null;
  patient_name: string;
  amount: number;
  currency: string;
  status: string;
  method: 'efectivo' | 'transferencia' | 'stripe' | null;
  paid_at: string | null;
  created_at: string;
  notes: string | null;
}

type PaymentMethod = 'efectivo' | 'transferencia' | 'stripe';

const SECTION_IDS = ['metodos', 'resumen', 'grafico', 'sesiones'] as const;
type SectionId = typeof SECTION_IDS[number];

const LS_KEY = 'finance_section_order';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  stripe: 'En línea (Stripe)',
};

const METHOD_ICONS: Record<PaymentMethod, React.ElementType> = {
  efectivo: Wallet,
  transferencia: ArrowLeftRight,
  stripe: CreditCard,
};

const METHOD_COLORS: Record<PaymentMethod, string> = {
  efectivo: 'bg-success/10 text-success border-success/20',
  transferencia: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  stripe: 'bg-primary/10 text-primary border-primary/20',
};

// ── Sortable section wrapper ─────────────────────────────────────────────────
const SortableSection = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
      }}
      className="relative group"
    >
      {/* Drag handle — visible on hover */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all duration-150 touch-none flex items-center justify-center h-7 w-7 rounded-md bg-primary/10 hover:bg-primary/20"
        title="Arrastrar para reordenar"
      >
        <GripVertical className="h-4 w-4 text-primary" />
      </div>
      {children}
    </div>
  );
};

const Finance = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingAppointment, setPayingAppointment] = useState<Appointment | null>(null);
  const [feeConfig, setFeeConfig] = useState({ porcentaje_consultorio: 30, stripe_fee_percent: 5.14 });
  const [lastMonthPayments, setLastMonthPayments] = useState<Payment[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed(p => ({ ...p, [key]: !p[key] }));

  // ── Delta badge helper ────────────────────────────────────────────────
  const DeltaBadge = ({ current, previous }: { current: number; previous: number }) => {
    if (previous === 0 && current === 0) return null;
    if (previous === 0) return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-success">
        <ArrowUp className="h-3 w-3" />Nuevo
      </span>
    );
    const pct = ((current - previous) / previous) * 100;
    const up = pct >= 0;
    const Icon = Math.abs(pct) < 0.5 ? Minus : up ? ArrowUp : ArrowDown;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${Math.abs(pct) < 0.5 ? 'text-muted-foreground' : up ? 'text-success' : 'text-destructive'
        }`}>
        <Icon className="h-3 w-3" />{Math.abs(pct).toFixed(0)}% vs mes ant.
      </span>
    );
  };

  // ── Drag & drop section order ────────────────────────────────────────────
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SectionId[];
        if (SECTION_IDS.every(id => parsed.includes(id))) return parsed;
      }
    } catch { }
    return [...SECTION_IDS];
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSectionOrder(prev => {
      const oldIndex = prev.indexOf(active.id as SectionId);
      const newIndex = prev.indexOf(over.id as SectionId);
      const next = arrayMove(prev, oldIndex, newIndex);
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  };

  // ── Derivados de citas ──────────────────────────────────────────────────
  const paid = appointments.filter(a => a.payment_status === 'paid');
  const pending = appointments.filter(a => a.payment_status !== 'paid' && a.fee > 0);
  const pendingRevenue = pending.reduce((sum, a) => sum + (a.fee || 0), 0);

  // ── Derivados de pagos (con método) ────────────────────────────────────
  const paidPayments = payments.filter(p => p.status === 'paid');

  const byMethod = (method: PaymentMethod) =>
    paidPayments.filter(p => p.method === method || (!p.method && method === 'stripe'));

  const stripe = byMethod('stripe');
  const efectivo = byMethod('efectivo');
  const transferencia = byMethod('transferencia');

  const sumOf = (ps: Payment[]) => ps.reduce((s, p) => s + p.amount, 0);

  const stripeTotal = sumOf(stripe);
  const efectivoTotal = sumOf(efectivo);
  const transferenciaTotal = sumOf(transferencia);
  const totalBruto = stripeTotal + efectivoTotal + transferenciaTotal;

  const stripeFeeAmount = stripeTotal * (feeConfig.stripe_fee_percent / 100);
  const stripeNeto = stripeTotal - stripeFeeAmount;
  const totalNeto = totalBruto - stripeFeeAmount;
  const consultorioAmount = totalNeto * (feeConfig.porcentaje_consultorio / 100);
  const psicologoNeto = totalNeto - consultorioAmount;

  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Gráfico semanal ────────────────────────────────────────────────────
  const chartData = (() => {
    const weeks: Record<string, number> = { 'Sem 1': 0, 'Sem 2': 0, 'Sem 3': 0, 'Sem 4': 0 };
    paidPayments.forEach(p => {
      const d = parseISO(p.paid_at || p.created_at);
      const day = d.getDate();
      const week = day <= 7 ? 'Sem 1' : day <= 14 ? 'Sem 2' : day <= 21 ? 'Sem 3' : 'Sem 4';
      weeks[week] += p.amount;
    });
    return Object.entries(weeks).map(([name, ingresos]) => ({ name, ingresos }));
  })();

  // ── Badge de método ────────────────────────────────────────────────────
  const methodBadge = (method: string | null) => {
    const m = (method || 'stripe') as PaymentMethod;
    const Icon = METHOD_ICONS[m] || DollarSign;
    return (
      <Badge variant="outline" className={`gap-1 text-xs ${METHOD_COLORS[m] || ''}`}>
        <Icon className="h-3 w-3" />
        {METHOD_LABELS[m] || method}
      </Badge>
    );
  };

  // ── Data fetching ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const start = startOfMonth(now).toISOString();
      const end = endOfMonth(now).toISOString();
      const lastMonth = subMonths(now, 1);
      const lastStart = startOfMonth(lastMonth).toISOString();
      const lastEnd = endOfMonth(lastMonth).toISOString();

      const [{ data: appts }, { data: pmts }, { data: cfg }, { data: lastPmts }] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, patient_name, start_time, fee, payment_status, status, stripe_checkout_id')
          .gte('start_time', start)
          .lte('start_time', end)
          .order('start_time', { ascending: false }),
        supabase
          .from('payments')
          .select('id, appointment_id, patient_name, amount, currency, status, method, paid_at, created_at, notes')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false }),
        supabase.from('fee_config').select('porcentaje_consultorio, stripe_fee_percent').limit(1).maybeSingle(),
        supabase
          .from('payments')
          .select('id, amount, status, method')
          .eq('status', 'paid')
          .gte('created_at', lastStart)
          .lte('created_at', lastEnd),
      ]);

      if (appts) setAppointments(appts);
      if (pmts) setPayments(pmts);
      if (cfg) setFeeConfig(cfg);
      if (lastPmts) setLastMonthPayments(lastPmts as Payment[]);
    } catch (err) {
      toast.error('Error cargando datos financieros');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Stripe redirect handler ────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const appointmentId = params.get('apt');

    if (paymentStatus !== 'success' || !appointmentId) return;

    // Clean URL immediately so refresh doesn't re-trigger
    window.history.replaceState({}, '', window.location.pathname);

    const verifyPayment = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const SUPABASE_URL = 'https://zhnbrftspwzacarpjqxd.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobmJyZnRzcHd6YWNhcnBqcXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzQyNDgsImV4cCI6MjA4NTgxMDI0OH0.56Jis1mnVl-Rfof091ejuHR5g8oINumZKiwGL7bygVA';

        const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-stripe-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ appointment_id: appointmentId }),
        });

        const result = await res.json();

        if (!res.ok) {
          toast.error('No se pudo registrar el pago de Stripe: ' + (result.error || 'Error desconocido'));
          return;
        }

        if (result.already_registered) {
          toast.info('El pago ya estaba registrado');
        } else {
          toast.success('✅ Pago de Stripe registrado correctamente');
        }

        fetchData();
      } catch (err: any) {
        toast.error('Error al verificar el pago: ' + err.message);
      }
    };

    verifyPayment();
  }, [fetchData]);

  // ── Totales mes anterior ────────────────────────────────────────────────
  const lastPaid = lastMonthPayments.filter(p => p.status === 'paid');
  const lastTotalBruto = lastPaid.reduce((s, p) => s + p.amount, 0);
  const lastStripeFee = lastPaid
    .filter(p => p.method === 'stripe' || !p.method)
    .reduce((s, p) => s + p.amount * (feeConfig.stripe_fee_percent / 100), 0);
  const lastNeto = lastTotalBruto - lastStripeFee;
  const lastConsultorio = lastNeto * (feeConfig.porcentaje_consultorio / 100);
  const lastPsicologoNeto = lastNeto - lastConsultorio;
  const lastPending = lastPaid.length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
            <p className="text-muted-foreground">
              {format(new Date(), "MMMM yyyy", { locale: es })}
            </p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total cobrado */}
          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Cobrado</p>
                  <p className="text-3xl font-bold mt-1">${totalBruto.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">{paid.length} sesión{paid.length !== 1 ? 'es' : ''} · MXN bruto</p>
                    <DeltaBadge current={totalBruto} previous={lastTotalBruto} />
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Por cobrar */}
          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Por Cobrar</p>
                  <p className="text-3xl font-bold mt-1 text-warning">${pendingRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
                  <p className="text-xs text-muted-foreground mt-1">{pending.length} sesión{pending.length !== 1 ? 'es' : ''}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sesiones cobradas */}
          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sesiones Cobradas</p>
                  <p className="text-3xl font-bold mt-1">{paid.length}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">de {appointments.length} con tarifa</p>
                    <DeltaBadge current={paid.length} previous={lastPending} />
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Honorarios */}
          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tus Honorarios</p>
                  <p className="text-3xl font-bold mt-1 text-success">
                    ${psicologoNeto.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">neto, después de fees</p>
                    <DeltaBadge current={psicologoNeto} previous={lastPsicologoNeto} />
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Sortable sections ──────────────────────────────────────────── */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
            {sectionOrder.map(sectionId => {

              // ── Ingresos por método de pago ─────────────────────────────
              if (sectionId === 'metodos') return totalBruto > 0 ? (
                <SortableSection key="metodos" id="metodos">
                  <Card variant="default">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-primary" />
                            Ingresos por Método de Pago
                          </CardTitle>
                          <CardDescription>
                            Cuánto entró por cada canal · {paidPayments.length} pago{paidPayments.length !== 1 ? 's' : ''} registrado{paidPayments.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                        <button
                          onClick={() => toggle('metodos')}
                          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                        >
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${collapsed['metodos'] ? '-rotate-90' : ''}`} />
                        </button>
                      </div>
                    </CardHeader>
                    {!collapsed['metodos'] && (<CardContent>
                      <div className="grid gap-4 sm:grid-cols-3">
                        {/* Efectivo */}
                        <div className="rounded-xl border border-success/20 bg-success/5 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                              <Wallet className="h-5 w-5 text-success" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">Efectivo</p>
                              <p className="text-xs text-muted-foreground">{efectivo.length} pago{efectivo.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{fmt(efectivoTotal)}</p>
                            <p className="text-xs text-success mt-0.5">✓ Sin comisión · 100% al consultorio</p>
                          </div>
                          <div className="space-y-1 pt-1 border-t border-success/20">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Fee procesador</span>
                              <span className="font-medium">$0.00</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Consultorio ({feeConfig.porcentaje_consultorio}%)</span>
                              <span className="font-medium text-warning">−{fmt(efectivoTotal * feeConfig.porcentaje_consultorio / 100)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold">
                              <span>Lo que te queda</span>
                              <span className="text-success">{fmt(efectivoTotal * (1 - feeConfig.porcentaje_consultorio / 100))}</span>
                            </div>
                          </div>
                        </div>

                        {/* Transferencia */}
                        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10">
                              <ArrowLeftRight className="h-5 w-5 text-sky-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">Transferencia</p>
                              <p className="text-xs text-muted-foreground">{transferencia.length} pago{transferencia.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{fmt(transferenciaTotal)}</p>
                            <p className="text-xs text-sky-600 mt-0.5">✓ Sin comisión · 100% al consultorio</p>
                          </div>
                          <div className="space-y-1 pt-1 border-t border-sky-500/20">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Fee procesador</span>
                              <span className="font-medium">$0.00</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Consultorio ({feeConfig.porcentaje_consultorio}%)</span>
                              <span className="font-medium text-warning">−{fmt(transferenciaTotal * feeConfig.porcentaje_consultorio / 100)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold">
                              <span>Lo que te queda</span>
                              <span className="text-success">{fmt(transferenciaTotal * (1 - feeConfig.porcentaje_consultorio / 100))}</span>
                            </div>
                          </div>
                        </div>

                        {/* Stripe */}
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                              <CreditCard className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">En línea (Stripe)</p>
                              <p className="text-xs text-muted-foreground">{stripe.length} pago{stripe.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{fmt(stripeTotal)}</p>
                            <p className="text-xs text-destructive mt-0.5">Fee: {fmt(stripeFeeAmount)} ({feeConfig.stripe_fee_percent}%)</p>
                          </div>
                          <div className="space-y-1 pt-1 border-t border-primary/20">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Fee Stripe ({feeConfig.stripe_fee_percent}%)</span>
                              <span className="font-medium text-destructive">−{fmt(stripeFeeAmount)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Consultorio ({feeConfig.porcentaje_consultorio}%) del neto</span>
                              <span className="font-medium text-warning">−{fmt(stripeNeto * feeConfig.porcentaje_consultorio / 100)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold">
                              <span>Lo que te queda</span>
                              <span className="text-success">{fmt(stripeNeto * (1 - feeConfig.porcentaje_consultorio / 100))}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>)}
                  </Card>
                </SortableSection>
              ) : null;

              // ── Resumen consolidado ─────────────────────────────────────
              if (sectionId === 'resumen') return totalBruto > 0 ? (
                <SortableSection key="resumen" id="resumen">
                  <Card variant="default">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-success" />
                            Resumen Consolidado del Mes
                          </CardTitle>
                          <CardDescription>Todos los métodos · Configuración en Ajustes</CardDescription>
                        </div>
                        <button
                          onClick={() => toggle('resumen')}
                          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                        >
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${collapsed['resumen'] ? '-rotate-90' : ''}`} />
                        </button>
                      </div>
                    </CardHeader>
                    {!collapsed['resumen'] && (<CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl bg-muted/40 p-4 space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Bruto cobrado</p>
                          <p className="text-2xl font-bold">{fmt(totalBruto)}</p>
                          <p className="text-xs text-muted-foreground">MXN</p>
                        </div>
                        <div className="rounded-xl bg-destructive/5 border border-destructive/10 p-4 space-y-1">
                          <p className="text-xs text-destructive uppercase tracking-wide">Fees Stripe ({feeConfig.stripe_fee_percent}%)</p>
                          <p className="text-2xl font-bold text-destructive">−{fmt(stripeFeeAmount)}</p>
                          <p className="text-xs text-muted-foreground">Solo pagos en línea</p>
                        </div>
                        <div className="rounded-xl bg-warning/5 border border-warning/10 p-4 space-y-1">
                          <p className="text-xs text-warning uppercase tracking-wide">Consultorio ({feeConfig.porcentaje_consultorio}%)</p>
                          <p className="text-2xl font-bold text-warning">−{fmt(consultorioAmount)}</p>
                          <p className="text-xs text-muted-foreground">Del neto total</p>
                        </div>
                        <div className="rounded-xl bg-success/10 border border-success/20 p-4 space-y-1">
                          <p className="text-xs text-success uppercase tracking-wide font-semibold">🏠 Lo que te queda</p>
                          <p className="text-2xl font-bold text-success">{fmt(psicologoNeto)}</p>
                          <p className="text-xs text-muted-foreground">Honorarios netos</p>
                        </div>
                      </div>
                    </CardContent>)}
                  </Card>
                </SortableSection>
              ) : null;

              // ── Gráfico semanal ─────────────────────────────────────────
              if (sectionId === 'grafico') return (
                <SortableSection key="grafico" id="grafico">
                  <Card variant="default">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Ingresos Semanales</CardTitle>
                          <CardDescription>Distribución de ingresos cobrados este mes (MXN)</CardDescription>
                        </div>
                        <button
                          onClick={() => toggle('grafico')}
                          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                        >
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${collapsed['grafico'] ? '-rotate-90' : ''}`} />
                        </button>
                      </div>
                    </CardHeader>
                    {!collapsed['grafico'] && (<CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                              formatter={(v: number) => [`$${v.toLocaleString('es-MX')}`, 'Ingresos']}
                            />
                            <Area type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>)}
                  </Card>
                </SortableSection>
              );

              // ── Sesiones (tabs Pendientes / Cobrados) ───────────────────
              if (sectionId === 'sesiones') return (
                <SortableSection key="sesiones" id="sesiones">
                  <Card variant="default">
                    <Tabs defaultValue={pending.length > 0 ? 'pendientes' : 'cobros'}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <CardTitle>Sesiones</CardTitle>
                            <CardDescription>
                              {format(new Date(), 'MMMM yyyy', { locale: es })}
                            </CardDescription>
                          </div>
                          {!collapsed['sesiones'] && (
                            <TabsList className="flex-1">
                              <TabsTrigger value="pendientes" className="flex-1 gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                Pendientes
                                {pending.length > 0 && (
                                  <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning text-warning-foreground text-[10px] font-bold px-1">
                                    {pending.length}
                                  </span>
                                )}
                              </TabsTrigger>
                              <TabsTrigger value="cobros" className="flex-1 gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Cobrados
                                {paidPayments.length > 0 && (
                                  <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-success text-success-foreground text-[10px] font-bold px-1">
                                    {paidPayments.length}
                                  </span>
                                )}
                              </TabsTrigger>
                            </TabsList>
                          )}
                          <button
                            onClick={() => toggle('sesiones')}
                            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors flex-shrink-0 ml-auto"
                          >
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${collapsed['sesiones'] ? '-rotate-90' : ''}`} />
                          </button>
                        </div>
                      </CardHeader>

                      {!collapsed['sesiones'] && (
                        <>
                          <TabsContent value="pendientes" className="mt-0">
                            <CardContent className="pt-4">
                              {pending.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                  <p>¡Todo cobrado! Sin pendientes este mes.</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {pending.map(apt => (
                                    <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-warning/5 border border-warning/20">
                                      <div>
                                        <p className="font-medium">{apt.patient_name}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {format(parseISO(apt.start_time), "d 'de' MMMM, HH:mm", { locale: es })}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-3 ml-0 sm:ml-auto">
                                        <span className="text-xl font-bold text-warning">
                                          ${apt.fee.toLocaleString('es-MX')} MXN
                                        </span>
                                        <Button variant="zen" size="sm" onClick={() => setPayingAppointment(apt)}>
                                          Cobrar
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </TabsContent>

                          <TabsContent value="cobros" className="mt-0">
                            <CardContent className="pt-4">
                              {isLoading ? (
                                <div className="flex justify-center py-8">
                                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                              ) : paidPayments.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                  <p>Sin cobros registrados este mes</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {paidPayments.map((p, index) => {
                                    const m = (p.method || 'stripe') as PaymentMethod;
                                    const isStripe = m === 'stripe';
                                    const fee = isStripe ? p.amount * (feeConfig.stripe_fee_percent / 100) : 0;
                                    const neto = p.amount - fee;
                                    const consultorio = neto * (feeConfig.porcentaje_consultorio / 100);
                                    const psicologo = neto - consultorio;
                                    const dateStr = p.paid_at || p.created_at;
                                    return (
                                      <div
                                        key={p.id}
                                        className="rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors animate-fade-in border border-border/50"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                                          <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 flex-shrink-0">
                                              <ArrowUpRight className="h-5 w-5 text-success" />
                                            </div>
                                            <div>
                                              <p className="font-medium">{p.patient_name}</p>
                                              <p className="text-sm text-muted-foreground">
                                                {dateStr ? format(parseISO(dateStr), "d MMM yyyy, HH:mm", { locale: es }) : '—'}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3 ml-14 sm:ml-0 flex-wrap">
                                            {methodBadge(p.method)}
                                            <span className="text-lg font-semibold text-success">
                                              +${p.amount.toLocaleString('es-MX')} MXN
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 pb-3 text-xs text-muted-foreground border-t border-border/40 pt-2">
                                          {isStripe && (
                                            <span className="text-destructive">
                                              Fee Stripe: −${fee.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          )}
                                          <span className="text-warning">
                                            Consultorio: −${consultorio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                          <span className="text-success font-semibold">
                                            Tu parte: ${psicologo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                          {p.notes && (
                                            <span className="w-full flex items-center gap-1 mt-0.5 text-muted-foreground italic">
                                              📝 {p.notes}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </CardContent>
                          </TabsContent>
                        </>
                      )}
                    </Tabs>
                  </Card>
                </SortableSection>
              );

              return null;
            })}
          </SortableContext>
        </DndContext>
      </div>

      <PaymentModal
        open={!!payingAppointment}
        appointment={payingAppointment}
        onOpenChange={(o) => { if (!o) setPayingAppointment(null); }}
        onSuccess={fetchData}
      />
    </Layout>
  );
};

export default Finance;