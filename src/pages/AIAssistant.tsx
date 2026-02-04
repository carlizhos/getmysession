import Layout from '@/components/Layout';
import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  Camera, 
  FileText, 
  Sparkles, 
  Loader2,
  CheckCircle2,
  Image,
  X,
  Copy,
  Download,
  Brain
} from 'lucide-react';
import { reportFormats } from '@/lib/mockData';
import { cn } from '@/lib/utils';

const AIAssistant = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [bulletPoints, setBulletPoints] = useState('');
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    setUploadedFile(file);
    simulateProcessing();
  };

  const simulateProcessing = () => {
    setIsProcessing(true);
    // Simulate OCR and AI processing
    setTimeout(() => {
      setIsProcessing(false);
      setDetectedFormat('SOAP');
      setBulletPoints(`• Paciente reporta mejora en síntomas de ansiedad
• Practica ejercicios de respiración 2x al día
• Sueño mejorado: 7 horas promedio
• Preocupación por situación laboral persiste
• Técnicas de mindfulness aplicadas con éxito`);
    }, 2000);
  };

  const generateReport = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const format = selectedFormat || detectedFormat || 'SOAP';
      
      if (format === 'SOAP') {
        setGeneratedReport(`## Nota Clínica - Formato SOAP

### Subjetivo (S)
Paciente refiere mejoría significativa en sus síntomas de ansiedad durante la última semana. Reporta haber practicado los ejercicios de respiración diafragmática dos veces al día con buenos resultados. El sueño ha mejorado, promediando 7 horas por noche. Sin embargo, expresa preocupación persistente relacionada con su situación laboral actual.

### Objetivo (O)
- Estado de ánimo: Eutímico con leve ansiedad situacional
- Apariencia: Aseado, contacto visual adecuado
- Adherencia al tratamiento: Buena
- Técnicas practicadas: Respiración diafragmática, mindfulness

### Análisis (A)
Evolución favorable en manejo de ansiedad. Las técnicas de regulación emocional están siendo efectivas. La preocupación laboral requiere abordaje específico en próximas sesiones.

### Plan (P)
1. Continuar ejercicios de respiración 2x día
2. Introducir técnica de resolución de problemas para situación laboral
3. Próxima sesión: 1 semana
4. Tarea: Registro de pensamientos automáticos relacionados con trabajo`);
      } else if (format === 'TCC') {
        setGeneratedReport(`## Nota Clínica - Formato TCC

### Pensamientos Automáticos
- "No voy a poder mantener mi trabajo"
- "Siempre me pasan cosas malas"
- Distorsión identificada: Catastrofización

### Emociones
- Ansiedad (6/10, bajó de 8/10 semana anterior)
- Preocupación moderada
- Esperanza incipiente por los avances

### Conductas
✓ Ejercicios de respiración 2x/día
✓ Práctica de mindfulness matutina
✗ Evitación de conversaciones sobre trabajo

### Intervención Realizada
- Reestructuración cognitiva del pensamiento "No voy a poder"
- Role-play de escenario laboral
- Refuerzo positivo por logros

### Tareas para Casa
1. Registro de pensamientos automáticos (formato ABC)
2. Continuar rutina de respiración
3. Una conversación breve sobre trabajo con persona de confianza`);
      }
    }, 1500);
  };

  const clearAll = () => {
    setUploadedFile(null);
    setBulletPoints('');
    setGeneratedReport(null);
    setDetectedFormat(null);
    setSelectedFormat('');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">IA Asistente</h1>
              <p className="text-muted-foreground">
                Digitaliza notas manuscritas y genera reportes estructurados
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Input Section */}
          <div className="space-y-6">
            {/* Upload Zone */}
            <Card variant="default">
              <CardHeader>
                <CardTitle className="text-lg">Subir Nota</CardTitle>
                <CardDescription>
                  Arrastra una imagen o toma una foto de tus notas manuscritas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "drop-zone flex flex-col items-center justify-center p-8 text-center min-h-[200px]",
                    isDragging && "drag-over"
                  )}
                >
                  {uploadedFile ? (
                    <div className="flex flex-col items-center animate-scale-in">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 mb-4">
                        <CheckCircle2 className="h-8 w-8 text-success" />
                      </div>
                      <p className="font-medium">{uploadedFile.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setUploadedFile(null)}
                      >
                        <X className="h-4 w-4 mr-1" /> Eliminar
                      </Button>
                    </div>
                  ) : isProcessing ? (
                    <div className="flex flex-col items-center animate-pulse-soft">
                      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                      <p className="font-medium">Procesando imagen...</p>
                      <p className="text-sm text-muted-foreground">Extrayendo texto con OCR</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="font-medium">Arrastra tu imagen aquí</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        o selecciona un archivo
                      </p>
                      <div className="flex gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Image className="h-4 w-4 mr-2" />
                          Seleccionar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // In a real app, this would open camera
                            alert('En una aplicación real, esto abriría la cámara');
                          }}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Cámara
                        </Button>
                      </div>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bullet Points Input */}
            <Card variant="default">
              <CardHeader>
                <CardTitle className="text-lg">Puntos de la Sesión</CardTitle>
                <CardDescription>
                  Ingresa los puntos clave de la sesión o edita el texto extraído
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="• Paciente reporta mejora en síntomas...&#10;• Técnicas aplicadas...&#10;• Próximos pasos..."
                  value={bulletPoints}
                  onChange={(e) => setBulletPoints(e.target.value)}
                  className="min-h-[150px] resize-none"
                />
                
                {detectedFormat && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 animate-fade-in">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm">
                      Formato detectado: <strong>{detectedFormat}</strong>
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Formato del Reporte</label>
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un formato o usa el detectado" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportFormats.map(format => (
                        <SelectItem key={format.value} value={format.value}>
                          <div className="flex flex-col">
                            <span>{format.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {format.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="zen" 
                  className="w-full gap-2"
                  onClick={generateReport}
                  disabled={!bulletPoints || isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generar Reporte
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right: Generated Report */}
          <div>
            <Card variant="zen" className="sticky top-24 min-h-[500px]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Reporte Generado</CardTitle>
                  <CardDescription>
                    Revisa y edita el reporte antes de guardarlo
                  </CardDescription>
                </div>
                {generatedReport && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon-sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {generatedReport ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none animate-fade-in">
                    <div className="rounded-xl bg-background/50 p-4 whitespace-pre-wrap font-mono text-sm">
                      {generatedReport}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" className="flex-1" onClick={clearAll}>
                        Limpiar
                      </Button>
                      <Button variant="zen" className="flex-1">
                        Guardar en Expediente
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">Sin reporte generado</h3>
                    <p className="text-sm text-muted-foreground max-w-[250px]">
                      Sube una imagen o escribe los puntos de la sesión para generar un reporte
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AIAssistant;
