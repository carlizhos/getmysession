import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Share2,
  Copy,
  Check,
  Gift,
  Users,
  Clock,
  Trophy,
  Loader2,
  ExternalLink,
  DollarSign,
  Shield,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useReferrals, ReferralProgramConfig } from '@/hooks/useReferrals';

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    color: 'bg-warning/10 text-warning border-warning/20',
    icon: Clock,
  },
  converted: {
    label: 'Convertido',
    color: 'bg-primary/10 text-primary border-primary/20',
    icon: Users,
  },
  rewarded: {
    label: 'Recompensado',
    color: 'bg-success/10 text-success border-success/20',
    icon: Trophy,
  },
  expired: {
    label: 'Expirado',
    color: 'bg-muted text-muted-foreground border-border',
    icon: Clock,
  },
};

export default function ReferralsSettings() {
  const {
    referralCode,
    totalCredit,
    referrals,
    totalReferred,
    totalRewarded,
    totalPending,
    config,
    saveConfig,
    isSavingConfig,
    isLoading,
    isAdmin,
  } = useReferrals();

  const [copied, setCopied] = useState(false);
  const [localConfig, setLocalConfig] = useState<ReferralProgramConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('¡Enlace de referido copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `¡Hola! Te invito a probar GetMySession, la plataforma que uso para gestionar mi consultorio de psicología. ` +
      `Regístrate con mi enlace y ambos recibiremos $${localConfig.reward_amount_referred} MXN de crédito: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleSaveConfig = () => {
    saveConfig(localConfig);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Section A: Invite Link ───────────────────────────────────────── */}
      <Card variant="flat" className="border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Recomendar GetMySession</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Invita a colegas y ambos ganan <span className="font-bold text-success">$99 MXN</span> de crédito al suscribirse
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-5">
          {/* Referral Code Display */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tu Código de Referido</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  readOnly
                  value={referralLink}
                  className="pr-20 font-mono text-sm bg-muted/30"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 gap-1.5 text-xs"
                  >
                    {copied ? (
                      <><Check className="h-3.5 w-3.5 text-success" /> Copiado</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copiar</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/60">
              Código: <span className="font-mono font-bold text-foreground/80">{referralCode}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="zen"
              className="flex-1 gap-2"
              onClick={handleCopy}
            >
              <Share2 className="h-4 w-4" />
              Copiar Enlace
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleShareWhatsApp}
            >
              <ExternalLink className="h-4 w-4" />
              Compartir por WhatsApp
            </Button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl bg-muted/40 p-3.5 text-center space-y-1">
              <p className="text-2xl font-black">{totalReferred}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Invitados</p>
            </div>
            <div className="rounded-xl bg-success/5 border border-success/10 p-3.5 text-center space-y-1">
              <p className="text-2xl font-black text-success">{totalRewarded}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Suscritos</p>
            </div>
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-3.5 text-center space-y-1">
              <p className="text-2xl font-black text-primary">${totalCredit.toLocaleString('es-MX')}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Crédito</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section C: Referral History ──────────────────────────────────── */}
      <Card variant="flat" className="border border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
              <Users className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Historial de Referidos</CardTitle>
              <CardDescription>
                {totalReferred === 0
                  ? 'Aún no has invitado a nadie'
                  : `${totalReferred} colega${totalReferred > 1 ? 's' : ''} invitado${totalReferred > 1 ? 's' : ''}`
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Sin referidos aún</p>
              <p className="text-sm mt-1 opacity-70">
                Comparte tu enlace y gana crédito cuando tus colegas se suscriban
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((ref) => {
                const statusInfo = STATUS_CONFIG[ref.status];
                const StatusIcon = statusInfo.icon;
                return (
                  <div
                    key={ref.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{ref.referred_name || 'Colega'}</p>
                        <p className="text-xs text-muted-foreground">
                          Invitado el {format(parseISO(ref.created_at), "d 'de' MMM, yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-0 sm:ml-auto">
                      {ref.status === 'rewarded' && (
                        <span className="text-sm font-bold text-success">
                          +${ref.reward_amount_referrer.toLocaleString('es-MX')} MXN
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Total Credit Footer */}
              {totalCredit > 0 && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-success/5 border border-success/15 mt-4">
                  <span className="text-sm font-medium text-success">Crédito Total Acumulado</span>
                  <span className="text-xl font-black text-success">
                    ${totalCredit.toLocaleString('es-MX')} MXN
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
