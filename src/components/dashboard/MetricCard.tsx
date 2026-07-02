import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'zen' | 'success' | 'warning';
  className?: string;
  loading?: boolean;
}

const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = 'default',
  className,
  loading = false
}: MetricCardProps) => {
  const variantStyles = {
    default: 'bg-slate-100/50 dark:bg-slate-800/50',
    zen: 'bg-primary/8',
    success: 'bg-success/8',
    warning: 'bg-warning/8',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    zen: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
  };

  return (
    <Card variant="glass" className={cn("animate-fade-in border-white/20 dark:border-white/5", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          "flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl",
          variantStyles[variant]
        )}>
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconStyles[variant])} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <span className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</span>
          )}
          {trend && !loading && (
            <span className={cn(
              "flex items-center gap-0.5 text-sm font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {loading && subtitle !== undefined && (
          <Skeleton className="h-4 w-32 mt-1" />
        )}
        {subtitle && !loading && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
