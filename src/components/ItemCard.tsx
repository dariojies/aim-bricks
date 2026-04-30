import type { CatalogItem } from '../data/mockData';
import { Box, BookOpen, CheckCircle, Lock } from 'lucide-react';

interface Props {
  item: CatalogItem;
  onSelect: (item: CatalogItem) => void;
  onProAlert: (item: CatalogItem) => void;
  clubId?: string;
}

export const ItemCard: React.FC<Props> = ({ item, onSelect, onProAlert, clubId }) => {
  const isAvailable = item.status === 'Disponible';

  // Fallback config ONLY for Aim Education to ensure legacy buttons/fields show correctly
  // For other clubs, they start with a blank slate (no fields, default mode)
  const isAim = clubId === 'b68ca873-5086-474f-a296-fe60b149b8a2';
  const config = item.categoryConfig?.reservationMode ? item.categoryConfig : {
    reservationMode: isAim && (item.type === 'Biblioteca' || item.type === 'Libro') ? 'library' : 'brickslab',
    customFields: (isAim && item.type === 'Aim Brickslab')
      ? [{ name: 'legoReference', label: 'Referencia LEGO', type: 'text' }, { name: 'pieces', label: 'Piezas', type: 'number' }]
      : (isAim && (item.type === 'Biblioteca' || item.type === 'Libro') 
          ? [{ name: 'author', label: 'Autor(es)', type: 'text' }, { name: 'isbn', label: 'ISBN', type: 'text' }]
          : [])
  };

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
            
            {/* Dynamic Metadata Fields */}
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {config?.customFields?.map((field: any, idx: number) => {
                const value = item.metadata?.[field.name];
                if (!value) return null;
                return (
                  <span key={field.name}>
                    {idx > 0 && (config.customFields || []).some((f: any, i: number) => i < idx && item.metadata?.[f.name]) && ' • '}
                    {field.label}: {field.type === 'checkbox' ? (value ? 'Sí' : 'No') : value}
                  </span>
                );
              })}
            </div>

            {/* Legacy Support: Always show Author/ISBN if they exist in metadata but not in customFields */}
            {(!config?.customFields?.some(f => f.name === 'author') && item.metadata?.author) && (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Autor: {item.metadata.author}
              </div>
            )}
            {(!config?.customFields?.some(f => f.name === 'isbn') && item.metadata?.isbn) && (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                ISBN: {item.metadata.isbn}
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
        ) : config?.reservationMode === 'library' ? (
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
