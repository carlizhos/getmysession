import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import MetricCard from '@/components/dashboard/MetricCard';
import TodayAgenda from '@/components/dashboard/TodayAgenda';
import RevenueChart from '@/components/dashboard/RevenueChart';
import ActivityHeatmap from '@/components/dashboard/ActivityHeatmap';
import OnboardingModal from '@/components/dashboard/OnboardingModal';
import { Appointment } from '@/types';
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  AlertCircle,
  FileText,
  ArrowRight,
  Plus,
  Pencil
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, parseISO, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOrganization } from '@/hooks/useOrganization';
import { checkReactivations } from '@/lib/reactivationService';

// ── Tipos locales ────────────────────────────────────────────────────────────
interface DashboardAppointment {
  id: string;
  patientName: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'pending' | 'cancelled' | 'completed';
  type: string;
  phone?: string | null;
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
  const { organization } = useOrganization();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayAppts, setTodayAppts] = useState<DashboardAppointment[]>([]);
  const [recentNotes, setRecentNotes] = useState<DashboardNote[]>([]);
  const [chartData, setChartData] = useState<RevenuePoint[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Editable monthly session goal
  const [sessionGoal, setSessionGoal] = useState<number>(() => {
    const saved = localStorage.getItem('saudade_session_goal');
    return saved ? parseInt(saved, 10) : 40;
  });
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [goalInput, setGoalInput] = useState(sessionGoal.toString());

  const handleSaveGoal = () => {
    const parsed = parseInt(goalInput, 10);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Ingresa una meta válida mayor a 0');
      return;
    }
    setSessionGoal(parsed);
    localStorage.setItem('saudade_session_goal', parsed.toString());
    toast.success(`Meta mensual actualizada a ${parsed} sesiones`);
    setIsGoalDialogOpen(false);
  };

  const fetchAll = useCallback(async () => {
    if (!organization?.id) return;
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
      { count: patientsCount },
      { count: newPatientsCount },
      { data: monthAppts },
      { data: prevMonthAppts },
      { data: todayData },
      { data: notes },
      { data: chartRaw }
    ] = await Promise.all([
      supabase.from('patients').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id).is('deleted_at', null),
      supabase.from('patients').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id).gte('created_at', monthStart).lte('created_at', monthEnd).is('deleted_at', null),
      supabase.from('appointments').select('*').eq('organization_id', organization.id).gte('start_time', monthStart).lte('start_time', monthEnd),
      supabase.from('appointments').select('*').eq('organization_id', organization.id).gte('start_time', prevMonthStart).lte('start_time', prevMonthEnd),
      supabase.from('appointments').select('id, patient_id, patient_name, start_time, end_time, status, type, patients(phone)').eq('organization_id', organization.id).gte('start_time', todayStart).lte('start_time', todayEnd),
      supabase.from('session_notes').select('id, patient_name, session_number, agenda, created_at').eq('organization_id', organization.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(3),
      supabase.from('appointments').select('*').eq('organization_id', organization.id).gte('start_time', startOfMonth(new Date(now.getFullYear(), now.getMonth() - 11, 1)).toISOString()).lte('start_time', monthEnd),
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
      activePatients: patientsCount ?? 0,
      newPatientsThisMonth: newPatientsCount ?? 0,
      todayAppointmentsCount: todayData?.length ?? 0,
      confirmedToday,
      pendingToday,
      completedSessions,
      pendingPayments,
    });

    // ── Agenda del día ────────────────────────────────────────────────────────
    setTodayAppts((todayData ?? []).map(a => {
        const patientData = a.patients as unknown as { phone: string } | null;
        return {
            id: a.id,
            patientName: a.patient_name ?? 'Paciente',
            startTime: a.start_time,
            endTime: a.end_time,
            status: a.status as DashboardAppointment['status'],
            type: a.type ?? 'Consulta',
            phone: patientData?.phone || null
        };
    }));

    // ── Notas recientes ───────────────────────────────────────────────────────
    setRecentNotes((notes ?? []).map(n => {
        const agenda = n.agenda as unknown as { topic: string }[] | null;
        return {
            id: n.id,
            patientName: n.patient_name ?? 'Paciente',
            format: `Sesión #${n.session_number ?? 1}`,
            content: agenda?.map(a => a.topic).filter(Boolean).join(' · ') || '',
            createdAt: n.created_at,
        };
    }));

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
    setAllAppointments((chartRaw ?? []) as Appointment[]);
 
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    if (organization?.id) {
      fetchAll();
      if (user?.id) {
        checkReactivations(user.id, organization.id);
      }
    }
  }, [user?.id, organization?.id, fetchAll]);

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
        <div className="flex flex-col gap-1 sm:gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
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
            value={`$${(stats?.monthlyRevenue ?? 0).toLocaleString()}`}
            loading={loading}
            icon={DollarSign}
            trend={{ value: revenueGrowth, isPositive: revenueGrowth >= 0 }}
            variant="zen"
            onClick={() => navigate('/finance')}
          />
          <MetricCard
            title="Pacientes Activos"
            value={stats?.activePatients ?? 0}
            subtitle={`+${stats?.newPatientsThisMonth ?? 0} nuevos este mes`}
            loading={loading}
            icon={Users}
            variant="default"
            onClick={() => navigate('/patients')}
          />
          <MetricCard
            title="Sesiones Completadas"
            value={stats?.completedSessions ?? 0}
            subtitle={`Meta: ${sessionGoal}`}
            loading={loading}
            icon={TrendingUp}
            trend={{ value: Math.round(((stats?.completedSessions ?? 0) / sessionGoal) * 100), isPositive: true }}
            variant="success"
            onClick={() => navigate('/agenda')}
          />
          <MetricCard
            title="Citas Hoy"
            value={stats?.todayAppointmentsCount ?? 0}
            subtitle={`${stats?.confirmedToday ?? 0} confirmadas, ${stats?.pendingToday ?? 0} pendientes`}
            loading={loading}
            icon={Calendar}
            variant="default"
            onClick={() => navigate('/agenda')}
          />
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna izquierda */}
          <div className="lg:col-span-2 space-y-6">
            <TodayAgenda appointments={todayAppts} />
            <RevenueChart data={chartData} loading={loading} />
            <ActivityHeatmap appointments={allAppointments} loading={loading} />
          </div>

          {/* Columna derecha */}
          <div className="space-y-6">
            {/* Pagos pendientes */}
            <Card variant="glass" className="animate-fade-in border-warning/15 dark:border-warning/5 bg-warning/5 backdrop-blur-xl">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/8">
                  <AlertCircle className="h-6 w-6 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-600 dark:text-slate-300">Pagos Pendientes</p>
                  <p className="text-2xl font-bold flex items-center h-8">
                    {loading ? <Skeleton className="h-6 w-24" /> : `$${(stats?.pendingPayments ?? 0).toLocaleString()}`}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-white/50 backdrop-blur-sm hover:bg-white font-semibold"
                  onClick={() => navigate('/finance')}
                >
                  Ver detalles
                </Button>
              </CardContent>
            </Card>

            {/* Progreso de sesiones con meta editable */}
            <Card variant="glass" className="animate-fade-in border-white/20 dark:border-white/5">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base text-slate-700 dark:text-slate-200">Sesiones del Mes</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary gap-1 px-2 font-bold hover:bg-primary/10"
                  onClick={() => {
                    setGoalInput(sessionGoal.toString());
                    setIsGoalDialogOpen(true);
                  }}
                >
                  <Pencil className="h-3 w-3" /> Editar Meta
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold flex items-center h-8">
                    {loading ? <Skeleton className="h-6 w-12" /> : stats?.completedSessions ?? 0}
                  </span>
                  <Badge 
                    variant="zen" 
                    className="bg-primary/10 text-primary border-none cursor-pointer hover:bg-primary/20 transition-all gap-1"
                    onClick={() => {
                      setGoalInput(sessionGoal.toString());
                      setIsGoalDialogOpen(true);
                    }}
                  >
                    Meta: {sessionGoal}
                    <Pencil className="h-2.5 w-2.5" />
                  </Badge>
                </div>
                <Progress
                  value={((stats?.completedSessions ?? 0) / sessionGoal) * 100}
                  className="h-2 bg-slate-100 dark:bg-slate-800"
                />
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                  {Math.max(0, sessionGoal - (stats?.completedSessions ?? 0))} sesiones restantes para la meta
                </p>
              </CardContent>
            </Card>

            {/* Notas recientes */}
            <Card variant="glass" className="animate-fade-in border-white/20 dark:border-white/5">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-slate-800 dark:text-slate-100">Últimas Notas</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1.5 text-primary hover:text-primary/80 hover:bg-primary/10 transition-all duration-300 group/btn font-bold"
                  onClick={() => navigate('/notes')}
                >
                  Ver todas <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
                ) : recentNotes.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-slate-500 text-sm mb-4">No hay notas recientes</p>
                    <Button variant="outline" size="sm" className="gap-1.5 font-bold" onClick={() => navigate('/notes')}>
                      <Plus className="h-4 w-4" /> Crear nueva nota
                    </Button>
                  </div>
                ) : (
                  recentNotes.map((note, i) => (
                    <div
                      key={note.id}
                      onClick={() => navigate('/notes')}
                      className="group rounded-xl border border-white/20 dark:border-white/5 bg-white/30 dark:bg-white/5 p-4 transition-all duration-200 hover:bg-white/50 dark:hover:bg-white/10 hover:shadow-soft cursor-pointer"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{note.patientName}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {format(parseISO(note.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-black/20">{note.format}</Badge>
                      </div>
                      {note.content && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">
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

        {/* Modal para Editar Meta Mensual de Sesiones */}
        <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" /> Editar Meta Mensual de Citas
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="goalInput" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Número de Sesiones Meta por Mes
                </Label>
                <Input
                  id="goalInput"
                  type="number"
                  min="1"
                  max="500"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="Ej. 40"
                  className="h-11 rounded-xl text-lg font-bold text-center"
                />
                <p className="text-xs text-muted-foreground">
                  Esta meta se usará para calcular tu porcentaje de cumplimiento en el resumen del Dashboard.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setIsGoalDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="zen" onClick={handleSaveGoal} className="font-bold">
                Guardar Meta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Dashboard;
