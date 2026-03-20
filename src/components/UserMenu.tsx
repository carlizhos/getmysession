import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserMenuProps {
    pendingCount?: number;
}

const UserMenu = ({ pendingCount = 0 }: UserMenuProps) => {
    const [open, setOpen] = useState(false);
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const ref = useRef<HTMLDivElement>(null);

    const initials =
        user?.user_metadata?.full_name?.charAt(0).toUpperCase() ||
        user?.email?.charAt(0).toUpperCase() ||
        'U';
    const fullName = user?.user_metadata?.full_name || 'Usuario';
    const email = user?.email || '';

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const go = (href: string) => { setOpen(false); navigate(href); };

    const handleLogout = async () => {
        setOpen(false);
        await signOut();
        toast.success('Sesión cerrada correctamente');
    };

    return (
        <div className="relative" ref={ref}>
            {/* Trigger */}
            <button
                onClick={() => setOpen(v => !v)}
                aria-label="Menú de usuario"
                aria-expanded={open}
                className={cn(
                    'flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-all duration-200',
                    'hover:bg-muted',
                    open && 'bg-muted'
                )}
            >
                {/* Avatar */}
                <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                    {initials}
                    {pendingCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive text-[7px] font-bold text-white leading-none">
                            {pendingCount}
                        </span>
                    )}
                </div>
                <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
            </button>

            {/* Dropdown */}
            <div
                className={cn(
                    'absolute right-0 top-[calc(100%+8px)] z-50 w-[220px] origin-top-right',
                    'rounded-2xl border border-border/60 py-1.5',
                    'bg-background/80 backdrop-blur-xl shadow-2xl',
                    'dark:bg-background/70 dark:border-white/[0.07]',
                    'transition-all duration-200',
                    open
                        ? 'opacity-100 scale-100 pointer-events-auto'
                        : 'opacity-0 scale-95 pointer-events-none'
                )}
            >
                {/* User info header */}
                <div className="px-3 pb-2 pt-1 border-b border-border/40 mb-1">
                    <p className="text-sm font-semibold truncate">{fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                </div>

                {/* Menu items */}
                <MenuItem icon={User} label="Mi Perfil" onClick={() => go('/settings')} />
                <MenuItem
                    icon={Settings}
                    label="Configuración"
                    onClick={() => go('/settings')}
                    badge={pendingCount > 0 ? 'Incompleto' : undefined}
                />

                {/* Divider */}
                <div className="my-1.5 border-t border-border/40" />

                <MenuItem
                    icon={LogOut}
                    label="Cerrar Sesión"
                    onClick={handleLogout}
                    danger
                />
            </div>
        </div>
    );
};

// ── MenuItem helper ───────────────────────────────────────────────────────────
interface MenuItemProps {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    badge?: string;
    danger?: boolean;
}

const MenuItem = ({ icon: Icon, label, onClick, badge, danger }: MenuItemProps) => (
    <button
        onClick={onClick}
        className={cn(
            'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
            'hover:bg-muted/60 active:bg-muted',
            danger
                ? 'text-destructive hover:bg-destructive/10'
                : 'text-foreground/80 hover:text-foreground'
        )}
    >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        {badge && (
            <span className="text-[10px] font-medium text-destructive bg-destructive/10 rounded-full px-1.5 py-0.5 leading-none">
                {badge}
            </span>
        )}
    </button>
);

export default UserMenu;
