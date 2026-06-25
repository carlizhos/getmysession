import Layout from '@/components/Layout';
import FeatureGate from '@/components/subscription/FeatureGate';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  FileText,
  Download,
  Mail,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PaymentModal from '@/components/finance/PaymentModal';
import NewIncomeDialog from '@/components/finance/NewIncomeDialog';
import { useFinanceData } from '@/hooks/useFinance';

interface Appointment {
  id: string;
  patient_name: string;
  start_time: string;
  fee: number;
  payment_status: 'pending' | 'paid' | 'partial';
  status: string;
  stripe_checkout_id?: string;
  commission_percentage?: number | null;
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
  invoice_url?: string | null;
  invoice_id?: string | null;
  category?: string | null;
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
  const { user } = useAuth();
  const { organization } = useOrganization();
  
  // React Query Hook
  const { data: financeData, isLoading, refetch: fetchData } = useFinanceData(organization?.id);
  const appointments = financeData?.appointments || [];
  const payments = financeData?.payments || [];
  const feeConfig = financeData?.feeConfig || { porcentaje_consultorio: 30, stripe_fee_percent: 5.14 };
  const lastMonthPayments = financeData?.lastMonthPayments || [];
  const lastMonthAppointments = financeData?.lastMonthAppointments || [];

  const [payingAppointment, setPayingAppointment] = useState<Appointment | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed(p => ({ ...p, [key]: !p[key] }));
  const [generatingInvoiceId, setGeneratingInvoiceId] = useState<string | null>(null);
  const [isNewIncomeOpen, setIsNewIncomeOpen] = useState(false);

  const handleGenerateInvoice = async (paymentId: string) => {
    setGeneratingInvoiceId(paymentId);
    try {
      const { data, error: funcError } = await supabase.functions.invoke('generate-invoice', {
        body: { payment_id: paymentId, action: 'create' }
      });

      if (funcError) throw new Error(funcError.message);
      
      if (data?.success === false) {
        throw new Error(data.error || 'Error desconocido en el servidor');
      }

      toast.success('Factura generada exitosamente');
      fetchData(); // Refresh to show the new invoice
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error facturando:', error);
      toast.error(error.message || 'Ocurrió un error al procesar el timbrado.');
    } finally {
      setGeneratingInvoiceId(null);
    }
  };

  const handleSendEmail = async (invoiceId: string) => {
    try {
      toast.loading('Enviando correo...');
      const { data, error: funcError } = await supabase.functions.invoke('generate-invoice', {
        body: { invoice_id: invoiceId, action: 'send_email' }
      });

      toast.dismiss();
      if (funcError) throw new Error(funcError.message);
      if (data?.success === false) throw new Error(data.error);

      toast.success('Factura enviada por correo al paciente');
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Error al enviar el correo');
    }
  };

  const handleDownloadDirect = async (invoiceId: string) => {
    try {
      toast.loading('Preparando descarga...');
      const { data, error: funcError } = await supabase.functions.invoke('generate-invoice', {
        body: { invoice_id: invoiceId, action: 'download' }
      });

      toast.dismiss();
      if (funcError) throw new Error(funcError.message);
      
      // La data es un blob
      const blob = data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura_${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Error al descargar el archivo');
    }
  };

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
    } catch (e) {
      console.error('Error loading section order:', e);
    }
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

  // Helper to determine snapshot commission_percentage with global fallback
  const getPaymentCommission = (p: Payment, isLastMonth: boolean = false) => {
    if (p.appointment_id) {
      const list = isLastMonth ? lastMonthAppointments : appointments;
      const apt = list.find(a => a.id === p.appointment_id);
      if (apt && apt.commission_percentage !== undefined && apt.commission_percentage !== null) {
        return apt.commission_percentage;
      }
    }
    return feeConfig.porcentaje_consultorio;
  };

  const stripeTotal = sumOf(stripe);
  const efectivoTotal = sumOf(efectivo);
  const transferenciaTotal = sumOf(transferencia);
  const totalBruto = stripeTotal + efectivoTotal + transferenciaTotal;

  const stripeFeeAmount = stripeTotal * (feeConfig.stripe_fee_percent / 100);
  const stripeNeto = stripeTotal - stripeFeeAmount;
  const totalNeto = totalBruto - stripeFeeAmount;

  // Group-level commission overrides calculations
  const efectivoConsultorio = efectivo.reduce((sum, p) => sum + (p.amount * (getPaymentCommission(p) / 100)), 0);
  const efectivoLoQueTeQueda = efectivoTotal - efectivoConsultorio;

  const transferenciaConsultorio = transferencia.reduce((sum, p) => sum + (p.amount * (getPaymentCommission(p) / 100)), 0);
  const transferenciaLoQueTeQueda = transferenciaTotal - transferenciaConsultorio;

  const stripeConsultorio = stripe.reduce((sum, p) => {
    const fee = p.amount * (feeConfig.stripe_fee_percent / 100);
    const neto = p.amount - fee;
    return sum + (neto * (getPaymentCommission(p) / 100));
  }, 0);
  const stripeLoQueTeQueda = stripeNeto - stripeConsultorio;

  const consultorioAmount = paidPayments.reduce((sum, p) => {
    const isStripe = (p.method || 'stripe') === 'stripe';
    const fee = isStripe ? p.amount * (feeConfig.stripe_fee_percent / 100) : 0;
    const neto = p.amount - fee;
    const pct = getPaymentCommission(p);
    return sum + (neto * (pct / 100));
  }, 0);

  const psicologoNeto = totalNeto - consultorioAmount;

  // ── Cancelaciones ──────────────────────────────────────────────────────
  const cancelled = appointments.filter(a => a.status === 'cancelled');
  const cancelledCount = cancelled.length;
  const lostRevenue = cancelled.reduce((sum, a) => sum + (a.fee || 0), 0);

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
        const { data: result, error: funcError } = await supabase.functions.invoke('verify-stripe-payment', {
          body: { appointment_id: appointmentId },
        });

        if (funcError) {
          toast.error('No se pudo registrar el pago de Stripe: ' + (funcError.message || 'Error desconocido'));
          return;
        }

        if (result?.error) {
          toast.error('No se pudo registrar el pago de Stripe: ' + result.error);
          return;
        }

        if (result.already_registered) {
          toast.info('El pago ya estaba registrado');
        } else {
          toast.success('✅ Pago de Stripe registrado correctamente');
        }

        fetchData();
      } catch (err: unknown) {
        const error = err as Error;
        toast.error('Error al verificar el pago: ' + error.message);
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
  
  const lastConsultorio = lastPaid.reduce((sum, p) => {
    const isStripe = (p.method || 'stripe') === 'stripe';
    const fee = isStripe ? p.amount * (feeConfig.stripe_fee_percent / 100) : 0;
    const neto = p.amount - fee;
    const pct = getPaymentCommission(p, true);
    return sum + (neto * (pct / 100));
  }, 0);

  const lastPsicologoNeto = lastNeto - lastConsultorio;
  const lastPending = lastPaid.length;

  const lastCancelled = lastMonthAppointments.filter(a => a.status === 'cancelled');
  const lastLostRevenue = lastCancelled.reduce((sum, a) => sum + (a.fee || 0), 0);

  return (
    <Layout>
      <FeatureGate feature="core_finance">
      <div className="space-y-6">
        {/* Header Section (Island Style) */}
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-5 rounded-2xl border border-border shadow-soft animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-black tracking-tight text-foreground">Finanzas</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">
                Gestión financiera · {format(new Date(), "MMMM yyyy", { locale: es })}
              </p>
            </div>
          </div>

          <Button 
            variant="zen" 
            className="w-full sm:w-auto gap-2 shadow-soft hover:scale-[1.02] transition-all" 
            onClick={() => setIsNewIncomeOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Ingreso Manual</span>
          </Button>
        </div>

        {/* KPI row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {/* Total cobrado */}
          <Card variant="flat" className="border-border/50 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Total Cobrado</p>
                  <p className="text-3xl font-black mt-1 tracking-tight">${totalBruto.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{paid.length} sesiones · MXN bruto</p>
                    <DeltaBadge current={totalBruto} previous={lastTotalBruto} />
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Por cobrar */}
          <Card variant="flat" className="border-border/50 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Por Cobrar</p>
                  <p className="text-3xl font-black mt-1 tracking-tight text-warning">${pendingRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">{pending.length} sesiones pendientes</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/10">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sesiones cobradas */}
          <Card variant="flat" className="border-border/50 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Sesiones Cobradas</p>
                  <p className="text-3xl font-black mt-1 tracking-tight">{paid.length}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">de {appointments.length} con tarifa</p>
                    <DeltaBadge current={paid.length} previous={lastPending} />
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Honorarios */}
          <Card variant="flat" className="border-border/50 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Tus Honorarios</p>
                  <p className="text-3xl font-black mt-1 tracking-tight text-success">
                    ${psicologoNeto.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">neto, después de fees</p>
                    <DeltaBadge current={psicologoNeto} previous={lastPsicologoNeto} />
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Citas Canceladas / Período */}
          <Card variant="flat" className="border-border/50 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Ingreso Perdido</p>
                  <p className="text-3xl font-black mt-1 tracking-tight text-destructive">
                    ${lostRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{cancelledCount} citas canceladas</p>
                    <DeltaBadge current={lostRevenue} previous={lastLostRevenue} />
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
                  <ArrowDown className="h-6 w-6 text-destructive" />
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
                              <span className="text-muted-foreground">Consultorio</span>
                              <span className="font-medium text-warning">−{fmt(efectivoConsultorio)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold">
                              <span>Lo que te queda</span>
                              <span className="text-success">{fmt(efectivoLoQueTeQueda)}</span>
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
                              <span className="text-muted-foreground">Consultorio</span>
                              <span className="font-medium text-warning">−{fmt(transferenciaConsultorio)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold">
                              <span>Lo que te queda</span>
                              <span className="text-success">{fmt(transferenciaLoQueTeQueda)}</span>
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
                              <span className="text-muted-foreground">Consultorio</span>
                              <span className="font-medium text-warning">−{fmt(stripeConsultorio)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold">
                              <span>Lo que te queda</span>
                              <span className="text-success">{fmt(stripeLoQueTeQueda)}</span>
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
                          <p className="text-xs text-warning uppercase tracking-wide">Comisión Consultorio</p>
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
                                    const pct = getPaymentCommission(p);
                                    const consultorio = neto * (pct / 100);
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
                                              <div className="flex items-center gap-2">
                                                <p className="font-medium">{p.patient_name}</p>
                                                {p.category && p.category !== 'sesion' && (
                                                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-muted/50 border-none px-1.5 py-0">
                                                    {p.category}
                                                  </Badge>
                                                )}
                                              </div>
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
                                            {p.invoice_url ? (
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button variant="outline" size="sm" className="gap-1 bg-primary/5 text-primary border-primary/20 hover:bg-primary/10">
                                                    <FileText className="h-3.5 w-3.5" />
                                                    Factura
                                                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                  <DropdownMenuItem onClick={() => handleDownloadDirect(p.invoice_id!)} className="gap-2 cursor-pointer">
                                                    <Download className="h-4 w-4" />
                                                    Descargar PDF
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => handleSendEmail(p.invoice_id!)} className="gap-2 cursor-pointer">
                                                    <Mail className="h-4 w-4" />
                                                    Enviar por Correo
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => window.open(p.invoice_url!, '_blank')} className="gap-2 cursor-pointer">
                                                    <ExternalLink className="h-4 w-4" />
                                                    Ver en Facturapi
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            ) : (
                                              <Button variant="outline" size="sm" onClick={() => handleGenerateInvoice(p.id)} disabled={generatingInvoiceId === p.id} className="gap-1">
                                                {generatingInvoiceId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                                                Facturar
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 pb-3 text-xs text-muted-foreground border-t border-border/40 pt-2">
                                          {isStripe && (
                                            <span className="text-destructive">
                                              Fee Stripe: −${fee.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          )}
                                          <span className="text-warning">
                                            Consultorio ({pct}%): −${consultorio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
      </FeatureGate>

      <PaymentModal
        open={!!payingAppointment}
        appointment={payingAppointment}
        onOpenChange={(o) => { if (!o) setPayingAppointment(null); }}
        onSuccess={fetchData}
      />
      <NewIncomeDialog 
        open={isNewIncomeOpen}
        onOpenChange={setIsNewIncomeOpen}
        onSuccess={fetchData}
      />
    </Layout>
  );
};

export default Finance;