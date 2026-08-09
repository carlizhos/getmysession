import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileQuery, useUpdateProfileMutation } from '@/hooks/useSettingsData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, CalendarPlus, CheckCircle2, ExternalLink, Loader2, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '57982623920-afu95mjoklp5pmipaejstbeq67gqgr03.apps.googleusercontent.com';

export default function IntegrationSettings() {
  const { user } = useAuth();
  const { data: profile, refetch } = useProfileQuery(user?.id);
  const updateProfileMutation = useUpdateProfileMutation();

  const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
  const [hasOutlookCalendar, setHasOutlookCalendar] = useState(false);
  const [hasZoom, setHasZoom] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<'none' | 'pending' | 'active'>('none');

  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isLinkingStripe, setIsLinkingStripe] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [codeClient, setCodeClient] = useState<{ requestCode: () => void } | null>(null);
  const [integrationFilter, setIntegrationFilter] = useState<'all' | 'calendar' | 'video' | 'payments'>('all');

  useEffect(() => {
    if (profile) {
      setHasGoogleCalendar(!!profile.google_refresh_token);
      setHasOutlookCalendar(!!profile.microsoft_refresh_token);
      setHasZoom(!!profile.zoom_refresh_token);

      if (profile.stripe_account_id) {
        const isActive = profile.stripe_account_status === 'active';
        setStripeStatus(isActive ? 'active' : 'pending');
      } else {
        setStripeStatus('none');
      }
    }
  }, [profile]);

  const handleCodeResponse = useCallback(async (code: string) => {
    if (!user) return;
    setIsLinking(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-auth-exchange', {
        body: { code, userId: user.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setHasGoogleCalendar(true);
      toast.success('¡Google Calendar conectado profesionalmente!');
      refetch();
    } catch (err: any) {
      console.error('Error exchanging code:', err);
      toast.error('Error al vincular: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsLinking(false);
    }
  }, [user, refetch]);

  const handleMicrosoftCodeResponse = useCallback(async (code: string) => {
    if (!user) return;
    setIsLinking(true);
    try {
      const redirectUri = `${window.location.origin}/auth/microsoft/callback`;
      const { data, error } = await supabase.functions.invoke('microsoft-auth-exchange', {
        body: { code, userId: user.id, redirectUri }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setHasOutlookCalendar(true);
      toast.success('¡Microsoft 365 conectado correctamente!');
      refetch();
    } catch (err: any) {
      console.error('Error exchanging MS code:', err);
      toast.error('Error al vincular Microsoft: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsLinking(false);
    }
  }, [user, refetch]);

  const handleZoomCodeResponse = useCallback(async (code: string) => {
    if (!user) return;
    setIsLinking(true);
    try {
      const redirectUri = `${window.location.origin}/auth/zoom/callback`;
      const { data, error } = await supabase.functions.invoke('zoom-auth-exchange', {
        body: { code, userId: user.id, redirectUri }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setHasZoom(true);
      toast.success('¡Zoom conectado correctamente!');
      refetch();
    } catch (err: any) {
      console.error('Error exchanging Zoom code:', err);
      toast.error('Error al vincular Zoom: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsLinking(false);
    }
  }, [user, refetch]);

  // Google OAuth Code Client initialization
  useEffect(() => {
    if (!window.google || !GOOGLE_CLIENT_ID) return;

    try {
      console.log('[Settings] Initializing Google Code Client...');
      const client = window.google.accounts.oauth2.initCodeClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        ux_mode: 'popup',
        callback: async (response: { code: string }) => {
          if (response.code) {
            console.log('[Settings] Google Code received, starting exchange...');
            await handleCodeResponse(response.code);
          }
        },
      });
      setCodeClient(client);
    } catch (err) {
      console.error('Error initializing Google Code Client:', err);
    }
  }, [handleCodeResponse]);

  const handleLinkGoogleCalendar = async () => {
    if (!codeClient) {
      toast.error('El servicio de Google no está listo. Por favor, recarga la página.');
      return;
    }
    try {
      codeClient.requestCode();
    } catch (err) {
      console.error('Error requesting code:', err);
      toast.error('No se pudo abrir la ventana de Google');
    }
  };

  const handleUnlinkGoogleCalendar = async () => {
    if (!user) return;
    setIsUnlinking(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          google_refresh_token: null,
          google_access_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setHasGoogleCalendar(false);
      setShowUnlinkConfirm(false);
      toast.success('Google Calendar se ha desconectado correctamente');
      refetch();
    } catch (err: any) {
      console.error('Error unlinking Google Calendar:', err);
      toast.error('Error al desconectar Google Calendar');
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleLinkMicrosoftCalendar = async () => {
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
    if (!clientId) {
      toast.error('Configuración de Microsoft no disponible');
      return;
    }

    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/microsoft/callback`);
    const scope = encodeURIComponent('offline_access Calendars.ReadWrite OnlineMeetings.ReadWrite');
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}`;

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      'Microsoft Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      toast.error('Por favor, permite las ventanas emergentes para continuar');
      return;
    }

    const messageListener = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'MS_AUTH_CODE' && event.data?.code) {
        window.removeEventListener('message', messageListener);
        await handleMicrosoftCodeResponse(event.data.code);
      }
    };

    window.addEventListener('message', messageListener);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener('message', messageListener);
      }
    }, 1000);
  };

  const handleUnlinkMicrosoftCalendar = async () => {
    if (!user) return;
    setIsUnlinking(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          microsoft_refresh_token: null,
          microsoft_access_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setHasOutlookCalendar(false);
      toast.success('Microsoft 365 se ha desconectado correctamente');
      refetch();
    } catch (err: any) {
      toast.error('Error al desconectar Microsoft');
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleLinkZoom = async () => {
    const clientId = import.meta.env.VITE_ZOOM_CLIENT_ID;
    if (!clientId) {
      toast.error('Configuración de Zoom no disponible');
      return;
    }

    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/zoom/callback`);
    const scope = encodeURIComponent('meeting:write:meeting meeting:update:meeting meeting:delete:meeting user:read:user');
    const authUrl = `https://zoom.us/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`;

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      'Zoom Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      toast.error('Por favor, permite las ventanas emergentes para continuar');
      return;
    }

    const messageListener = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'ZOOM_AUTH_CODE' && event.data?.code) {
        window.removeEventListener('message', messageListener);
        await handleZoomCodeResponse(event.data.code);
      }
    };

    window.addEventListener('message', messageListener);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener('message', messageListener);
      }
    }, 1000);
  };

  const handleUnlinkZoom = async () => {
    if (!user) return;
    setIsUnlinking(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          zoom_refresh_token: null,
          zoom_access_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setHasZoom(false);
      toast.success('Zoom se ha desconectado correctamente');
      refetch();
    } catch (err: any) {
      toast.error('Error al desconectar Zoom');
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleLinkStripe = async () => {
    setIsLinkingStripe(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      const redirectUri = `${window.location.origin}/auth/stripe/callback`;
      const refreshUri = window.location.href;

      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { returnUrl: redirectUri, refreshUrl: refreshUri },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error('Error linking Stripe:', err);
      toast.error(err.message || 'Error al iniciar la conexión con Stripe');
    } finally {
      setIsLinkingStripe(false);
    }
  };

  const handleUnlinkStripe = async () => {
    if (!user) return;
    setIsUnlinking(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          stripe_account_id: null,
          stripe_account_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      setStripeStatus('none');
      toast.success('Cuenta de Stripe desconectada');
      refetch();
    } catch (err: any) {
      toast.error('Error al desconectar Stripe: ' + err.message);
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'calendar', label: 'Calendarios' },
          { id: 'video', label: 'Videollamadas' },
          { id: 'payments', label: 'Pagos' },
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setIntegrationFilter(filter.id as any)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
              integrationFilter === filter.id
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="space-y-10">
        {/* Connected Section */}
        {integrationFilter === 'all' && (hasGoogleCalendar || hasOutlookCalendar || hasZoom) && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Conectadas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Google Calendar Card */}
              {hasGoogleCalendar && (
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3">
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20 py-0.5 px-2">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Conectado
                    </Badge>
                  </div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                      <svg className="h-7 w-7" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                        <path fill="#fff" d="M19 19H5V8h14v11zM11 10.5h2V13h2.5v2H13v2.5h-2V15H8.5v-2H11v-2.5z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground pr-24">Google Calendar</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Sincronización de citas y bloqueo de espacios.</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-4 border-t border-border/50">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 px-2 font-bold uppercase tracking-tighter"
                      onClick={() => setShowUnlinkConfirm(true)}
                      disabled={isUnlinking}
                    >
                      Desconectar
                    </Button>
                  </div>
                </div>
              )}

              {/* Google Meet Card */}
              {hasGoogleCalendar && (
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3">
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20 py-0.5 px-2">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Conectado
                    </Badge>
                  </div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                      <svg className="h-7 w-7" viewBox="0 0 24 24">
                        <path fill="#00AC47" d="M16 10v-3.5c0-.83-.67-1.5-1.5-1.5h-10c-.83 0-1.5.67-1.5 1.5v9c0 .83.67 1.5 1.5 1.5h10c.83 0 1.5-.67 1.5-1.5v-3.5l4 4v-11l-4 4z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground pr-24">Google Meet</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Generación automática de enlaces para teleterapia.</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-4 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground font-medium italic">Vinculado a Google</span>
                  </div>
                </div>
              )}

              {/* Zoom Connected Card */}
              {hasZoom && (
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3">
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20 py-0.5 px-2">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Conectado
                    </Badge>
                  </div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 text-[#2D8CFF]">
                      <Video className="h-7 w-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground pr-24">Zoom</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Videollamadas profesionales y estables.</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-4 border-t border-border/50">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 px-2 font-bold uppercase tracking-tighter"
                      onClick={handleUnlinkZoom}
                      disabled={isUnlinking}
                    >
                      Desconectar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Available Integrations */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">
            {integrationFilter === 'payments' ? '' : 'Calendarios y Videollamadas'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Google Workspace */}
            {!hasGoogleCalendar && (integrationFilter === 'all' || integrationFilter === 'calendar' || integrationFilter === 'video') && (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 border border-border">
                      <svg className="h-7 w-7 opacity-70 grayscale" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M12 11h4.5c-.19 1.97-2.09 4.99-5.5 4.99-2.96 0-5.37-2.45-5.37-5.48s2.41-5.48 5.37-5.48c1.68 0 2.81.69 3.46 1.3l2.26-2.21C15.24 2.89 13.78 2 12 2 7.58 2 4 5.58 4 10s3.58 8 8 8c4.61 0 7.68-3.24 7.68-7.81 0-.53-.06-1-.15-1.44H12z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">Google Workspace</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Conecta tu cuenta de Google para usar Calendar y Meet.</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sincroniza tus citas automáticamente y permite que el sistema genere enlaces de Meet para tus sesiones remotas.
                  </p>
                </div>
                <div className="pt-6 mt-4 border-t border-border/50 flex justify-end">
                  <Button 
                    variant="zen" 
                    size="sm" 
                    className="w-full gap-2 font-bold"
                    onClick={handleLinkGoogleCalendar}
                    disabled={isLinking}
                  >
                    {isLinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarPlus className="h-3 w-3" />}
                    Conectar cuenta
                  </Button>
                </div>
              </div>
            )}

            {/* Zoom */}
            {!hasZoom && (integrationFilter === 'all' || integrationFilter === 'video') && (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-50/50 flex items-center justify-center shrink-0 border border-blue-100/50 text-[#2D8CFF]">
                      <Video className="h-7 w-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">Zoom</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Videollamadas profesionales y estables.</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Conecta tu cuenta de Zoom para que GetMySession genere de forma automática enlaces únicos para tus sesiones de teleterapia.
                  </p>
                </div>
                <div className="pt-6 mt-4 border-t border-border/50 flex justify-end gap-2">
                  <Button 
                    variant="zen" 
                    size="sm" 
                    className="w-full gap-2 font-bold"
                    onClick={handleLinkZoom}
                    disabled={isLinking}
                  >
                    {isLinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Video className="h-3 w-3" />}
                    Conectar cuenta
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Finanzas y Pagos */}
        {(integrationFilter === 'all' || integrationFilter === 'payments') && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Finanzas y Pagos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group overflow-hidden">
                {stripeStatus === 'active' && (
                  <div className="absolute top-0 right-0 p-3">
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20 py-0.5 px-2">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Conectado
                    </Badge>
                  </div>
                )}
                {stripeStatus === 'pending' && (
                  <div className="absolute top-0 right-0 p-3">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 py-0.5 px-2">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Pendiente
                    </Badge>
                  </div>
                )}
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 text-[#635BFF]">
                      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.962 8.185v7.63c0 .156.15.25.29.174l4.29-2.28a.2.2 0 0 0 .11-.174V5.905a.2.2 0 0 0-.29-.174l-4.29 2.28a.2.2 0 0 0-.11.174zM8.185 10.038v7.63c0 .156.15.25.29.174l4.29-2.28a.2.2 0 0 0 .11-.174V7.758a.2.2 0 0 0-.29-.174l-4.29 2.28a.2.2 0 0 0-.11.174zM2.408 11.89v7.63c0 .156.15.25.29.174l4.29-2.28a.2.2 0 0 0 .11-.174v-7.63a.2.2 0 0 0-.29-.174l-4.29 2.28a.2.2 0 0 0-.11.174z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground pr-24">Stripe Connect</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Recibe pagos de pacientes.</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {stripeStatus === 'pending'
                      ? 'Vinculación iniciada pero pendiente de completar el registro en la página de Stripe.'
                      : 'Vincula tu cuenta para cobrar en línea automáticamente mediante la plataforma.'}
                  </p>
                </div>
                <div className="pt-6 mt-4 border-t border-border/50 flex justify-end gap-2">
                  {stripeStatus === 'active' ? (
                    <>
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] text-destructive font-bold" onClick={handleUnlinkStripe} disabled={isUnlinking}>
                        Desconectar
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 gap-2 font-bold" onClick={handleLinkStripe} disabled={isLinkingStripe}>
                        {isLinkingStripe ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Dashboard
                      </Button>
                    </>
                  ) : stripeStatus === 'pending' ? (
                    <>
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] text-destructive font-bold" onClick={handleUnlinkStripe} disabled={isUnlinking}>
                        Desconectar
                      </Button>
                      <Button variant="zen" size="sm" className="h-8 gap-2 font-bold" onClick={handleLinkStripe} disabled={isLinkingStripe}>
                        {isLinkingStripe ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />} Completar registro
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="zen" 
                      size="sm" 
                      className="w-full gap-2 font-bold"
                      onClick={handleLinkStripe}
                      disabled={isLinkingStripe}
                    >
                      {isLinkingStripe ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                      Conectar cuenta
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unlink Confirmation Dialog */}
      <Dialog open={showUnlinkConfirm} onOpenChange={setShowUnlinkConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              ¿Desconectar Google Calendar?
            </DialogTitle>
            <DialogDescription>
              Se eliminará la sincronización bidireccional de eventos y GetMySession dejará de crear reuniones en Meet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUnlinkConfirm(false)} disabled={isUnlinking}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleUnlinkGoogleCalendar} disabled={isUnlinking}>
              {isUnlinking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, desconectar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
