import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';
import { ClinicalNote, tagColors } from '@/lib/mockData';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface RecentNotesProps {
  notes: ClinicalNote[];
}

const RecentNotes = ({ notes }: RecentNotesProps) => {
  return (
    <Card variant="default" className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Últimas Notas</CardTitle>
        <Button variant="ghost" size="sm" className="gap-1">
          Ver todas <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No hay notas recientes</p>
          </div>
        ) : (
          notes.slice(0, 3).map((note, index) => (
            <div
              key={note.id}
              className="group rounded-xl border border-border/50 p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-soft"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium">{note.patientName}</h4>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(note.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
                <Badge variant="outline">{note.format}</Badge>
              </div>
              
              {note.aiSummary && (
                <div className="mt-3 rounded-lg bg-accent/50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
                    <span className="text-xs font-medium text-primary">Resumen IA</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{note.aiSummary}</p>
                </div>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-3 w-full justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Ver nota completa
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default RecentNotes;
