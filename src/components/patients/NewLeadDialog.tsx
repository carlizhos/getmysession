import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useOrganization } from '@/hooks/useOrganization';
import { SOURCE_CONFIG, LeadSource } from './LeadSourceBadge';

interface NewLeadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLeadAdded?: () => void;
}

const NewLeadDialog = ({ open, onOpenChange, onLeadAdded }: NewLeadDialogProps) => {
    const { organization } = useOrganization();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', source: 'directo' as LeadSource, notes: '',
    });

    const reset = () => setFormData({ name: '', email: '', phone: '', source: 'directo', notes: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) { toast.error('El nombre es requerido'); return; }
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from('leads').insert([{
                name: formData.name.trim(),
                email: formData.email || null,
                phone: formData.phone || null,
                source: formData.source,
                status: 'nuevo_lead',
                position: 0,
                notes: formData.notes || null,
                user_id: user?.id ?? null,
                organization_id: organization?.id,
            }]);
            if (error) throw error;
            toast.success(`Lead "${formData.name}" agregado`);
            reset();
            onOpenChange(false);
            onLeadAdded?.();
        } catch (err: any) {
            toast.error('Error al guardar: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Nuevo Lead</DialogTitle>
                    <DialogDescription>Agrega un nuevo prospecto al pipeline de captación</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="lead-name">Nombre *</Label>
                        <Input id="lead-name" placeholder="Ej: María García" value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })} disabled={isSubmitting} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="lead-email">Email</Label>
                            <Input id="lead-email" type="email" placeholder="correo@email.com" value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={isSubmitting} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lead-phone">Teléfono</Label>
                            <Input id="lead-phone" type="tel" placeholder="+1 555 000 0000" value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })} disabled={isSubmitting} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lead-source">¿Cómo nos encontró? *</Label>
                        <Select value={formData.source} onValueChange={v => setFormData({ ...formData, source: v as LeadSource })}>
                            <SelectTrigger id="lead-source">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.entries(SOURCE_CONFIG) as [LeadSource, typeof SOURCE_CONFIG[LeadSource]][]).map(([key, cfg]) => (
                                    <SelectItem key={key} value={key}>
                                        <span className="flex items-center gap-2">{cfg.icon} {cfg.label}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lead-notes">Notas iniciales</Label>
                        <Textarea id="lead-notes" placeholder="Información adicional sobre el prospecto..." rows={3}
                            value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} disabled={isSubmitting} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
                        <Button type="submit" variant="zen" disabled={isSubmitting}>
                            {isSubmitting ? 'Guardando...' : 'Agregar Lead'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default NewLeadDialog;
