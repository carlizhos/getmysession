import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: number;
  showNumber?: boolean;
}

export function StarRating({ rating, max = 5, size = 16, showNumber = false }: StarRatingProps) {
  // Redondear la calificación al medio punto más cercano
  const roundedRating = Math.round(rating * 2) / 2;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex text-yellow-400">
        {[...Array(max)].map((_, i) => {
          const starValue = i + 1;
          const isHalf = roundedRating === starValue - 0.5;
          const isFull = roundedRating >= starValue;

          return (
            <div key={i} className="relative" style={{ width: size, height: size }}>
              {/* Estrella de fondo vacía */}
              <Star
                className="absolute top-0 left-0 text-slate-200 dark:text-slate-700"
                size={size}
                strokeWidth={2}
              />
              {/* Estrella llena (completa o mitad) */}
              {(isFull || isHalf) && (
                <div
                  className="absolute top-0 left-0 overflow-hidden"
                  style={{ width: isHalf ? '50%' : '100%' }}
                >
                  <Star
                    className="text-yellow-400 fill-current"
                    size={size}
                    strokeWidth={2}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showNumber && (
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
