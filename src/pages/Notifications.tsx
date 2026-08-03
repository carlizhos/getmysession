import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import FeatureGate from '@/components/subscription/FeatureGate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Search, 
  Zap, 
  Sparkles, 
  DollarSign, 
  Calendar, 
  Users, 
  MessageCircle, 
  AlertTriangle, 
  Check, 
  Inbox, 
  ChevronRight, 
  Clock, 
  ArrowUpRight, 
  Loader2,
  RefreshCw,
  X,
  FileText,
  SlidersHorizontal
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, formatDistanceToNow, parseISO, isToday, isYesterday, isThisWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ActivityType } from '@/lib/activityLogger';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface ExtendedNotification {
  id: string;
  type: ActivityType | 'system';
  title: string;
  description: string;
  read: boolean;
  created_at: string;
  metadata?: any;
  category: 'appointments' | 'finance' | 'patients' | 'system' | 'whatsapp';
}

const getCategoryFromType = (type: string, metadata?: any): 'appointments' | 'finance' | 'patients' | 'system' | 'whatsapp' => {
  if (type.includes('appointment') || type.includes('upcoming') || metadata?.isSmartAlert) {
    if (metadata?.icon === 'zap') return 'appointments';
  }
  if (type.includes('payment') || type.includes('finance')) return 'finance';
  if (type.includes('patient')) return 'patients';
  if (type.includes('whatsapp') || type.includes('message')) return 'whatsapp';
  return 'system';
};

const getTargetUrlAndLabel = (log: ExtendedNotification) => {
  const type = log.type || '';
  const metadata = log.metadata || {};

  if (type.includes('appointment') || metadata?.icon === 'zap' || log.id.includes('upcoming')) {
    return { url: '/agenda', label: 'Ver en Agenda', icon: Calendar };
  }
  if (type.includes('payment') || log.title.toLowerCase().includes('cobro') || log.title.toLowerCase().includes('pago')) {
    return { url: '/finance', label: 'Ver en Finanzas', icon: DollarSign };
  }
  if (type.includes('patient') || log.title.toLowerCase().includes('paciente')) {
    return { url: '/patients', label: 'Ver Expediente', icon: Users };
  }
  if (type.includes('whatsapp') || type.includes('message')) {
    return { url: '/messages', label: 'Abrir Chat', icon: MessageCircle };
  }
  if (type.includes('note') || log.title.toLowerCase().includes('nota')) {
    return { url: '/notes', label: 'Ver Notas', icon: FileText };
  }

  return { url: '/dashboard', label: 'Ver Detalle', icon: ArrowUpRight };
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { smartAlerts, dismissAlert } = useSmartAlerts();

  const [dbLogs, setDbLogs] = useState<ExtendedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | 'unread' | 'smart' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'appointments' | 'finance' | 'patients' | 'system'>('all');
  
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data) {
        const mapped: ExtendedNotification[] = data.map((item: any) => ({
          ...item,
          category: getCategoryFromType(item.type, item.metadata)
        }));
        setDbLogs(mapped);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!user) return;
    const channel = supabase
      .channel('notifications-page')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `profile_id=eq.${user.id}`,
        },
        (payload) => {
          const newLog = payload.new as any;
          const extended: ExtendedNotification = {
            ...newLog,
            category: getCategoryFromType(newLog.type, newLog.metadata)
          };
          setDbLogs(prev => [extended, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Combine Smart Alerts + DB Activity Logs
  const allNotifications = useMemo(() => {
    const smartMapped: ExtendedNotification[] = smartAlerts.map(s => ({
      id: s.id,
      type: s.type,
      title: s.title,
      description: s.description,
      read: s.read,
      created_at: s.created_at,
      metadata: s.metadata,
      category: getCategoryFromType(s.type, s.metadata)
    }));

    const combined = [...smartMapped, ...dbLogs];
    // Deduplicate by ID
    const uniqueMap = new Map<string, ExtendedNotification>();
    combined.forEach(item => uniqueMap.set(item.id, item));

    return Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [smartAlerts, dbLogs]);

  // Metrics
  const totalCount = allNotifications.length;
  const unreadCount = allNotifications.filter(n => !n.read).length;
  const smartCount = allNotifications.filter(n => n.metadata?.isSmartAlert).length;
  const todayCount = allNotifications.filter(n => isToday(parseISO(n.created_at))).length;

  // Filtering
  const filteredNotifications = useMemo(() => {
    return allNotifications.filter(item => {
      // Status Tab filter
      if (statusTab === 'unread' && item.read) return false;
      if (statusTab === 'read' && !item.read) return false;
      if (statusTab === 'smart' && !item.metadata?.isSmartAlert) return false;

      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      // Search Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [allNotifications, statusTab, categoryFilter, searchQuery]);

  // Date Grouping
  const groupedNotifications = useMemo(() => {
    const groups: { label: string; items: ExtendedNotification[] }[] = [
      { label: 'Hoy', items: [] },
      { label: 'Ayer', items: [] },
      { label: 'Esta Semana', items: [] },
      { label: 'Anteriores', items: [] },
    ];

    filteredNotifications.forEach(item => {
      const date = parseISO(item.created_at);
      if (isToday(date)) {
        groups[0].items.push(item);
      } else if (isYesterday(date)) {
        groups[1].items.push(item);
      } else if (isThisWeek(date)) {
        groups[2].items.push(item);
      } else {
        groups[3].items.push(item);
      }
    });

    return groups.filter(g => g.items.length > 0);
  }, [filteredNotifications]);

  // Single Item Actions
  const handleToggleRead = async (id: string, currentRead: boolean) => {
    if (id.startsWith('smart-')) {
      dismissAlert(id);
      toast.success('Alerta descartada');
      return;
    }

    setDbLogs(prev => prev.map(log => log.id === id ? { ...log, read: !currentRead } : log));
    await supabase.from('activity_logs').update({ read: !currentRead }).eq('id', id);
    toast.success(!currentRead ? 'Marcada como leída' : 'Marcada como no leída');
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('smart-')) {
      dismissAlert(id);
      toast.success('Alerta eliminada');
      return;
    }

    setDbLogs(prev => prev.filter(log => log.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await supabase.from('activity_logs').delete().eq('id', id);
    toast.success('Notificación eliminada');
  };

  // Bulk Actions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredNotifications.map(n => n.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkMarkRead = async () => {
    if (selectedIds.size === 0) return;
    setIsActionLoading(true);

    const idsArray = Array.from(selectedIds);
    const dbIds = idsArray.filter(id => !id.startsWith('smart-'));
    const smartIds = idsArray.filter(id => id.startsWith('smart-'));

    smartIds.forEach(id => dismissAlert(id));

    if (dbIds.length > 0) {
      setDbLogs(prev => prev.map(log => selectedIds.has(log.id) ? { ...log, read: true } : log));
      await supabase.from('activity_logs').update({ read: true }).in('id', dbIds);
    }

    setSelectedIds(new Set());
    setIsActionLoading(false);
    toast.success(`${idsArray.length} notificaciones marcadas como leídas`);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsActionLoading(true);

    const idsArray = Array.from(selectedIds);
    const dbIds = idsArray.filter(id => !id.startsWith('smart-'));
    const smartIds = idsArray.filter(id => id.startsWith('smart-'));

    smartIds.forEach(id => dismissAlert(id));

    if (dbIds.length > 0) {
      setDbLogs(prev => prev.filter(log => !selectedIds.has(log.id)));
      await supabase.from('activity_logs').delete().in('id', dbIds);
    }

    setSelectedIds(new Set());
    setIsActionLoading(false);
    toast.success(`${idsArray.length} notificaciones eliminadas`);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setIsActionLoading(true);

    dbLogs.forEach(log => {
      if (log.id.startsWith('smart-')) dismissAlert(log.id);
    });

    setDbLogs(prev => prev.map(log => ({ ...log, read: true })));
    await supabase.from('activity_logs').update({ read: true }).eq('profile_id', user!.id).eq('read', false);

    setIsActionLoading(false);
    toast.success('Todas las notificaciones fueron marcadas como leídas');
  };

  const isAllSelected = filteredNotifications.length > 0 && selectedIds.size === filteredNotifications.length;

  return (
    <Layout>
      <FeatureGate feature="core_agenda">
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* Header principal */}
          <div id="tour-notifications-header" className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-6 rounded-3xl border border-border/60 shadow-soft backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 relative">
                <Bell className="h-7 w-7 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-[10px] font-black flex items-center justify-center border-2 border-background animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                    Centro de Notificaciones
                  </h1>
                  {unreadCount > 0 && (
                    <Badge variant="zen" className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5 font-bold">
                      {unreadCount} sin leer
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Historial completo de tu actividad clínica, cobros, citas, alertas de IA y avisos de sistema.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchNotifications}
                disabled={isLoading}
                className="h-10 px-3.5 text-xs font-semibold gap-2 border-border/60 hover:bg-muted/50 rounded-xl"
                title="Actualizar notificaciones"
              >
                <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isLoading && "animate-spin")} />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>

              {unreadCount > 0 && (
                <Button
                  variant="zen"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={isActionLoading}
                  className="h-10 px-4 text-xs font-bold gap-2 shadow-lg shadow-primary/20 rounded-xl"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>Marcar todo como leído</span>
                </Button>
              )}
            </div>
          </div>

          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="flat" className="border-border/50 shadow-soft bg-card/80 backdrop-blur-xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Total Histórico</p>
                  <p className="text-3xl font-black mt-1 tracking-tight text-foreground">{totalCount}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Inbox className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card variant="flat" className="border-primary/20 shadow-soft bg-primary/5 backdrop-blur-xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary font-bold uppercase tracking-widest">Sin Leer</p>
                  <p className="text-3xl font-black mt-1 tracking-tight text-primary">{unreadCount}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/30">
                  <Bell className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card variant="flat" className="border-amber-500/20 shadow-soft bg-amber-500/5 backdrop-blur-xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest">Alertas IA</p>
                  <p className="text-3xl font-black mt-1 tracking-tight text-amber-600 dark:text-amber-400">{smartCount}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card variant="flat" className="border-border/50 shadow-soft bg-card/80 backdrop-blur-xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Recibidas Hoy</p>
                  <p className="text-3xl font-black mt-1 tracking-tight text-foreground">{todayCount}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls Bar: Search, Status Tabs, Category Filter */}
          <div className="space-y-4 bg-card/80 p-4 sm:p-5 rounded-3xl border border-border/60 shadow-soft backdrop-blur-xl">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              
              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-2xl border border-border/40 w-full lg:w-auto overflow-x-auto">
                <button
                  onClick={() => setStatusTab('all')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                    statusTab === 'all' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>Todas</span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{totalCount}</Badge>
                </button>
                <button
                  onClick={() => setStatusTab('unread')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                    statusTab === 'unread' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>No leídas</span>
                  {unreadCount > 0 && (
                    <Badge variant="zen" className="h-5 px-1.5 text-[10px] bg-white/20 text-white border-none">
                      {unreadCount}
                    </Badge>
                  )}
                </button>
                <button
                  onClick={() => setStatusTab('smart')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                    statusTab === 'smart' ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Alertas Inteligentes</span>
                  {smartCount > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-white/20 text-white border-none">
                      {smartCount}
                    </Badge>
                  )}
                </button>
                <button
                  onClick={() => setStatusTab('read')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                    statusTab === 'read' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>Leídas</span>
                </button>
              </div>

              {/* Right Side: Search and Category Pills */}
              <div className="flex flex-col sm:flex-row gap-3 items-center w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar en notificaciones..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-muted/30 border-border/50 rounded-xl focus:bg-background transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Selector */}
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as any)}
                    className="h-10 bg-muted/30 border border-border/50 text-xs font-bold rounded-xl px-3 outline-none text-foreground cursor-pointer focus:bg-background transition-all w-full sm:w-auto"
                  >
                    <option value="all">Todas las categorías</option>
                    <option value="appointments">📅 Citas y Agenda</option>
                    <option value="finance">💳 Cobros y Finanzas</option>
                    <option value="patients">👥 Pacientes</option>
                    <option value="system">⚡ Alertas y Sistema</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bulk Toolbar (Visible when at least 1 item is checked or items exist) */}
            {filteredNotifications.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={isAllSelected}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      className="rounded-md"
                    />
                    <label htmlFor="select-all" className="font-semibold cursor-pointer select-none">
                      {isAllSelected ? 'Desmarcar todas' : 'Seleccionar todas'}
                    </label>
                  </div>
                  {selectedIds.size > 0 && (
                    <Badge variant="secondary" className="font-bold">
                      {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end animate-in fade-in duration-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkMarkRead}
                      disabled={isActionLoading}
                      className="h-8 px-3 text-[11px] font-bold gap-1.5 border-border/60 rounded-lg"
                    >
                      <CheckCheck className="h-3.5 w-3.5 text-primary" />
                      <span>Marcar como leídas</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={isActionLoading}
                      className="h-8 px-3 text-[11px] font-bold gap-1.5 text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Eliminar</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Notifications List Grouped by Date */}
          {isLoading ? (
            <div className="space-y-4 py-12 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-30 mx-auto" />
              <p className="text-sm text-muted-foreground font-medium animate-pulse">Cargando historial de notificaciones...</p>
            </div>
          ) : groupedNotifications.length === 0 ? (
            <Card variant="flat" className="border-border/60 p-12 text-center bg-card/50 rounded-3xl">
              <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Inbox className="h-8 w-8 opacity-60" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">No hay notificaciones</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {searchQuery || categoryFilter !== 'all' || statusTab !== 'all'
                      ? 'No se encontraron notificaciones que coincidan con los filtros aplicados.'
                      : '¡Estás al día! Todas tus alertas y avisos aparecerán en esta pantalla.'}
                  </p>
                </div>
                {(searchQuery || categoryFilter !== 'all' || statusTab !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('all');
                      setStatusTab('all');
                    }}
                    className="mt-2 text-xs font-bold rounded-xl"
                  >
                    Restablecer Filtros
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="space-y-8">
              {groupedNotifications.map((group) => (
                <div key={group.label} className="space-y-3">
                  <div className="flex items-center gap-3 px-1">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">
                      {group.label}
                    </span>
                    <div className="h-px flex-1 bg-border/40" />
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {group.items.length} aviso{group.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {group.items.map((log) => {
                      const target = getTargetUrlAndLabel(log);
                      const isSelected = selectedIds.has(log.id);

                      return (
                        <div
                          key={log.id}
                          className={cn(
                            "group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all duration-200",
                            !log.read 
                              ? "bg-card border-primary/30 shadow-md shadow-primary/5 dark:bg-card/90" 
                              : "bg-card/40 border-border/40 hover:bg-card hover:border-border/80",
                            isSelected && "border-primary bg-primary/5 shadow-md"
                          )}
                        >
                          {/* Left: Checkbox + Icon + Details */}
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleSelect(log.id)}
                              className="mt-1 rounded-md shrink-0"
                            />

                            {/* Category Icon Badge */}
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                              log.metadata?.isSmartAlert
                                ? log.metadata.icon === 'zap' ? "bg-amber-500/15 text-amber-500" : "bg-primary/15 text-primary"
                                : log.category === 'finance' ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : log.category === 'appointments' ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                : log.category === 'patients' ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {log.metadata?.isSmartAlert ? (
                                log.metadata.icon === 'zap' ? <Zap className="h-5 w-5 fill-amber-500/20" /> : <Sparkles className="h-5 w-5 fill-primary/20" />
                              ) : log.category === 'finance' ? (
                                <DollarSign className="h-5 w-5" />
                              ) : log.category === 'appointments' ? (
                                <Calendar className="h-5 w-5" />
                              ) : log.category === 'patients' ? (
                                <Users className="h-5 w-5" />
                              ) : log.category === 'whatsapp' ? (
                                <MessageCircle className="h-5 w-5" />
                              ) : (
                                <AlertTriangle className="h-5 w-5" />
                              )}
                            </div>

                            {/* Text Content */}
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {!log.read && (
                                  <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-ping" />
                                )}
                                <h4 className={cn(
                                  "text-sm tracking-tight leading-snug",
                                  !log.read ? "font-bold text-foreground" : "font-semibold text-foreground/80"
                                )}>
                                  {log.title}
                                </h4>

                                {log.metadata?.isSmartAlert && (
                                  <Badge variant="zen" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-none text-[9px] px-2 py-0 font-bold uppercase tracking-wider">
                                    Inteligencia IA
                                  </Badge>
                                )}
                              </div>

                              {log.description && (
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                  {log.description}
                                </p>
                              )}

                              <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground/70">
                                <span>{formatDistanceToNow(parseISO(log.created_at), { addSuffix: true, locale: es })}</span>
                                <span>•</span>
                                <span>{format(parseISO(log.created_at), 'd MMM yyyy, HH:mm', { locale: es })}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/30 justify-end">
                            {/* Contextual Deep Link Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!log.read) handleToggleRead(log.id, false);
                                navigate(target.url);
                              }}
                              className="h-8 px-3 text-xs font-bold gap-1.5 bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/40 rounded-xl transition-all shadow-sm"
                            >
                              <target.icon className="h-3.5 w-3.5 text-primary" />
                              <span>{target.label}</span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            </Button>

                            {/* Mark Read/Unread Toggle */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleToggleRead(log.id, log.read)}
                              title={log.read ? "Marcar como no leída" : "Marcar como leída"}
                              className={cn(
                                "h-8 w-8 rounded-lg hover:bg-muted/80 transition-colors",
                                !log.read ? "text-primary hover:text-primary" : "text-muted-foreground"
                              )}
                            >
                              <Check className={cn("h-4 w-4", !log.read && "stroke-[3]")} />
                            </Button>

                            {/* Delete Button */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(log.id)}
                              title="Eliminar notificación"
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FeatureGate>
    </Layout>
  );
};

export default Notifications;
