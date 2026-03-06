import { cn } from '@/lib/utils';

export type LeadSource = 'instagram' | 'facebook' | 'referido' | 'web' | 'google' | 'directo' | 'otro';

interface LeadSourceBadgeProps {
    source: LeadSource;
    size?: 'sm' | 'md';
}

const SOURCE_CONFIG: Record<LeadSource, { label: string; icon: string; color: string; bg: string }> = {
    instagram: { label: 'Instagram', icon: '📸', color: 'text-pink-700 dark:text-pink-300', bg: 'bg-pink-100 dark:bg-pink-900/40' },
    facebook: { label: 'Facebook', icon: '👥', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40' },
    referido: { label: 'Referido', icon: '🤝', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40' },
    web: { label: 'Sitio Web', icon: '🌐', color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-100 dark:bg-indigo-900/40' },
    google: { label: 'Google', icon: '🔍', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40' },
    directo: { label: 'Directo', icon: '📍', color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-800/60' },
    otro: { label: 'Otro', icon: '💬', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40' },
};

const LeadSourceBadge = ({ source, size = 'sm' }: LeadSourceBadgeProps) => {
    const config = SOURCE_CONFIG[source] ?? SOURCE_CONFIG.otro;
    return (
        <span className={cn(
            'inline-flex items-center gap-1 rounded-full font-medium',
            config.color, config.bg,
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
        )}>
            <span>{config.icon}</span>
            {config.label}
        </span>
    );
};

export { SOURCE_CONFIG };
export default LeadSourceBadge;
