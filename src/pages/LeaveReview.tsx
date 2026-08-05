import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

export default function LeaveReview() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Enlace inválido. No se encontró el token de seguridad.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) return;
    if (rating === 0) {
      toast.error('Por favor selecciona una calificación de 1 a 5 estrellas.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('submit_review', {
        p_token: token,
        p_rating: rating,
        p_comment: comment,
        p_anonymous: isAnonymous,
      });

      if (rpcError) {
        throw rpcError;
      }

      setIsSuccess(true);
      toast.success('¡Gracias por tu reseña!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al enviar tu reseña. Es posible que el enlace haya expirado o ya se haya utilizado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <Star className="w-8 h-8 fill-current" />
            </div>
            <CardTitle className="text-2xl font-bold">¡Reseña Enviada!</CardTitle>
            <CardDescription className="text-base mt-2">
              Muchas gracias por tomarte el tiempo para compartir tu experiencia. Esto ayuda enormemente al terapeuta.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-500 dark:text-slate-400">Ya puedes cerrar esta ventana.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Califica tu sesión
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Tu opinión es muy valiosa para nosotros y ayuda a otras personas a encontrar al terapeuta ideal.
          </p>
        </div>

        <Card className="shadow-lg border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-200 dark:border-red-800/50">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Star Rating */}
              <div className="flex flex-col items-center gap-2">
                <Label className="text-base font-medium">¿Cómo calificarías tu experiencia?</Label>
                <div className="flex gap-2" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled={isSubmitting || !token}
                      className={`p-2 transition-all duration-200 transform hover:scale-110 focus:outline-none ${
                        (hoverRating || rating) >= star
                          ? 'text-yellow-400'
                          : 'text-slate-200 dark:text-slate-700'
                      }`}
                      onMouseEnter={() => setHoverRating(star)}
                      onClick={() => setRating(star)}
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${(hoverRating || rating) >= star ? 'fill-current' : ''}`}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <span className="text-sm font-medium text-slate-500">
                    {rating === 1 && 'Pobre'}
                    {rating === 2 && 'Regular'}
                    {rating === 3 && 'Buena'}
                    {rating === 4 && 'Muy Buena'}
                    {rating === 5 && 'Excelente'}
                  </span>
                )}
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label htmlFor="comment" className="text-base font-medium">Cuéntanos más (Opcional)</Label>
                <Textarea
                  id="comment"
                  placeholder="¿Qué te gustó de la sesión? ¿Cómo te hizo sentir el terapeuta?"
                  className="min-h-[120px] resize-none"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={isSubmitting || !token}
                />
              </div>

              {/* Anonymity Option (Option C) */}
              <div className="flex items-start space-x-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                  disabled={isSubmitting || !token}
                  className="mt-1"
                />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="anonymous" className="font-medium cursor-pointer">
                    Mantener mi reseña anónima
                  </Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Si marcas esta casilla, tu reseña aparecerá como "Paciente Verificado". De lo contrario, mostraremos tu primer nombre.
                  </p>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-medium" 
                disabled={isSubmitting || !token || rating === 0}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Reseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
