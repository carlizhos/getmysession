import Layout from '@/components/Layout';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  FileText,
  User
} from 'lucide-react';
import { mockPatients, tagColors } from '@/lib/mockData';
import { format, parseISO, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const Patients = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  const filteredPatients = mockPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedPatientData = mockPatients.find(p => p.id === selectedPatient);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
            <p className="text-muted-foreground">
              Gestiona tu base de pacientes y expedientes clínicos
            </p>
          </div>
          <Button variant="zen" className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Paciente
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o etiqueta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Patient Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Patient List */}
          <div className="lg:col-span-2">
            <Card variant="flat">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {filteredPatients.map((patient, index) => (
                    <div
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient.id)}
                      className={cn(
                        "flex items-center gap-4 p-4 cursor-pointer transition-all duration-200",
                        selectedPatient === patient.id 
                          ? "bg-accent" 
                          : "hover:bg-accent/50",
                        "animate-fade-in"
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Avatar */}
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-lg font-semibold text-primary">
                          {patient.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{patient.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Última sesión: {format(parseISO(patient.lastSession), "d MMM", { locale: es })}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {patient.tags.slice(0, 3).map(tag => (
                            <Badge 
                              key={tag} 
                              variant={(tagColors[tag] || 'secondary') as any}
                              size="sm"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {patient.tags.length > 3 && (
                            <Badge variant="outline" size="sm">
                              +{patient.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Patient Detail */}
          <div className="lg:col-span-1">
            {selectedPatientData ? (
              <Card variant="default" className="sticky top-24 animate-scale-in">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-2xl font-bold text-primary">
                      {selectedPatientData.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </span>
                  </div>
                  <CardTitle>{selectedPatientData.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {differenceInYears(new Date(), parseISO(selectedPatientData.dateOfBirth))} años
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{selectedPatientData.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedPatientData.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Próxima: {selectedPatientData.nextSession 
                          ? format(parseISO(selectedPatientData.nextSession), "d MMM, HH:mm", { locale: es })
                          : 'No programada'}
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Etiquetas</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPatientData.tags.map(tag => (
                        <Badge 
                          key={tag} 
                          variant={(tagColors[tag] || 'secondary') as any}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Notas Internas</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      {selectedPatientData.notes}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button variant="outline" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Expediente
                    </Button>
                    <Button variant="zen" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      Agendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card variant="flat" className="sticky top-24">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">Selecciona un paciente</h3>
                  <p className="text-sm text-muted-foreground">
                    Haz clic en un paciente para ver sus detalles
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Patients;
