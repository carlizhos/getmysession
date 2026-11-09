import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Smartphone,
  CreditCard,
  Building2,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { ColombiaPaymentConfig } from '@/types';

interface ColombiaPaymentConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  initialConfig?: ColombiaPaymentConfig;
  onSaved?: () => void;
}

export default function ColombiaPaymentConfigModal({
  open,
  onOpenChange,
  userId,
  initialConfig = {},
  onSaved,
}: ColombiaPaymentConfigModalProps) {
  const [config, setConfig] = useState<ColombiaPaymentConfig>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('direct');

  useEffect(() => {
    if (open) {
      setConfig(initialConfig || {});
    }
  }, [open, initialConfig]);

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          colombia_payment_config: config,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Configuración de cobro en Colombia guardada');
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error guardando configuración de pagos:', err);
      toast.error('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Métodos de Cobro en Colombia</DialogTitle>
              <DialogDescription className="text-xs">
                Configura tus cuentas directas (0% comisión) y pasarelas autorizadas (Wompi y Bold).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="direct" className="text-xs gap-1.5 font-semibold">
              <Smartphone className="h-3.5 w-3.5 text-purple-600" /> Cuentas Directas
            </TabsTrigger>
            <TabsTrigger value="wompi" className="text-xs gap-1.5 font-semibold">
              <CreditCard className="h-3.5 w-3.5 text-teal-600" /> Wompi (PSE)
            </TabsTrigger>
            <TabsTrigger value="bold" className="text-xs gap-1.5 font-semibold">
              <Building2 className="h-3.5 w-3.5 text-blue-600" /> Bold
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Cuentas Directas (Nequi, Daviplata, Bancolombia) */}
          <TabsContent value="direct" className="space-y-4 pt-3">
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold text-xs">
                <Info className="h-4 w-4" /> Transferencias Inmediatas sin Comisión
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tus pacientes podrán ver estos datos al agendar y tú podrás compartírselos por WhatsApp con 1 clic para que transfieran directamente a tu cuenta sin intermediarios.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nequi_phone" className="text-xs font-semibold flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                  <span className="h-2 w-2 rounded-full bg-purple-600" /> Celular Nequi
                </Label>
                <Input
                  id="nequi_phone"
                  placeholder="Ej: 300 123 4567"
                  value={config.nequi_phone || ''}
                  onChange={(e) => setConfig({ ...config, nequi_phone: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="daviplata_phone" className="text-xs font-semibold flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-600" /> Celular Daviplata
                </Label>
                <Input
                  id="daviplata_phone"
                  placeholder="Ej: 310 987 6543"
                  value={config.daviplata_phone || ''}
                  onChange={(e) => setConfig({ ...config, daviplata_phone: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="transfiya_phone" className="text-xs font-semibold text-muted-foreground">
                Llave Transfiya / Bre-B (Opcional)
              </Label>
              <Input
                id="transfiya_phone"
                placeholder="Número de celular registrado en Transfiya"
                value={config.transfiya_phone || ''}
                onChange={(e) => setConfig({ ...config, transfiya_phone: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            <div className="pt-2 border-t border-border/60">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                Cuenta Bancaria Principal (Bancolombia u otros)
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bank_name" className="text-xs font-medium">Banco</Label>
                  <Input
                    id="bank_name"
                    placeholder="Ej: Bancolombia, Davivienda, Nu..."
                    value={config.bank_name || ''}
                    onChange={(e) => setConfig({ ...config, bank_name: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bank_account_type" className="text-xs font-medium">Tipo de Cuenta</Label>
                  <select
                    id="bank_account_type"
                    value={config.bank_account_type || 'ahorros'}
                    onChange={(e) => setConfig({ ...config, bank_account_type: e.target.value })}
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="ahorros">Ahorros</option>
                    <option value="corriente">Corriente</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bank_account_number" className="text-xs font-medium">Número de Cuenta</Label>
                  <Input
                    id="bank_account_number"
                    placeholder="Ej: 123-456789-01"
                    value={config.bank_account_number || ''}
                    onChange={(e) => setConfig({ ...config, bank_account_number: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bank_account_holder" className="text-xs font-medium">Titular de la Cuenta</Label>
                  <Input
                    id="bank_account_holder"
                    placeholder="Nombre completo o Razón Social"
                    value={config.bank_account_holder || ''}
                    onChange={(e) => setConfig({ ...config, bank_account_holder: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Wompi (Bancolombia) */}
          <TabsContent value="wompi" className="space-y-4 pt-3">
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 font-semibold text-xs">
                <ShieldCheck className="h-4 w-4" /> Pasarela Wompi por Bancolombia
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Permite a tus pacientes pagar tus sesiones terapéuticas con <strong>PSE</strong> (débito desde cualquier banco colombiano), <strong>Nequi</strong>, <strong>Botón Bancolombia</strong> y tarjetas <strong>Visa/Mastercard</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="wompi_public_key" className="text-xs font-semibold">
                  Llave Pública de Comercio (Public Key)
                </Label>
                <Input
                  id="wompi_public_key"
                  placeholder="pub_prod_... o pub_test_..."
                  value={config.wompi_public_key || ''}
                  onChange={(e) => setConfig({ ...config, wompi_public_key: e.target.value.trim() })}
                  className="text-xs font-mono h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  Obtén tu llave pública en{' '}
                  <a
                    href="https://comercios.wompi.co"
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-600 underline font-medium inline-flex items-center gap-0.5"
                  >
                    comercios.wompi.co <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                  {' '}en la sección Desarrolladores &gt; Llaves de API.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wompi_integrity_key" className="text-xs font-semibold">
                  Secreto de Integridad (Opcional - para firma de transacciones)
                </Label>
                <Input
                  id="wompi_integrity_key"
                  type="password"
                  placeholder="prod_integrity_... o test_integrity_..."
                  value={config.wompi_integrity_key || ''}
                  onChange={(e) => setConfig({ ...config, wompi_integrity_key: e.target.value.trim() })}
                  className="text-xs font-mono h-9"
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: Bold */}
          <TabsContent value="bold" className="space-y-4 pt-3">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-xs">
                <CreditCard className="h-4 w-4" /> Pasarela y Datáfono Virtual Bold.co
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Si utilizas Bold para cobros con datáfono o link de pago, puedes ingresar tu enlace de cobro o API key para compartirlo fácilmente con tus pacientes.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bold_payment_link" className="text-xs font-semibold">
                  Link de Pago Personalizado Bold
                </Label>
                <Input
                  id="bold_payment_link"
                  placeholder="https://bold.co/@tu-consultorio"
                  value={config.bold_payment_link || ''}
                  onChange={(e) => setConfig({ ...config, bold_payment_link: e.target.value.trim() })}
                  className="text-xs h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  Tu link personalizado de Bold para que el paciente pague con PSE, Tarjeta o Nequi.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bold_api_key" className="text-xs font-semibold">
                  Llave de API Bold (Opcional)
                </Label>
                <Input
                  id="bold_api_key"
                  type="password"
                  placeholder="Ingresa tu API Key de Bold si integras webhook"
                  value={config.bold_api_key || ''}
                  onChange={(e) => setConfig({ ...config, bold_api_key: e.target.value.trim() })}
                  className="text-xs font-mono h-9"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="zen" size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5 font-bold">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Guardar Configuración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
