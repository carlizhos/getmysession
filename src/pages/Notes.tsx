import Layout from '@/components/Layout';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus, 
  Filter, 
  FileText,
  Calendar,
  User,
  Brain,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import { mockClinicalNotes, mockPatients } from '@/lib/mockData';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const Notes = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);

  const filteredNotes = mockClinicalNotes.filter(note =>
    note.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.format.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedNoteData = mockClinicalNotes.find(n => n.id === selectedNote);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notas Clínicas</h1>
            <p className="text-muted-foreground">
              Historial de notas y reportes de sesiones
            </p>
          </div>
          <Button variant="zen" className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Nota
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por paciente, contenido o formato..."
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

        {/* Notes Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Notes List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredNotes.length === 0 ? (
              <Card variant="flat">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">No se encontraron notas</h3>
                  <p className="text-sm text-muted-foreground">
                    Intenta con otros términos de búsqueda
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredNotes.map((note, index) => (
                <Card 
                  key={note.id}
                  variant={selectedNote === note.id ? "zen" : "interactive"}
                  onClick={() => setSelectedNote(note.id)}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-sm font-semibold text-primary">
                            {note.patientName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium">{note.patientName}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(note.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">{note.format}</Badge>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {note.content}
                    </p>

                    {note.aiSummary && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/50">
                        <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-primary mb-1">Resumen IA</p>
                          <p className="text-sm text-muted-foreground">{note.aiSummary}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Note Detail */}
          <div className="lg:col-span-1">
            {selectedNoteData ? (
              <Card variant="default" className="sticky top-24 animate-scale-in">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="zen">{selectedNoteData.format}</Badge>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-lg mt-2">{selectedNoteData.patientName}</CardTitle>
                  <CardDescription>
                    {format(parseISO(selectedNoteData.createdAt), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Contenido</h4>
                    <div className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                      {selectedNoteData.content}
                    </div>
                  </div>

                  {selectedNoteData.aiSummary && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-medium">Resumen IA</h4>
                      </div>
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 text-sm">
                        {selectedNoteData.aiSummary}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button variant="outline" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Ver Completa
                    </Button>
                    <Button variant="zen" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card variant="flat" className="sticky top-24">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">Selecciona una nota</h3>
                  <p className="text-sm text-muted-foreground">
                    Haz clic en una nota para ver sus detalles
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

export default Notes;
