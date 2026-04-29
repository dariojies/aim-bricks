import type { CatalogItem } from '../data/mockData';
import { Box, BookOpen, CheckCircle, Lock } from 'lucide-react';

interface Props {
  item: CatalogItem;
  onSelect: (item: CatalogItem) => void;
  onProAlert: (item: CatalogItem) => void;
}

export const ItemCard: React.FC<Props> = ({ item, onSelect, onProAlert }) => {
  const isAvailable = item.status === 'Disponible';

  return (
    <div className={`glass-panel`} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: isAvailable ? 1 : 0.8, transition: 'all 0.3s ease' }}>
      <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 600 }}>
              {item.type === 'Aim Brickslab' ? <Box size={16} /> : <BookOpen size={16} />}
              {item.type}
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0' }}>{item.title}</h3>
            {item.type === 'Aim Brickslab' && item.legoReference && (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Ref: {item.legoReference}
              </div>
            )}
            {item.type === 'Libro' && (item.author || item.isbn) && (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {item.author && item.author !== 'Desconocido' && <span>{item.author}</span>}
                {item.author && item.author !== 'Desconocido' && item.isbn && <span>•</span>}
                {item.isbn && <span>ISBN: {item.isbn}</span>}
              </div>
            )}
            {item.isProOnly && (
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#FBBF24', 
                fontSize: '0.75rem', fontWeight: 700, marginTop: '0.5rem',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                <Lock size={12} /> Exclusivo Pro
              </div>
            )}
          </div>
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
            background: isAvailable ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            color: isAvailable ? 'var(--secondary)' : 'var(--accent)',
            border: `1px solid ${isAvailable ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`
          }}>
            {isAvailable ? <CheckCircle size={14} /> : <Lock size={14} />}
            {item.status}
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.5rem', flex: 1 }}>
          {item.description}
        </p>
        {!isAvailable ? (
          <button className="btn btn-outline" style={{ width: '100%' }} disabled>
            Actualmente Reservado
          </button>
        ) : item.type === 'Libro' ? (
          <button 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            onClick={() => onSelect(item)}
          >
            Reservar para leer en casa/local
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={() => onSelect(item)}
            >
              Reservar para montar en el local
            </button>
            <button 
              className="btn" 
              style={{ 
                width: '100%',
                background: 'linear-gradient(135deg, #D4AF37, #FBBF24)',
                color: '#000',
                border: 'none',
                fontWeight: 700,
                boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onClick={(e) => {
                e.stopPropagation();
                onProAlert(item);
              }}
            >
              <Box size={16} /> Reservar para montar en casa
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
