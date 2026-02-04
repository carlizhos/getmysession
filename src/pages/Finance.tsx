import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Plus
} from 'lucide-react';
import { mockTransactions, dashboardStats } from '@/lib/mockData';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const revenueData = [
  { name: 'Sem 1', ingresos: 580 },
  { name: 'Sem 2', ingresos: 720 },
  { name: 'Sem 3', ingresos: 650 },
  { name: 'Sem 4', ingresos: 500 },
];

const paymentMethodData = [
  { name: 'Transferencia', value: 45, color: 'hsl(var(--primary))' },
  { name: 'Tarjeta', value: 35, color: 'hsl(var(--zen-sky))' },
  { name: 'Efectivo', value: 20, color: 'hsl(var(--zen-warm))' },
];

const Finance = () => {
  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'transfer': return <ArrowUpRight className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'cash': return <Wallet className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'transfer': return 'Transferencia';
      case 'card': return 'Tarjeta';
      case 'cash': return 'Efectivo';
      default: return method;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
            <p className="text-muted-foreground">
              Control de ingresos, pagos y facturación
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button variant="zen" className="gap-2">
              <Plus className="h-4 w-4" />
              Registrar Pago
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card variant="default" className="animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ingresos del Mes</p>
                  <p className="text-3xl font-bold mt-1">€{dashboardStats.monthlyRevenue.toLocaleString()}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-sm text-success">
                <ArrowUpRight className="h-4 w-4" />
                +16.7% vs mes anterior
              </div>
            </CardContent>
          </Card>

          <Card variant="default" className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pagos Pendientes</p>
                  <p className="text-3xl font-bold mt-1">€{dashboardStats.pendingPayments}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                  <Receipt className="h-6 w-6 text-warning" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                3 facturas por cobrar
              </p>
            </CardContent>
          </Card>

          <Card variant="default" className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sesiones Cobradas</p>
                  <p className="text-3xl font-bold mt-1">28</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                de 32 sesiones totales
              </p>
            </CardContent>
          </Card>

          <Card variant="default" className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tarifa Promedio</p>
                  <p className="text-3xl font-bold mt-1">€76.50</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zen-sky-light">
                  <CreditCard className="h-6 w-6 text-zen-sky" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                por sesión
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Revenue Chart */}
          <Card variant="default" className="lg:col-span-2 animate-fade-in">
            <CardHeader>
              <CardTitle>Ingresos Semanales</CardTitle>
              <CardDescription>Distribución de ingresos este mes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `€${value}`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                      }}
                      formatter={(value: number) => [`€${value}`, 'Ingresos']}
                    />
                    <Area
                      type="monotone"
                      dataKey="ingresos"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card variant="default" className="animate-fade-in">
            <CardHeader>
              <CardTitle>Métodos de Pago</CardTitle>
              <CardDescription>Distribución por tipo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                      }}
                      formatter={(value: number) => [`${value}%`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {paymentMethodData.map((method, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: method.color }}
                      />
                      <span>{method.name}</span>
                    </div>
                    <span className="font-medium">{method.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card variant="default" className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transacciones Recientes</CardTitle>
              <CardDescription>Últimos pagos registrados</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTransactions.map((transaction, index) => (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      {getMethodIcon(transaction.method)}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.patientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(transaction.date), "d MMM yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{getMethodLabel(transaction.method)}</Badge>
                    <span className="text-lg font-semibold text-success">
                      +€{transaction.amount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Finance;
