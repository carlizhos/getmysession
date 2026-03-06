import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    sessionStartTime: Date | null;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signInWithGoogle: () => Promise<{ error: AuthError | null }>;
    signOut: (event?: 'logout' | 'timeout') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Registra un evento en la tabla session_logs */
async function logSessionEvent(
    userId: string,
    email: string,
    event: 'login' | 'logout' | 'timeout' | 'session_extended',
    durationSeconds?: number
) {
    try {
        await supabase.from('session_logs').insert({
            user_id: userId,
            email,
            event,
            user_agent: navigator.userAgent.slice(0, 300),
            session_duration_seconds: durationSeconds ?? null,
        });
    } catch (err) {
        console.warn('[session_logs] Error al registrar evento:', err);
    }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
    const sessionStartRef = useRef<Date | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                const start = new Date();
                setSessionStartTime(start);
                sessionStartRef.current = start;
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (event === 'SIGNED_IN' && session?.user) {
                const start = new Date();
                setSessionStartTime(start);
                sessionStartRef.current = start;
            }
            if (event === 'SIGNED_OUT') {
                setSessionStartTime(null);
                sessionStartRef.current = null;
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string, fullName: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
        });

        if (data.user && !error) {
            // Sincronizar perfil
            await supabase.from('profiles').upsert({
                id: data.user.id,
                full_name: fullName,
                email,
            }, { onConflict: 'id' });
        }

        return { error };
    };

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (data.user && !error) {
            // Sincronizar perfil
            await supabase.from('profiles').upsert({
                id: data.user.id,
                full_name: data.user.user_metadata?.full_name ?? null,
                email,
            }, { onConflict: 'id' });

            // Audit log: login
            await logSessionEvent(data.user.id, email, 'login');
        }

        return { error };
    };

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/`,
            }
        });
        return { error };
    };

    const signOut = async (event: 'logout' | 'timeout' = 'logout') => {
        if (user && sessionStartRef.current) {
            const durationSeconds = Math.round(
                (Date.now() - sessionStartRef.current.getTime()) / 1000
            );
            await logSessionEvent(user.id, user.email ?? '', event, durationSeconds);
        }
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, sessionStartTime, signUp, signIn, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
