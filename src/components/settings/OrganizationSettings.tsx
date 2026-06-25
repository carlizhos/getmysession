import { useEffect, useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const COMMON_TIMEZONES = [
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Buenos_Aires",
  "America/Santiago",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
];

export default function OrganizationSettings() {
  const { organization, availableOrganizations, switch: switchOrg, refresh, isAdmin } = useOrganization();
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false);
  const [orgTimezone, setOrgTimezone] = useState('America/Mexico_City');

  useEffect(() => {
    if (organization?.settings?.timezone) {
      setOrgTimezone(organization.settings.timezone);
    }
  }, [organization]);

  const handleUpdateOrgTimezone = async (newTimezone: string) => {
    if (!organization?.id) return;
    setIsUpdatingOrg(true);
    try {
      const orgSettings = {
        ...(organization.settings || {}),
        timezone: newTimezone
      };
      const { error } = await supabase
        .from('organizations')
        .update({ settings: orgSettings })
        .eq('id', organization.id);

      if (error) throw error;
      setOrgTimezone(newTimezone);
      await refresh();
      toast.success('Zona horaria de la organización actualizada.');
    } catch (err: any) {
      console.error('Error updating org timezone:', err);
      toast.error('Error al actualizar zona horaria: ' + err.message);
    } finally {
      setIsUpdatingOrg(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card variant="flat" className="border border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Organización y Miembros</CardTitle>
              <CardDescription>Gestiona tu clínica o cambia de organización</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Switcher */}
          <div className="space-y-2">
            <Label>Organización Activa</Label>
            <div className="flex items-center gap-3">
              <Select
                value={organization?.id}
                onValueChange={(val) => switchOrg(val)}
              >
                <SelectTrigger className="max-w-[300px]">
                  <SelectValue placeholder="Selecciona una organización" />
                </SelectTrigger>
                <SelectContent>
                  {availableOrganizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} {org.id === organization?.id && "(Actual)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAdmin && <Badge variant="secondary">Administrador</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Al cambiar de organización, verás solo los pacientes y citas de esa clínica.
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Detalles de la Organización</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Nombre</span>
                <p className="text-sm border rounded-md p-2 bg-muted/20">{organization?.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tipo de Espacio</span>
                <div className="pt-1">
                  <Badge variant="outline" className={cn(
                    "px-3 py-1 capitalize",
                    organization?.type === 'personal' 
                      ? "bg-zen-lavender/10 text-zen-lavender border-zen-lavender/20" 
                      : "bg-blue-100 text-blue-700 border-blue-200"
                  )}>
                    {organization?.type === 'personal' ? 'Espacio Personal' : 'Equipo / Clínica'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tu Rol</span>
                <div className="pt-1">
                  <Badge variant="outline" className="capitalize px-3 py-1">{organization?.role}</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Miembros</span>
                <p className="text-sm font-semibold pt-1">{organization?.member_count || 1}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Configuración de la Clínica</h3>
            </div>
            <div className="max-w-md space-y-2">
              <Label className="text-xs">Zona Horaria</Label>
              <Select
                value={orgTimezone}
                onValueChange={handleUpdateOrgTimezone}
                disabled={isUpdatingOrg || !isAdmin}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una zona horaria" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Define la zona horaria en la que tus pacientes recibirán las confirmaciones y recordatorios de sus citas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
