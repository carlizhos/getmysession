import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
      // For this MVP, we query the `appointments` table
      // To see if an appointment exists where notes contains this email AND phone
      // OR we can query `leads` where email = input and phone = input.
      
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, name, email, phone')
        .eq('email', email)
        .eq('phone', phone)
        .limit(1);

      if (error) throw error;

      if (!leads || leads.length === 0) {
        toast.error('No encontramos registros con este correo y teléfono. Verifica e intenta de nuevo.');
        return;
      }

      const patientData = leads[0];

      // Save pseudo-session in localStorage
      localStorage.setItem('saudade_patient_session', JSON.stringify({
        isLoggedIn: true,
        email: patientData.email,
        phone: patientData.phone,
        name: patientData.name
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
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4 font-sans">
      <Card className="w-full max-w-md shadow-xl border-border/60">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
            <span className="text-primary font-bold text-xl tracking-tighter">S.</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Portal de Pacientes</CardTitle>
          <CardDescription>
            Ingresa los datos que usaste para reservar tu cita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono / WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+52 55 1234 5678"
              />
            </div>

            <Button type="submit" className="w-full mt-4" size="lg" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...</>
              ) : (
                'Ingresar a mi portal'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
