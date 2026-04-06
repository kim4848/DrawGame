import { useEffect, useState } from 'react';
import { getGalleryDrawings } from '../api';
import type { GalleryDrawing } from '../types';

export default function DrawingCarousel() {
  const [drawings, setDrawings] = useState<GalleryDrawing[]>([]);

  useEffect(() => {
    getGalleryDrawings(10).then((data) => {
      if (data.length > 0) setDrawings(data);
    });
  }, []);

  if (drawings.length === 0) return null;

  // Duplicate the list for seamless infinite scroll
  const items = [...drawings, ...drawings];

  return (
    <div className="carousel-container w-full max-w-lg mb-6 mt-2">
      <div
        className="carousel-track flex gap-3"
        style={{ '--item-count': drawings.length } as React.CSSProperties}
      >
        {items.map((d, i) => (
          <div
            key={`${d.imageUrl}-${i}`}
            className="carousel-item flex-shrink-0 w-[120px]"
          >
            <div className="bg-white border-2 border-warm-border rounded-[var(--radius-clay-sm)] shadow-[3px_3px_0px_var(--color-card-shadow)] overflow-hidden opacity-75">
              <img
                src={d.imageUrl}
                alt=""
                className="w-full h-[90px] object-contain bg-white p-1"
                loading="lazy"
                draggable={false}
              />
              <p className="font-heading text-xs text-warm-mid text-center py-1 px-1 truncate">
                {d.word}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
