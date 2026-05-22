import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const StripeCallback = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const verifyStripeConnection = async () => {
      if (!user) return;

      try {
        // En un flujo real de Stripe Connect Express, el retorno no siempre trae un 'code' 
        // explícito como OAuth normal, sino que simplemente redirige al return_url.
        // Aquí podríamos llamar a una Edge Function para verificar si la cuenta completó el onboarding,
        // pero por simplicidad de este paso, actualizaremos el estado en la base de datos asumiendo 
        // que si regresó aquí y tiene un stripe_account_id, se completó.
        // En producción, es mejor tener un Webhook de Stripe (account.updated) que haga esto.

        const { data, error } = await supabase
          .from('profiles')
          .update({ stripe_account_status: 'active' })
          .eq('id', user.id)
          .select('stripe_account_id')
          .single();

        if (error) throw error;

        if (data?.stripe_account_id) {
          setStatus('success');
          setTimeout(() => {
            navigate('/settings', { state: { tab: 'integraciones' } });
          }, 2000);
        } else {
          throw new Error('No se encontró una cuenta de Stripe conectada.');
        }

      } catch (error) {
        console.error('Error verifying Stripe connection:', error);
        setStatus('error');
        setTimeout(() => {
            navigate('/settings', { state: { tab: 'integraciones' } });
        }, 3000);
      }
    };

    verifyStripeConnection();
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-6 shadow-sm">
        {status === 'loading' && (
          <>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div>
                <h2 className="text-xl font-bold">Verificando conexión...</h2>
                <p className="text-sm text-muted-foreground mt-2">Estamos confirmando tu cuenta de Stripe.</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div>
                <h2 className="text-xl font-bold">¡Cuenta Conectada!</h2>
                <p className="text-sm text-muted-foreground mt-2">Redirigiendo a tus configuraciones...</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
                <h2 className="text-xl font-bold">Ocurrió un error</h2>
                <p className="text-sm text-muted-foreground mt-2">No pudimos verificar la conexión con Stripe.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StripeCallback;
