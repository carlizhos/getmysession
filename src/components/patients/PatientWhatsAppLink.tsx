import React, { useState } from 'react';
import { Copy, Check, MessageCircle } from 'lucide-react';
import { Patient } from '@/types';

interface PatientWhatsAppLinkProps {
  patient: Patient;
  saudadeMetaNumber?: string;
}

export const PatientWhatsAppLink: React.FC<PatientWhatsAppLinkProps> = ({ 
  patient, 
  saudadeMetaNumber = import.meta.env.VITE_META_PHONE_NUMBER || '526642436756' 
}) => {
  const [copied, setCopied] = useState(false);

  // Fallback visual en caso de que el trigger aún no haya asignado el código
  const displayCode = patient.link_code || 'Pendiente...';
  
  // Construir el mensaje y la URL
  const message = `Hola, quiero habilitar mis notificaciones de Saudade. (Código: ${displayCode})`;
  const whatsappUrl = `https://wa.me/${saudadeMetaNumber}?text=${encodeURIComponent(message)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(whatsappUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-card border border-border/40 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] font-sans">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-xl ${patient.is_whatsapp_linked ? 'bg-success/10 text-success' : 'bg-muted/50 text-muted-foreground'}`}>
          <MessageCircle size={24} strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground tracking-tight">Notificaciones por WhatsApp</h3>
          <p className="text-sm text-muted-foreground">
            {patient.is_whatsapp_linked ? 'Vinculado exitosamente' : 'Pendiente de vinculación'}
          </p>
        </div>
      </div>

      {!patient.is_whatsapp_linked ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Envía este enlace de invitación a <span className="font-medium text-foreground">{patient.name}</span> para conectar su número a tu cuenta.
          </p>
          <button
            onClick={handleCopyLink}
            disabled={!patient.link_code}
            className="flex items-center justify-center w-full gap-2 px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all bg-primary rounded-xl hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {copied ? (
              <>
                <Check size={18} />
                <span>Enlace Copiado</span>
              </>
            ) : (
              <>
                <Copy size={18} />
                <span>{patient.link_code ? 'Copiar Enlace de Invitación' : 'Generando Código...'}</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-3 bg-success/10 rounded-xl border border-success/20">
          <p className="text-sm text-success font-medium">
            El paciente ya recibe notificaciones y recordatorios de Saudade.
          </p>
        </div>
      )}
    </div>
  );
};

export default PatientWhatsAppLink;
