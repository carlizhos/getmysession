import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import NotificationBadge from '@/components/ui/NotificationBadge';

interface MessageBellProps {
  count?: number;
}

const MessageBell = ({ count = 2 }: MessageBellProps) => {
  const navigate = useNavigate();

  return (
    <div className="relative group">
      <button
        onClick={() => navigate('/messages')}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
          "hover:bg-white/10 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground",
          "active:scale-95"
        )}
        title="Mensajes de WhatsApp"
      >
        <MessageSquare className="h-4 w-4" />
        {count > 0 && (
          <NotificationBadge 
            count={count} 
            className="absolute top-1 right-[1px] bg-primary shadow-primary/40" 
            delay={10000}
          />
        )}
      </button>

      {/* Simple Tooltip for premium feel */}
      <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-[70]">
        Ver mensajes
      </div>
    </div>
  );
};

export default MessageBell;
