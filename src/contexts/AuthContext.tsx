import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface Organization {
    id: string;
    name: string;
    slug: string;
    subscription_status: string;
    settings: any;
    type: 'personal' | 'team';
    role?: 'owner' | 'admin' | 'therapist' | 'receptionist';
    member_count?: number;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    organization: Organization | null;
    availableOrganizations: Organization[];
    loading: boolean;
    sessionStartTime: Date | null;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signInWithGoogle: () => Promise<{ error: AuthError | null }>;
    signOut: (event?: 'logout' | 'timeout') => Promise<void>;
    refreshOrganization: () => Promise<void>;
    switchOrganization: (organizationId: string) => Promise<void>;
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
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
    const sessionStartRef = useRef<Date | null>(null);

    const fetchOrganization = useCallback(async (userId: string) => {
        try {
            // 1. Get current organization ID from profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('current_organization_id')
                .eq('id', userId)
                .single();

            // 2. Fetch all organizations where user is a member
            const { data: memberships } = await supabase
                .from('organization_members')
                .select(`
                    role,
                    organizations (id, name, slug, subscription_status, settings, type)
                `)
                .eq('user_id', userId);

            if (memberships) {
                const orgs = memberships.map(m => ({
                    ...(m.organizations as any),
                    role: m.role
                })) as Organization[];
                
                setAvailableOrganizations(orgs);

                const currentOrg = orgs.find(o => o.id === profile?.current_organization_id) || orgs[0];
                if (currentOrg) {
                    // 3. Fetch member count for the current organization
                    const { count } = await supabase
                        .from('organization_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', currentOrg.id);
                    
                    setOrganization({ ...currentOrg, member_count: count || 0 });
                    
                    // Update profile if current_organization_id was missing or changed
                    if (!profile?.current_organization_id || profile.current_organization_id !== currentOrg.id) {
                        await supabase
                            .from('profiles')
                            .update({ current_organization_id: currentOrg.id })
                            .eq('id', userId);
                    }
                } else {
                    setOrganization(null);
                }
            } else {
                setAvailableOrganizations([]);
                setOrganization(null);
            }
        } catch (err) {
            console.error('Error fetching organization:', err);
            setOrganization(null);
            setAvailableOrganizations([]);
        }
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                const start = new Date();
                setSessionStartTime(start);
                sessionStartRef.current = start;
                fetchOrganization(session.user.id);
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
                fetchOrganization(session.user.id);
            }
            if (event === 'SIGNED_OUT') {
                setSessionStartTime(null);
                sessionStartRef.current = null;
                setOrganization(null);
                setAvailableOrganizations([]);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [fetchOrganization]);

    const refreshOrganization = async () => {
        if (user) await fetchOrganization(user.id);
    };

    const switchOrganization = async (orgId: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ current_organization_id: orgId })
                .eq('id', user.id);
            
            if (error) throw error;
            await fetchOrganization(user.id);
            window.location.reload(); // Hard reload to clear other states if needed
        } catch (err: any) {
            console.error('Error switching organization:', err);
        }
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
        });

        if (data.user && !error) {
            // 1. Create a default organization for the new user
            const orgName = `Consultorio de ${fullName}`;
            const orgSlug = `org-${data.user.id.slice(0, 8)}`;
            
            const { data: org, error: orgErr } = await supabase.from('organizations').insert({
                name: orgName,
                slug: orgSlug,
                type: 'personal',
            }).select().single();

            if (org && !orgErr) {
                // 2. Add user as owner
                await supabase.from('organization_members').insert({
                    organization_id: org.id,
                    user_id: data.user.id,
                    role: 'owner',
                });

                // 3. Sincronizar perfil with current organization ID
                await supabase.from('profiles').upsert({
                    id: data.user.id,
                    full_name: fullName,
                    email,
                    current_organization_id: org.id,
                }, { onConflict: 'id' });
                
                await fetchOrganization(data.user.id);
            } else {
                // Fallback: sync profile without org if org creation fails
                await supabase.from('profiles').upsert({
                    id: data.user.id,
                    full_name: fullName,
                    email,
                }, { onConflict: 'id' });
            }
        }

        return { error };
    };

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (data.user && !error) {
            // Sincronizar perfil (optional, updates email if changed)
            await supabase.from('profiles').upsert({
                id: data.user.id,
                full_name: data.user.user_metadata?.full_name ?? null,
                email,
            }, { onConflict: 'id' });

            // Audit log: login
            await logSessionEvent(data.user.id, email, 'login');
            
            await fetchOrganization(data.user.id);
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
        <AuthContext.Provider value={{ 
            user, 
            session, 
            organization, 
            availableOrganizations,
            loading, 
            sessionStartTime, 
            signUp, 
            signIn, 
            signInWithGoogle, 
            signOut, 
            refreshOrganization,
            switchOrganization
        }}>
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
