import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: object) => void;
                    prompt: () => void;
                    cancel: () => void;
                };
            };
        };
        handleGoogleOneTap?: (response: { credential: string }) => void;
    }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const GoogleOneTap = () => {
    const navigate = useNavigate();

    const handleCredential = useCallback(async (credential: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: credential,
            });

            if (error) throw error;

            if (data.user) {
                // Sync profile
                await supabase.from('profiles').upsert({
                    id: data.user.id,
                    full_name: data.user.user_metadata?.full_name ?? null,
                }, { onConflict: 'id' });

                toast.success('¡Bienvenido de vuelta!');
                navigate('/');
            }
        } catch (err: any) {
            toast.error('Error al iniciar sesión: ' + err.message);
        }
    }, [navigate]);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;

        // Expose global callback for Google
        window.handleGoogleOneTap = (response: { credential: string }) => {
            handleCredential(response.credential);
        };

        const initGSI = () => {
            if (!window.google) return;
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: window.handleGoogleOneTap,
                auto_select: false,
                cancel_on_tap_outside: true,
                use_fedcm_for_prompt: true,
            });
            window.google.accounts.id.prompt();
        };

        // If GSI script already loaded
        if (window.google) {
            initGSI();
            return;
        }

        // Otherwise wait for the script to load
        const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
        if (script) {
            script.addEventListener('load', initGSI);
            return () => {
                script.removeEventListener('load', initGSI);
                window.google?.accounts.id.cancel();
            };
        }

        return () => {
            window.google?.accounts.id.cancel();
        };
    }, [handleCredential]);

    return null; // Renders nothing — One Tap appears as floating widget
};

export default GoogleOneTap;
