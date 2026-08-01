import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function PortalLogin() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !phone) {
      toast.error('Por favor ingresa ambos campos.');
      return;
    }

    setIsLoading(true);
    try {
      // Use the secure create_portal_session RPC
      // This validates credentials and returns a temporary access token
      const { data, error } = await supabase.rpc('create_portal_session', {
        p_email: email,
        p_phone: phone
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No encontramos registros con este correo y teléfono. Verifica e intenta de nuevo.');
        return;
      }

      const session = data[0];

      // Save secure session with access_token (no raw email/phone in subsequent calls)
      localStorage.setItem('saudade_patient_session', JSON.stringify({
        isLoggedIn: true,
        accessToken: session.access_token,
        email: session.patient_email,
        phone: session.patient_phone,
        name: session.patient_name,
        expiresAt: session.expires_at
      }));

      toast.success('¡Bienvenido al portal!');
      navigate('/portal');
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Error al iniciar sesión.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/30 via-background to-muted/20 p-4 font-sans relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md shadow-2xl border-border/80 rounded-3xl bg-card/90 backdrop-blur-xl relative z-10 overflow-hidden">
        <CardHeader className="text-center space-y-3 pt-8 pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-primary to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
            <span className="text-white font-black text-2xl tracking-tighter">S.</span>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">Portal del Paciente</CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Accede a tus citas, ejercicios terapéuticos y consentimientos informados de forma segura.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold text-foreground uppercase tracking-wider">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="h-11 rounded-xl bg-background border-border/70 focus-visible:ring-primary/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-bold text-foreground uppercase tracking-wider">Teléfono / WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10 dígitos o WhatsApp"
                className="h-11 rounded-xl bg-background border-border/70 focus-visible:ring-primary/20"
              />
            </div>

            <Button type="submit" className="w-full h-12 mt-6 font-bold text-sm rounded-xl shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-700 text-white transition-all" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Accediendo a tu portal...</>
              ) : (
                'Ingresar a mi Portal 🚀'
              )}
            </Button>

            <div className="pt-4 border-t border-border/40 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Conexión cifrada de extremo a extremo · NOM-024-SSA3</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
