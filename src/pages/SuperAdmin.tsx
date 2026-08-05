import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Users, Building2, Calendar, CreditCard, ExternalLink, ShieldCheck, Search, Activity } from 'lucide-react';
import Layout from '@/components/Layout';
import { Input } from '@/components/ui/input';

interface OrgMetric {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  created_at: string;
  stripe_customer_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  patient_count: number;
}

interface MetricsData {
  total_organizations: number;
  active_organizations: number;
  total_patients: number;
  total_appointments: number;
  organizations_list: OrgMetric[];
}

export default function SuperAdmin() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, [profile?.id]);

  const fetchMetrics = async () => {
    // Only proceed if profile loaded
    if (!profile) return;
    
    // Optimistic check: Ensure user is superadmin
    if (!profile.is_superadmin) {
      toast.error('Acceso denegado. Se requiere nivel de SuperAdministrador.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_saas_metrics');
      if (error) throw error;
      setMetrics(data);
    } catch (err: any) {
      toast.error('Error al cargar métricas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrgs = metrics?.organizations_list.filter(org => 
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    org.owner_email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (!profile?.is_superadmin) {
    return (
      <div className="flex min-h-screen bg-slate-50 items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl border shadow-sm max-w-md">
          <ShieldCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
          <p className="text-muted-foreground mb-6">
            No tienes los permisos necesarios para acceder al panel global de SuperAdmin.
          </p>
          <Button onClick={() => window.location.href = '/'}>Volver al Inicio</Button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Panel SuperAdmin</h1>
              </div>
              <p className="text-muted-foreground">
                Visibilidad global de inquilinos, suscripciones y métricas maestras del SaaS.
              </p>
            </div>
            
            <Button variant="outline" onClick={fetchMetrics} disabled={loading} className="gap-2">
              <Activity className="w-4 h-4" />
              Actualizar Datos
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center p-20">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
          ) : !metrics ? (
            <div className="p-10 text-center border rounded-xl bg-white">
              No se pudieron cargar las métricas.
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-indigo-100 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-500">Total Consultorios</p>
                        <p className="text-3xl font-bold text-slate-900">{metrics.total_organizations}</p>
                      </div>
                      <div className="p-2 bg-indigo-50 rounded-lg">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>
                    <p className="text-xs font-medium text-indigo-600 mt-4 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                      {metrics.active_organizations} activos/trial
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-500">Pacientes Globales</p>
                        <p className="text-3xl font-bold text-slate-900">{metrics.total_patients}</p>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <Users className="w-5 h-5 text-emerald-600" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Total de pacientes registrados
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-500">Citas Globales</p>
                        <p className="text-3xl font-bold text-slate-900">{metrics.total_appointments}</p>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-amber-600" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Histórico total de reservas
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-500">Control Financiero</p>
                        <p className="text-lg font-bold text-slate-900">Stripe Dashboard</p>
                      </div>
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <CreditCard className="w-5 h-5 text-slate-600" />
                      </div>
                    </div>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs mt-4 text-indigo-600"
                      onClick={() => window.open('https://dashboard.stripe.com/', '_blank')}
                    >
                      Abrir Stripe <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Tenants Table */}
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
                  <div>
                    <CardTitle>Inquilinos (Consultorios)</CardTitle>
                    <CardDescription>Directorio global de todas las cuentas registradas en el SaaS.</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Buscar por nombre o email..." 
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y">
                      <tr>
                        <th className="px-6 py-4 font-medium">Consultorio / Dueño</th>
                        <th className="px-6 py-4 font-medium">Suscripción</th>
                        <th className="px-6 py-4 font-medium">Pacientes</th>
                        <th className="px-6 py-4 font-medium">Registro</th>
                        <th className="px-6 py-4 font-medium text-right">Stripe ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrgs.map((org) => (
                        <tr key={org.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{org.name}</div>
                            <div className="text-xs text-slate-500">{org.owner_name} • {org.owner_email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              org.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                              org.subscription_status === 'trialing' ? 'bg-indigo-100 text-indigo-700' :
                              org.subscription_status === 'past_due' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {org.subscription_status || 'Sin plan'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium">{org.patient_count}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-600" title={format(new Date(org.created_at), 'PPPp', { locale: es })}>
                              {formatDistanceToNow(new Date(org.created_at), { addSuffix: true, locale: es })}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {org.stripe_customer_id ? (
                              <code className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600">
                                {org.stripe_customer_id}
                              </code>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredOrgs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                            No se encontraron consultorios que coincidan con la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
      </div>
    </Layout>
  );
}
