import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash, Zap, Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ActivityType } from '@/lib/activityLogger';
import NotificationBadge from '@/components/ui/NotificationBadge';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';

interface ActivityLog {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  read: boolean;
  created_at: string;
  metadata?: any;
}

const NotificationBell = ({ forceSettled, canShow }: { forceSettled?: boolean, canShow?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const { smartAlerts, dismissAlert } = useSmartAlerts();

  // Close on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  // Fetch initial logs
  useEffect(() => {
    if (!user) return;

    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setLogs(data as ActivityLog[]);
        setUnreadCount(data.filter(log => !log.read).length);
      }
    };

    fetchLogs();

    // Subscribe to new logs
    const channel = supabase
      .channel('activity-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `profile_id=eq.${user.id}`,
        },
        (payload) => {
          const newLog = payload.new as ActivityLog;
          setLogs(prev => [newLog, ...prev].slice(0, 50));
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    if (id.startsWith('smart-')) {
      dismissAlert(id);
      return;
    }
    setLogs(prev => prev.map(log => log.id === id ? { ...log, read: true } : log));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await supabase.from('activity_logs').update({ read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    smartAlerts.forEach(alert => dismissAlert(alert.id));
    if (unreadCount === 0) return;
    setLogs(prev => prev.map(log => ({ ...log, read: true })));
    setUnreadCount(0);
    await supabase.from('activity_logs').update({ read: true }).eq('profile_id', user!.id).eq('read', false);
  };

  const deleteLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id.startsWith('smart-')) {
      dismissAlert(id);
      return;
    }
    const logToDelete = logs.find(l => l.id === id);
    setLogs(prev => prev.filter(log => log.id !== id));
    if (logToDelete && !logToDelete.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    await supabase.from('activity_logs').delete().eq('id', id);
  };

  const allLogs = [...smartAlerts, ...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const displayUnreadCount = unreadCount + smartAlerts.filter(l => !l.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
          "hover:bg-white/10 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground",
          open && "bg-white/10 dark:bg-white/5 text-foreground"
        )}
      >
        <Bell className="h-4 w-4" />
        {displayUnreadCount > 0 && canShow && (
          <NotificationBadge 
            count={displayUnreadCount} 
            className="absolute top-1 right-0.5 bg-destructive shadow-destructive/40" 
            forceSettled={forceSettled}
            delay={10000}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      <div
        className={cn(
          "absolute right-0 top-[calc(100%+8px)] z-50 w-80 origin-top-right",
          "rounded-xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl",
          "dark:border-white/[0.07]",
          "transition-all duration-200 overflow-hidden flex flex-col max-h-[400px]",
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Marcar todo como leído
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {allLogs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No tienes notificaciones
            </div>
          ) : (
            <div className="flex flex-col">
              {allLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => !log.read && markAsRead(log.id)}
                  className={cn(
                    "flex flex-col gap-1 px-4 py-3 border-b border-border/30 last:border-0 transition-colors cursor-pointer group",
                    !log.read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {log.metadata?.isSmartAlert && (
                        <div className="mt-0.5 flex-shrink-0">
                          {log.metadata.icon === 'zap' ? <Zap className="h-4 w-4 text-amber-500 fill-amber-500/20" /> : 
                           log.metadata.icon === 'sparkles' ? <Sparkles className="h-4 w-4 text-primary fill-primary/20" /> :
                           <AlertTriangle className="h-4 w-4 text-destructive" />}
                        </div>
                      )}
                      <p className={cn("text-sm font-medium", !log.read && "text-primary dark:text-primary", log.metadata?.isSmartAlert && "text-foreground")}>
                        {log.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!log.read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(log.id); }}
                          className="p-1 rounded-md hover:bg-background/80 text-muted-foreground hover:text-primary"
                          title="Marcar como leído"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => deleteLog(log.id, e)}
                        className="p-1 rounded-md hover:bg-background/80 text-muted-foreground hover:text-destructive"
                        title="Eliminar"
                      >
                        <Trash className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {log.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {log.description}
                    </p>
                  )}
                  <span className="text-[10px] text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationBell;
