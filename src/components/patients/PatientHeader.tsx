import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Phone, MessageCircle, Mail, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAvatarTheme, getInitials } from '@/lib/avatar-utils';

interface PatientHeaderProps {
  patient: any;
  onBack: () => void;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({ patient, onBack }) => {
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-5 rounded-2xl border border-border shadow-soft mb-6">
      <div className="flex items-center gap-4 w-full lg:w-auto">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 -ml-2 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
          onClick={onBack}
          title="Volver a lista de pacientes"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="relative group shrink-0">
          <div className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold border-2 border-primary/20 transition-all",
            getAvatarTheme(patient.name)
          )}>
            {getInitials(patient.name)}
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-foreground">{patient.name}</h1>
            <Badge className="bg-primary text-white hover:bg-primary-dark uppercase text-[9px] px-2 py-0.5 whitespace-nowrap shadow-sm">
              {patient.status === 'activo' ? 'Activo' : 
               patient.status === 'primer_contacto' ? 'Primer Contacto' : 
               patient.status === 'seguimiento' ? 'Seguimiento' : 
               patient.status === 'alta' ? 'Alta Clínica' : 
               patient.status?.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">ID: {patient.id.slice(0,8)}</p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
        {/* Contact Info Pills */}
        {patient.phone && (
          <div className="flex items-center gap-2 text-sm bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
            <Phone className="h-3.5 w-3.5 text-primary" />
            <span>{patient.phone}</span>
            <a
              href={`https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 p-1 rounded hover:bg-success/10 text-success transition-all"
              title="Enviar WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
        {patient.email && (
          <div className="flex items-center gap-2 text-sm bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
            <Mail className="h-3.5 w-3.5 text-primary" />
            <span className="truncate max-w-[150px]">{patient.email}</span>
          </div>
        )}
        {patient.last_session && (
          <div className="flex items-center gap-2 text-sm bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs">Última: {format(new Date(patient.last_session), 'd MMM', { locale: es })}</span>
          </div>
        )}
      </div>
    </div>
  );
};
