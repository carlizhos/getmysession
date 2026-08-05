import React from 'react';
import { StarRating } from './StarRating';
import { MessageCircleHeart, User, Reply } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reply_text: string | null;
  replied_at: string | null;
  created_at: string;
  is_anonymous: boolean;
  patients?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface ReviewListProps {
  reviews: Review[];
  therapistName: string;
}

export function ReviewList({ reviews, therapistName }: ReviewListProps) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mb-4">
          <MessageCircleHeart className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Aún no hay reseñas</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-md">
          {therapistName} aún no tiene reseñas públicas. Las reseñas se irán mostrando a medida que los pacientes compartan su experiencia.
        </p>
      </div>
    );
  }

  const formatReviewerName = (review: Review) => {
    if (review.is_anonymous || !review.patients) {
      return 'Paciente Verificado';
    }
    const { first_name, last_name } = review.patients;
    return `${first_name} ${last_name ? last_name.charAt(0) + '.' : ''}`.trim();
  };

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div 
          key={review.id} 
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  {formatReviewerName(review)}
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: es })}
                </div>
              </div>
            </div>
            <StarRating rating={review.rating} size={18} />
          </div>

          {review.comment && (
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">
              "{review.comment}"
            </p>
          )}

          {review.reply_text && (
            <div className="mt-5 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 ml-4 relative">
              <div className="absolute -left-2 top-4 w-4 h-4 bg-slate-50 dark:bg-slate-800/50 border-t border-l border-slate-100 dark:border-slate-700/50 transform -rotate-45" />
              <div className="flex items-center gap-2 mb-2">
                <Reply className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Respuesta de {therapistName}</span>
                {review.replied_at && (
                  <span className="text-xs text-slate-500">
                    • {formatDistanceToNow(new Date(review.replied_at), { addSuffix: true, locale: es })}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {review.reply_text}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
