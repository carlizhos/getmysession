import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  useServicesQuery, 
  useSaveServiceMutation, 
  useDeleteServiceMutation, 
  useProfileQuery 
} from '@/hooks/useSettingsData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  LayoutGrid, 
  Plus, 
  Loader2, 
  BookOpen, 
  ShieldCheck, 
  Clock, 
  DollarSign, 
  Percent, 
  AlertTriangle, 
  Share2, 
  Settings as SettingsIcon, 
  Trash2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Service } from '@/types';

export default function ServiceSettings() {
  const { user } = useAuth();
  const { organization } = useOrganization();

  const { data: profile } = useProfileQuery(user?.id);
  const { data: services = [], isLoading: isLoadingServices } = useServicesQuery(user?.id);

  const saveServiceMutation = useSaveServiceMutation();
  const deleteServiceMutation = useDeleteServiceMutation();

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceFilter, setServiceFilter] = useState<'all' | 'public' | 'private'>('all');

  const handleSaveService = async (serviceData: Service) => {
    if (!user || !organization) return;
    try {
      await saveServiceMutation.mutateAsync({
        userId: user.id,
        organizationId: organization.id,
        service: serviceData
      });
      toast.success(serviceData.id ? 'Servicio actualizado' : 'Servicio creado');
      setShowServiceModal(false);
      setEditingService(null);
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!user || !confirm('¿Estás seguro de eliminar este servicio?')) return;
    try {
      await deleteServiceMutation.mutateAsync({
        userId: user.id,
        id
      });
      toast.success('Servicio eliminado');
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card variant="flat" className="border border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <LayoutGrid className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Servicios de Agenda</CardTitle>
                <CardDescription>Configura los tipos de sesión, precios y duraciones</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-muted/20 p-1 rounded-xl border border-border/40">
                <button 
                  onClick={() => setServiceFilter('all')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                    serviceFilter === 'all' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setServiceFilter('public')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                    serviceFilter === 'public' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Públicos
                </button>
                <button 
                  onClick={() => setServiceFilter('private')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                    serviceFilter === 'private' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Privados
                </button>
              </div>
              <Button 
                variant="zen" 
                size="sm" 
                className="gap-1.5 font-bold" 
                onClick={() => { setEditingService(null); setShowServiceModal(true); }}
              >
                <Plus className="h-3.5 w-3.5" /> Nuevo Servicio
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingServices ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
              <p className="text-xs text-muted-foreground font-medium animate-pulse">Cargando servicios...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/40 rounded-2xl bg-muted/5">
              <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                <LayoutGrid className="h-8 w-8 text-primary/20" />
              </div>
              <h3 className="text-base font-bold text-foreground">No tienes servicios configurados</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                Define tus tipos de terapia para que tus pacientes puedan agendar en línea.
              </p>
              <Button variant="outline" size="sm" className="mt-6 gap-2" onClick={() => setShowServiceModal(true)}>
                <Plus className="h-3.5 w-3.5" /> Crear mi primer servicio
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {services
                .filter(s => {
                  if (serviceFilter === 'public') return s.is_public;
                  if (serviceFilter === 'private') return !s.is_public;
                  return true;
                })
                .map((service) => (
                  <ServiceCard 
                    key={service.id} 
                    service={service} 
                    onEdit={() => { setEditingService(service); setShowServiceModal(true); }}
                    onDelete={() => handleDeleteService(service.id!)}
                    onShare={() => {
                      const url = `${window.location.origin}/reservar/${profile?.slug || ''}?service=${service.id}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Enlace del servicio copiado');
                    }}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ServiceModal 
        open={showServiceModal} 
        onOpenChange={setShowServiceModal} 
        service={editingService} 
        onSave={handleSaveService} 
        isSaving={saveServiceMutation.isLoading} 
      />
    </div>
  );
}

const ServiceCard = ({ service, onEdit, onDelete, onShare }: { 
  service: Service, 
  onEdit: () => void, 
  onDelete: () => void, 
  onShare: () => void 
}) => {
  const borderColor = {
    violet: 'border-t-violet-500',
    blue: 'border-t-blue-500',
    green: 'border-t-emerald-500',
    amber: 'border-t-amber-500',
    rose: 'border-t-rose-500',
    indigo: 'border-t-indigo-500',
  }[service.color || 'violet'] || 'border-t-primary';

  return (
    <div className={cn(
      "bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden border-t-4",
      borderColor,
      !service.active && "opacity-60 grayscale"
    )}>
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors">
          {service.name}
        </h4>
        <Badge variant={service.is_public ? "zen" : "outline"} className="text-[9px] uppercase tracking-tighter h-5">
          {service.is_public ? (
            <div className="flex items-center gap-1"><BookOpen className="h-2.5 w-2.5" /> Público</div>
          ) : (
            <div className="flex items-center gap-1"><ShieldCheck className="h-2.5 w-2.5" /> Privado</div>
          )}
        </Badge>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Duración: <strong className="text-foreground">{service.duration} min</strong></span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Precio: <strong className="text-primary text-sm">${service.price} MXN</strong></span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Percent className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Comisión: <strong className="text-foreground">{service.commission_percentage !== undefined && service.commission_percentage !== null ? `${service.commission_percentage}%` : 'Global'}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500/80" />
          <span className="text-xs font-medium">Límite cancelar: <strong className="text-foreground">{service.reschedule_policy_hours !== undefined && service.reschedule_policy_hours !== null ? `${service.reschedule_policy_hours}h` : 'Global'}</strong></span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px] mb-6 leading-relaxed">
        {service.description || 'Sin descripción.'}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-tight gap-1 px-2 hover:bg-primary/5 hover:text-primary" onClick={onShare}>
          <Share2 className="h-3 w-3" /> Compartir
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5" onClick={onEdit}>
            <SettingsIcon className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const ServiceModal = ({ open, onOpenChange, service, onSave, isSaving }: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void, 
  service: Service | null, 
  onSave: (data: Service) => void,
  isSaving: boolean
}) => {
  const [formData, setFormData] = useState<Service>({
    name: '',
    description: '',
    duration: 60,
    price: 800,
    is_public: true,
    color: 'violet',
    active: true,
    commission_percentage: null,
    reschedule_policy_hours: null
  });

  useEffect(() => {
    if (service) {
      setFormData({
        ...service,
        reschedule_policy_hours: service.reschedule_policy_hours !== undefined ? service.reschedule_policy_hours : null
      });
    } else {
      setFormData({
        name: '',
        description: '',
        duration: 60,
        price: 800,
        is_public: true,
        color: 'violet',
        active: true,
        commission_percentage: null,
        reschedule_policy_hours: null
      });
    }
  }, [service, open]);

  const colors = [
    { name: 'violet', class: 'bg-violet-500' },
    { name: 'blue', class: 'bg-blue-500' },
    { name: 'green', class: 'bg-emerald-500' },
    { name: 'amber', class: 'bg-amber-500' },
    { name: 'rose', class: 'bg-rose-500' },
    { name: 'indigo', class: 'bg-indigo-500' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-3xl">
        <div className={cn("h-2 w-full", {
          'bg-violet-500': formData.color === 'violet',
          'bg-blue-500': formData.color === 'blue',
          'bg-emerald-500': formData.color === 'green',
          'bg-amber-500': formData.color === 'amber',
          'bg-rose-500': formData.color === 'rose',
          'bg-indigo-500': formData.color === 'indigo',
        })} />
        
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {service ? 'Editar Servicio' : 'Nuevo Servicio de Agenda'}
          </DialogTitle>
          <DialogDescription>
            Configura los detalles de este tipo de sesión.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre del Servicio *</Label>
            <Input 
              placeholder="Ej. Terapia Individual Adultos" 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="rounded-xl h-11 border-border/60 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Duración (min) *</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  value={formData.duration}
                  onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                  className="rounded-xl h-11 border-border/60 pl-10"
                />
                <Clock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Precio (MXN) *</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="rounded-xl h-11 border-border/60 pl-10"
                />
                <DollarSign className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comisión del Consultorio (%) (Opcional)</Label>
            <div className="relative">
              <Input 
                type="number" 
                placeholder="Porcentaje personalizado para este servicio"
                value={formData.commission_percentage !== undefined && formData.commission_percentage !== null ? formData.commission_percentage : ''}
                onChange={e => {
                  const val = e.target.value;
                  setFormData({ 
                    ...formData, 
                    commission_percentage: val === '' ? null : parseFloat(val)
                  });
                }}
                className="rounded-xl h-11 border-border/60 pl-10 focus:ring-primary/20"
                min={0}
                max={100}
                step={0.1}
              />
              <Percent className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              Dejar vacío para usar la comisión global configurada en tu perfil del especialista.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Límite para Cancelar/Reagendar (Horas) (Opcional)</Label>
            <div className="relative">
              <Input 
                type="number" 
                placeholder="Horas personalizadas para este servicio"
                value={formData.reschedule_policy_hours !== undefined && formData.reschedule_policy_hours !== null ? formData.reschedule_policy_hours : ''}
                onChange={e => {
                  const val = e.target.value;
                  setFormData({ 
                    ...formData, 
                    reschedule_policy_hours: val === '' ? null : parseInt(val)
                  });
                }}
                className="rounded-xl h-11 border-border/60 pl-10 focus:ring-primary/20"
                min={0}
                step={1}
              />
              <Clock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              Dejar vacío para usar el límite global configurado en tu perfil del especialista (24h por defecto).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción (Opcional)</Label>
            <Textarea 
              placeholder="Breve descripción del servicio para tus pacientes..." 
              rows={3}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="rounded-xl resize-none border-border/60"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/40">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold">Visibilidad Pública</Label>
              <p className="text-[11px] text-muted-foreground">Mostrar este servicio en tu página de reservas.</p>
            </div>
            <Switch 
              checked={formData.is_public}
              onCheckedChange={v => setFormData({ ...formData, is_public: v })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Color distintivo</Label>
            <div className="flex gap-3">
              {colors.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c.name })}
                  className={cn(
                    "h-8 w-8 rounded-full transition-all border-2",
                    c.class,
                    formData.color === c.name ? "border-foreground scale-110 shadow-md" : "border-transparent opacity-70 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-6 bg-muted/20 gap-3 border-t border-border/50">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-6 font-bold">
            Cancelar
          </Button>
          <Button 
            variant="zen" 
            onClick={() => onSave(formData)} 
            disabled={isSaving || !formData.name}
            className="rounded-xl h-11 px-8 font-bold gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {service ? 'Actualizar Servicio' : 'Crear Servicio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
