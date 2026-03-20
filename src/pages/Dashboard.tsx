import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import MetricCard from '@/components/dashboard/MetricCard';
import TodayAgenda from '@/components/dashboard/TodayAgenda';
import RevenueChart from '@/components/dashboard/RevenueChart';
import OnboardingModal from '@/components/dashboard/OnboardingModal';
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  AlertCircle,
  FileText,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, parseISO, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Tipos locales ────────────────────────────────────────────────────────────
interface DashboardAppointment {
  id: string;
  patientName: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  type: string;
}

interface DashboardNote {
  id: string;
  patientName: string;
  format: string;
  content: string;
  createdAt: string;
}

interface RevenuePoint {
  name: string;
  ingresos: number;
  sesiones: number;
}

interface DashboardStats {
  monthlyRevenue: number;
  previousMonthRevenue: number;
  activePatients: number;
  newPatientsThisMonth: number;
  todayAppointmentsCount: number;
  confirmedToday: number;
  pendingToday: number;
  completedSessions: number;
  pendingPayments: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ── Componente ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayAppts, setTodayAppts] = useState<DashboardAppointment[]>([]);
  const [recentNotes, setRecentNotes] = useState<DashboardNote[]>([]);
  const [chartData, setChartData] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const now = new Date();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const prevMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)).toISOString();
    const prevMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)).toISOString();

    // Fetch en paralelo
    const [
      { data: patients },
      { data: newPatients },
      { data: todayData },
      { data: monthAppts },
      { data: prevMonthAppts },
      { data: notes },
      { data: chartRaw },
    ] = await Promise.all([
      // Total pacientes activos
      supabase.from('patients').select('id, created_at'),
      // Pacientes nuevos este mes
      supabase.from('patients').select('id').gte('created_at', monthStart).lte('created_at', monthEnd),
      // Citas de hoy
      supabase.from('appointments')
        .select('id, patient_name, start_time, end_time, status, type')
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd)
        .order('start_time'),
      // Citas del mes actual (para ingresos y sesiones)
      supabase.from('appointments')
        .select('fee, payment_status, status')
        .gte('start_time', monthStart)
        .lte('start_time', monthEnd),
      // Citas del mes anterior (para comparar ingresos)
      supabase.from('appointments')
        .select('fee, payment_status')
        .gte('start_time', prevMonthStart)
        .lte('start_time', prevMonthEnd),
      // Notas clínicas recientes (tabla session_notes)
      supabase.from('session_notes')
        .select('id, patient_name, session_number, agenda, created_at')
        .order('created_at', { ascending: false })
        .limit(3),
      // Datos de los últimos 6 meses para el gráfico
      supabase.from('appointments')
        .select('start_time, fee, payment_status, status')
        .gte('start_time', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString())
        .lte('start_time', monthEnd),
    ]);

    // ── Stats ────────────────────────────────────────────────────────────────
    const monthlyRevenue = (monthAppts ?? [])
      .filter(a => a.payment_status === 'paid')
      .reduce((sum, a) => sum + (Number(a.fee) || 0), 0);

    const previousMonthRevenue = (prevMonthAppts ?? [])
      .filter(a => a.payment_status === 'paid')
      .reduce((sum, a) => sum + (Number(a.fee) || 0), 0);

    const pendingPayments = (monthAppts ?? [])
      .filter(a => a.payment_status === 'pending')
      .reduce((sum, a) => sum + (Number(a.fee) || 0), 0);

    const completedSessions = (monthAppts ?? [])
      .filter(a => a.status === 'completed').length;

    const confirmedToday = (todayData ?? []).filter(a => a.status === 'confirmed').length;
    const pendingToday = (todayData ?? []).filter(a => a.status === 'pending').length;

    setStats({
      monthlyRevenue,
      previousMonthRevenue,
      activePatients: patients?.length ?? 0,
      newPatientsThisMonth: newPatients?.length ?? 0,
      todayAppointmentsCount: todayData?.length ?? 0,
      confirmedToday,
      pendingToday,
      completedSessions,
      pendingPayments,
    });

    // ── Agenda del día ────────────────────────────────────────────────────────
    setTodayAppts((todayData ?? []).map(a => ({
      id: a.id,
      patientName: a.patient_name ?? 'Paciente',
      startTime: a.start_time,
      endTime: a.end_time,
      status: a.status as DashboardAppointment['status'],
      type: a.type ?? 'Consulta',
    })));

    // ── Notas recientes ───────────────────────────────────────────────────────
    setRecentNotes((notes ?? []).map(n => ({
      id: n.id,
      patientName: n.patient_name ?? 'Paciente',
      format: `Sesión #${n.session_number ?? 1}`,
      content: (n.agenda as any[])?.map((a: any) => a.topic).filter(Boolean).join(' · ') || '',
      createdAt: n.created_at,
    })));

    // ── Gráfico: últimos 6 meses ──────────────────────────────────────────────
    const monthMap: Record<string, { ingresos: number; sesiones: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = MONTH_NAMES[d.getMonth()];
      monthMap[key] = { ingresos: 0, sesiones: 0 };
    }
    (chartRaw ?? []).forEach(appt => {
      const month = MONTH_NAMES[new Date(appt.start_time).getMonth()];
      if (!monthMap[month]) return;
      if (appt.payment_status === 'paid') monthMap[month].ingresos += Number(appt.fee) || 0;
      if (appt.status === 'completed') monthMap[month].sesiones += 1;
    });
    setChartData(Object.entries(monthMap).map(([name, v]) => ({ name, ...v })));

    setLoading(false);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Buenos días';
    if (h >= 12 && h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const revenueGrowth = stats && stats.previousMonthRevenue > 0
    ? Math.round(((stats.monthlyRevenue - stats.previousMonthRevenue) / stats.previousMonthRevenue) * 100)
    : 0;

  const SESSION_GOAL = 40;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreeting()},{' '}
            <span className="text-gradient-zen">
              {user?.user_metadata?.full_name || 'Doctor'}
            </span>
          </h1>
          <p className="text-muted-foreground">
            Aquí está el resumen de su práctica clínica
          </p>
        </div>

        {/* Onboarding modal — auto-hides when profile + consent are done */}
        <OnboardingModal />

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Ingresos del Mes"
            value={loading ? '...' : `$${(stats?.monthlyRevenue ?? 0).toLocaleString()}`}
            icon={DollarSign}
            trend={{ value: revenueGrowth, isPositive: revenueGrowth >= 0 }}
            variant="zen"
          />
          <MetricCard
            title="Pacientes Activos"
            value={loading ? '...' : stats?.activePatients ?? 0}
            subtitle={loading ? '' : `+${stats?.newPatientsThisMonth ?? 0} nuevos este mes`}
            icon={Users}
            variant="default"
          />
          <MetricCard
            title="Sesiones Completadas"
            value={loading ? '...' : stats?.completedSessions ?? 0}
            subtitle={`Meta: ${SESSION_GOAL}`}
            icon={TrendingUp}
            trend={{ value: Math.round(((stats?.completedSessions ?? 0) / SESSION_GOAL) * 100), isPositive: true }}
            variant="success"
          />
          <MetricCard
            title="Citas Hoy"
            value={loading ? '...' : stats?.todayAppointmentsCount ?? 0}
            subtitle={loading ? '' : `${stats?.confirmedToday ?? 0} confirmadas, ${stats?.pendingToday ?? 0} pendientes`}
            icon={Calendar}
            variant="default"
          />
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna izquierda */}
          <div className="lg:col-span-2 space-y-6">
            <TodayAgenda appointments={todayAppts} />
            <RevenueChart data={chartData} loading={loading} />
          </div>

          {/* Columna derecha */}
          <div className="space-y-6">
            {/* Pagos pendientes */}
            <Card variant="zen" className="animate-fade-in border-warning/20 bg-warning/5">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                  <AlertCircle className="h-6 w-6 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Pagos Pendientes</p>
                  <p className="text-2xl font-bold">
                    {loading ? '...' : `$${(stats?.pendingPayments ?? 0).toLocaleString()}`}
                  </p>
                </div>
                <Button variant="outline" size="sm">Ver detalles</Button>
              </CardContent>
            </Card>

            {/* Progreso de sesiones */}
            <Card variant="default" className="animate-fade-in">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sesiones del Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">
                    {loading ? '...' : stats?.completedSessions ?? 0}
                  </span>
                  <Badge variant="zen">Meta: {SESSION_GOAL}</Badge>
                </div>
                <Progress
                  value={((stats?.completedSessions ?? 0) / SESSION_GOAL) * 100}
                  className="h-2"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {SESSION_GOAL - (stats?.completedSessions ?? 0)} sesiones restantes para la meta
                </p>
              </CardContent>
            </Card>

            {/* Notas recientes */}
            <Card variant="default" className="animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Últimas Notas</CardTitle>
                <Button variant="ghost" size="sm" className="gap-1">
                  Ver todas <ArrowRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
                ) : recentNotes.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">No hay notas recientes</p>
                  </div>
                ) : (
                  recentNotes.map((note, i) => (
                    <div
                      key={note.id}
                      className="group rounded-xl border border-border/50 p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-soft"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h4 className="font-medium text-sm">{note.patientName}</h4>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(note.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                          </p>
                        </div>
                        <Badge variant="outline">{note.format}</Badge>
                      </div>
                      {note.content && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {note.content}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
