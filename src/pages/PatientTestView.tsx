import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { psychometricTests, evaluateTestScore } from '@/lib/psychometricTests';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, ShieldCheck, ArrowRight, HeartPulse } from 'lucide-react';
import { toast } from 'sonner';

export default function PatientTestView() {
  const { token } = useParams<{ token: string }>();
  
  const [testAssignment, setTestAssignment] = useState<any>(null);
  const [testDef, setTestDef] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const fetchTestAssignment = async () => {
      try {
        if (!token) throw new Error('Token no válido');

        const { data, error } = await supabase
          .from('patient_tests')
          .select('*')
          .eq('token', token)
          .single();

        if (error) {
          if (error.code === 'PGRST116') throw new Error('No se encontró la prueba o el enlace ha caducado.');
          throw error;
        }

        setTestAssignment(data);
        
        if (data.status === 'completed') {
          setIsSubmitted(true);
        } else {
          const def = psychometricTests[data.test_type];
          if (!def) throw new Error('Definición de prueba no encontrada.');
          setTestDef(def);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestAssignment();
  }, [token]);

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    // Validate all questions answered
    const unanswered = testDef.questions.filter((q: any) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      toast.error('Por favor responde todas las preguntas antes de enviar.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate score
      let score = 0;
      Object.values(answers).forEach((val) => { score += val; });

      const evaluated = evaluateTestScore(testDef.id, score);
      const interpretation = evaluated ? evaluated.interpretation : 'Puntaje no interpretado';

      const { error } = await supabase
        .from('patient_tests')
        .update({
          status: 'completed',
          answers: answers,
          score: score,
          interpretation: interpretation,
          completed_at: new Date().toISOString()
        })
        .eq('token', token);

      if (error) throw error;

      setIsSubmitted(true);
      toast.success('Respuestas enviadas correctamente');
    } catch (err: any) {
      toast.error('Error al enviar la prueba: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Enlace no válido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            Verifica el enlace o contacta a tu profesional de la salud para que te genere uno nuevo.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">¡Prueba Completada!</CardTitle>
            <CardDescription className="text-base mt-2">
              Tus respuestas han sido enviadas exitosamente a tu profesional de la salud de forma segura y confidencial.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mt-4">
              Ya puedes cerrar esta ventana.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header branding */}
        <div className="flex items-center justify-center gap-2 mb-8 mt-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <HeartPulse className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Saudade</span>
        </div>

        <Card>
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-xl sm:text-2xl">{testDef.name}</CardTitle>
            <CardDescription className="text-base mt-2 text-slate-700">
              {testDef.instructions}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {testDef.questions.map((question: any, index: number) => (
                <div key={question.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors">
                  <p className="font-medium text-slate-900 mb-4 whitespace-nowrap overflow-hidden text-ellipsis sm:whitespace-normal">
                    <span className="text-muted-foreground mr-2">{index + 1}.</span>
                    {question.text}
                  </p>
                  <RadioGroup 
                    onValueChange={(val) => handleAnswer(question.id, parseInt(val))}
                    className="flex flex-col space-y-3"
                  >
                    {testDef.options.map((opt: any) => (
                      <div key={opt.value} className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200">
                        <RadioGroupItem value={opt.value.toString()} id={`${question.id}-${opt.value}`} />
                        <Label htmlFor={`${question.id}-${opt.value}`} className="flex-1 cursor-pointer font-normal text-slate-700">
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 p-6">
            <Button 
              className="w-full sm:w-auto ml-auto gap-2" 
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || Object.keys(answers).length < testDef.questions.length}
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                <>Enviar Respuestas <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Tus respuestas están protegidas y solo pueden ser consultadas por tu psicólogo/a asignado/a.
        </p>
      </div>
    </div>
  );
}
