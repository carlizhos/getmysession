import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/reviews/StarRating';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, MessageCircleHeart, Flag, Reply, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Review } from '@/components/reviews/ReviewList';

export default function Reviews() {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [replyReview, setReplyReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [profile?.organization_id]);

  const fetchReviews = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id, rating, comment, reply_text, replied_at, created_at, status, is_anonymous,
          patients ( first_name, last_name )
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data as any[]);
    } catch (err: any) {
      toast.error('Error al cargar las reseñas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitReply = async () => {
    if (!replyReview || !replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          reply_text: replyText.trim(),
          replied_at: new Date().toISOString(),
        })
        .eq('id', replyReview.id);

      if (error) throw error;
      
      toast.success('Respuesta publicada con éxito.');
      setReplyReview(null);
      setReplyText('');
      fetchReviews();
    } catch (err: any) {
      toast.error('Error al responder: ' + err.message);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const reportReview = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas reportar esta reseña a administración? La reseña se ocultará temporalmente de tu perfil público.')) return;
    
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ status: 'reported' })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Reseña reportada exitosamente.');
      fetchReviews();
    } catch (err: any) {
      toast.error('Error al reportar: ' + err.message);
    }
  };

  const averageRating = reviews.length > 0 
      ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length 
      : 0;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-64">
        <Header />
        
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Mis Reseñas</h1>
              <p className="text-muted-foreground mt-1">
                Gestiona las opiniones de tus pacientes y fortalece tu presencia en línea.
              </p>
            </div>
            
            <Button variant="outline" onClick={() => window.open(`/perfil/${profile?.slug}`, '_blank')} className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Ver Perfil Público
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Calificación Promedio</p>
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">{averageRating.toFixed(1)}</span>
                  <StarRating rating={averageRating} size={24} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total de Reseñas</p>
                <span className="text-4xl font-bold text-slate-900 dark:text-white">{reviews.length}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Respuestas Pendientes</p>
                <span className="text-4xl font-bold text-amber-500">
                  {reviews.filter(r => r.comment && !r.reply_text).length}
                </span>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Reseñas</CardTitle>
              <CardDescription>Visualiza y responde a las reseñas que los pacientes verificados han dejado sobre sus consultas.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center p-12 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <MessageCircleHeart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Aún no tienes reseñas</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                    Las reseñas comenzarán a aparecer aquí a medida que envíes enlaces de opinión después de tus consultas.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-5 border rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-base">
                              {review.is_anonymous ? 'Paciente Verificado' : `${review.patients?.first_name} ${review.patients?.last_name || ''}`}
                            </h4>
                            {review.status === 'reported' && (
                              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-100 text-amber-700">En Revisión</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                        <StarRating rating={review.rating} size={20} />
                      </div>

                      {review.comment && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{review.comment}"</p>
                      )}

                      {review.reply_text ? (
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                            <Reply className="w-3.5 h-3.5" />
                            Tu respuesta
                            <span className="text-muted-foreground font-normal ml-auto">
                              {review.replied_at && formatDistanceToNow(new Date(review.replied_at), { addSuffix: true, locale: es })}
                            </span>
                          </div>
                          <p className="text-sm">{review.reply_text}</p>
                        </div>
                      ) : (
                        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {review.comment && review.status === 'published' && (
                            <Button variant="outline" size="sm" onClick={() => setReplyReview(review)} className="gap-2">
                              <Reply className="w-4 h-4" />
                              Responder
                            </Button>
                          )}
                          {review.status === 'published' && (
                            <Button variant="ghost" size="sm" onClick={() => reportReview(review.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto gap-2">
                              <Flag className="w-4 h-4" />
                              Reportar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Reply Modal */}
      <Dialog open={!!replyReview} onOpenChange={(open) => !open && setReplyReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder a Paciente</DialogTitle>
            <DialogDescription>
              Tu respuesta será pública en tu perfil. Utiliza un tono profesional y amable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm italic border text-slate-600">
              "{replyReview?.comment}"
            </div>
            <div className="space-y-2">
              <Textarea 
                placeholder="Escribe tu respuesta aquí..." 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyReview(null)}>Cancelar</Button>
            <Button onClick={submitReply} disabled={!replyText.trim() || isSubmittingReply}>
              {isSubmittingReply ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Publicar Respuesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
