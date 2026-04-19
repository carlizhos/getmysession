import { cn } from '@/lib/utils';

export const AVATAR_THEMES = [
    'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground', // Sage (Primary)
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',           // Dusty Rose
    'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',          // Stone
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', // Moss
    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',       // Sand
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',          // Slate/Mist
    'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',   // Clay
];

export const getAvatarTheme = (name: string) => {
    const idx = (name?.charCodeAt(0) || 0) % AVATAR_THEMES.length;
    return AVATAR_THEMES[idx];
};

export const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return parts[0].charAt(0).toUpperCase();
};
