import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface Organization {
    id: string;
    name: string;
    slug: string;
    subscription_status: string;
    plan_id: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    stripe_customer_id: string | null;
    settings: Record<string, unknown>;
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
    signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
    resendConfirmationEmail: (email: string) => Promise<{ error: AuthError | null }>;
    signInWithGoogle: () => Promise<{ error: AuthError | null }>;
    signInWithGoogleIdToken: (credential: string) => Promise<{ error: AuthError | null }>;
    signOut: (event?: 'logout' | 'timeout') => Promise<void>;
    refreshOrganization: () => Promise<void>;
    switchOrganization: (organizationId: string) => Promise<void>;
    profile: any | null;
    refreshProfile: () => Promise<void>;
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
    } catch (err: unknown) {
        const error = err as Error;
        console.warn('[session_logs] Error al registrar evento:', error);
    }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
    const sessionStartRef = useRef<Date | null>(null);

    const fetchOrganization = useCallback(async (userId: string, isRetry = false) => {
        try {
            // 1. Get current organization ID and profile from profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
                
            setProfile(profileData);

            // 2. Fetch all organizations where user is a member
            const { data: memberships } = await supabase
                .from('organization_members')
                .select(`
                    role,
                    organizations (id, name, slug, subscription_status, plan_id, current_period_end, cancel_at_period_end, stripe_customer_id, settings, type)
                `)
                .eq('user_id', userId);

            if (memberships && memberships.length > 0) {
                const orgs = memberships.map(m => {
                    const org = m.organizations as unknown as Organization;
                    return {
                        ...org,
                        role: m.role as Organization['role']
                    };
                });
                
                setAvailableOrganizations(orgs);

                const currentOrg = orgs.find(o => o.id === profileData?.current_organization_id) || orgs[0];
                if (currentOrg) {
                    // 3. Fetch member count for the current organization
                    const { count } = await supabase
                        .from('organization_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', currentOrg.id);
                    
                    setOrganization({ ...currentOrg, member_count: count || 0 });
                    
                    // Update profile if current_organization_id was missing or changed
                    if (!profileData?.current_organization_id || profileData.current_organization_id !== currentOrg.id) {
                        await supabase
                            .from('profiles')
                            .update({ current_organization_id: currentOrg.id })
                            .eq('id', userId);
                    }
                } else {
                    setOrganization(null);
                }
            } else if (!isRetry) {
                // Auto-create a default organization for legacy users or if missing
                const fullName = profileData?.full_name || 'Usuario';
                const orgName = `Consultorio de ${fullName}`;
                const orgSlug = `org-${userId.slice(0, 8)}-${Date.now().toString().slice(-4)}`;
                
                const { data: org, error: orgErr } = await supabase.rpc('create_personal_organization', {
                    p_name: orgName,
                    p_slug: orgSlug,
                    p_user_id: userId
                });

                if (org && !orgErr) {
                    // Recursive call to load the newly created org properly
                    await fetchOrganization(userId, true);
                    return;
                } else {
                    console.error('Failed to auto-create organization:', orgErr);
                    setAvailableOrganizations([]);
                    setOrganization(null);
                }
            } else {
                console.warn('Organization auto-created but not visible yet in memberships query.');
                setAvailableOrganizations([]);
                setOrganization(null);
            }
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Error fetching organization:', error);
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

    const refreshProfile = async () => {
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
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Error switching organization:', error);
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
            const orgSlug = `org-${data.user.id.slice(0, 8)}-${Date.now().toString().slice(-4)}`;
            
            const { data: org, error: orgErr } = await supabase.rpc('create_personal_organization', {
                p_name: orgName,
                p_slug: orgSlug,
                p_user_id: data.user.id
            });

            if (org && !orgErr) {
                // The RPC handles adding the member and updating the profile.
                await fetchOrganization(data.user.id);
            } else {
                // Fallback: sync profile without org if org creation fails
                await supabase.from('profiles').upsert({
                    id: data.user.id,
                    full_name: fullName,
                }, { onConflict: 'id' });
            }
        }

        return { error };
    };

    const signInWithMagicLink = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/`,
            }
        });
        return { error };
    };

    const resendConfirmationEmail = async (email: string) => {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
        });
        return { error };
    };

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (data.user && !error) {
            // Sincronizar perfil (optional, updates metadata if changed)
            await supabase.from('profiles').upsert({
                id: data.user.id,
                full_name: data.user.user_metadata?.full_name ?? null,
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

    /** Sign in using Google Identity Services ID Token (no redirect, no supabase.co domain shown) */
    const signInWithGoogleIdToken = async (credential: string) => {
        const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: credential,
        });

        if (data.user && !error) {
            await supabase.from('profiles').upsert({
                id: data.user.id,
                full_name: data.user.user_metadata?.full_name ?? null,
            }, { onConflict: 'id' });

            await logSessionEvent(data.user.id, data.user.email ?? '', 'login');
            await fetchOrganization(data.user.id);
        }

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
            signInWithMagicLink,
            resendConfirmationEmail,
            signInWithGoogle,
            signInWithGoogleIdToken,
            signOut, 
            refreshOrganization,
            switchOrganization,
            profile,
            refreshProfile
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
