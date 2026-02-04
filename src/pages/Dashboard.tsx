import Layout from '@/components/Layout';
import MetricCard from '@/components/dashboard/MetricCard';
import TodayAgenda from '@/components/dashboard/TodayAgenda';
import RecentNotes from '@/components/dashboard/RecentNotes';
import RevenueChart from '@/components/dashboard/RevenueChart';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react';
import { 
  mockAppointments, 
  mockClinicalNotes, 
  dashboardStats 
} from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const Dashboard = () => {
  const revenueGrowth = Math.round(
    ((dashboardStats.monthlyRevenue - dashboardStats.previousMonthRevenue) / 
    dashboardStats.previousMonthRevenue) * 100
  );

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Buenos días, <span className="text-gradient-zen">Doctor</span>
          </h1>
          <p className="text-muted-foreground">
            Aquí está el resumen de su práctica clínica
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Ingresos del Mes"
            value={`€${dashboardStats.monthlyRevenue.toLocaleString()}`}
            icon={DollarSign}
            trend={{ value: revenueGrowth, isPositive: revenueGrowth > 0 }}
            variant="zen"
          />
          <MetricCard
            title="Pacientes Activos"
            value={dashboardStats.activePatients}
            subtitle={`+${dashboardStats.newPatients} nuevos este mes`}
            icon={Users}
            variant="default"
          />
          <MetricCard
            title="Tasa de Retención"
            value={`${dashboardStats.retentionRate}%`}
            icon={TrendingUp}
            trend={{ value: 5, isPositive: true }}
            variant="success"
          />
          <MetricCard
            title="Citas Hoy"
            value={dashboardStats.todayAppointments}
            subtitle="2 confirmadas, 1 pendiente"
            icon={Calendar}
            variant="default"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Agenda */}
          <div className="lg:col-span-2 space-y-6">
            <TodayAgenda appointments={mockAppointments} />
            <RevenueChart />
          </div>

          {/* Right column - Notes & Alerts */}
          <div className="space-y-6">
            {/* Pending Payments Alert */}
            <Card variant="zen" className="animate-fade-in border-warning/20 bg-warning/5">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                  <AlertCircle className="h-6 w-6 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Pagos Pendientes</p>
                  <p className="text-2xl font-bold">€{dashboardStats.pendingPayments}</p>
                </div>
                <Button variant="outline" size="sm">
                  Ver detalles
                </Button>
              </CardContent>
            </Card>

            {/* Session Progress */}
            <Card variant="default" className="animate-fade-in">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sesiones del Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{dashboardStats.completedSessions}</span>
                  <Badge variant="zen">Meta: 40</Badge>
                </div>
                <Progress 
                  value={(dashboardStats.completedSessions / 40) * 100} 
                  className="h-2"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {40 - dashboardStats.completedSessions} sesiones restantes para alcanzar la meta
                </p>
              </CardContent>
            </Card>

            {/* Recent Notes */}
            <RecentNotes notes={mockClinicalNotes} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
