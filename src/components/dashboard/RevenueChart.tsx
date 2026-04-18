import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export interface RevenuePoint {
  name: string;
  ingresos: number;
  sesiones: number;
}

interface RevenueChartProps {
  data: RevenuePoint[];
  loading?: boolean;
}

const RevenueChart = ({ data, loading }: RevenueChartProps) => {
  return (
    <Card variant="glass" className="animate-fade-in border-white/20 dark:border-white/5">
      <CardHeader>
        <CardTitle className="text-slate-800 dark:text-slate-100">Ingresos Mensuales</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-slate-500">Cargando datos...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0066FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="rgba(0,0,0,0.3)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="rgba(0,0,0,0.3)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, key: string) => [
                    key === 'ingresos' ? `$${value.toLocaleString()}` : value,
                    key === 'ingresos' ? 'Ingresos' : 'Sesiones',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorIngresos)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
