import { useState, useEffect } from 'react';
import type { CatalogItem } from '../data/mockData';
import { ItemCard } from './ItemCard';
import { Search, Box, Lock, Sparkles } from 'lucide-react';

interface Props {
  items: CatalogItem[];
  categories: { id: string, name: string, locked?: boolean }[];
  onReserveClick: (item: CatalogItem) => void;
  onProAlert: (item: CatalogItem) => void;
  clubId?: string;
  initialFilterId?: string;
  // #87: lo que le puede gustar a quien ha entrado (ids de artículos).
  recomendaciones?: string[];
}

export const Catalog: React.FC<Props> = ({ items, categories, onReserveClick, onProAlert, clubId, initialFilterId, recomendaciones = [] }) => {
  const [filterId, setFilterId] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  // #87: primero lo disponible (como siempre) o lo mejor valorado.
  const [orden, setOrden] = useState<'disponible' | 'valorados'>('disponible');
  const recomendados = recomendaciones.map(id => items.find(i => i.id === id)).filter(Boolean).slice(0, 4) as CatalogItem[];

  // Handle initial filtering from URL (Ticket #83)
  useEffect(() => {
    if (initialFilterId) {
      setFilterId(initialFilterId);
    }
  }, [initialFilterId]);

  const filteredItems = items.filter(item => {
    const matchesFilter = filterId === 'Todos' || item.categoryId === filterId;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    if (orden === 'valorados') return (b.media || 0) - (a.media || 0) || (b.valoraciones || 0) - (a.valoraciones || 0);
    const aAvailable = a.status === 'Disponible';
    const bAvailable = b.status === 'Disponible';
    if (aAvailable === bAvailable) return 0;
    return aAvailable ? -1 : 1;
  });

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '2rem', 
        marginBottom: '4rem', 
        background: 'var(--surface)', 
        padding: '1.5rem 2rem', 
        borderRadius: '20px',
        border: '1px solid var(--surface-border)',
        flexWrap: 'wrap',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '280px' }}>
          <Search 
            size={20} 
            style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
          />
          <input 
            type="text" 
            placeholder="Buscar por nombre, descripción o referencia..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.85rem 1rem 0.85rem 3rem', 
              borderRadius: '12px', 
              border: '1px solid var(--surface-border)', 
              background: 'rgba(0,0,0,0.2)', 
              color: 'var(--text)', 
              fontSize: '1rem', 
              outline: 'none',
              transition: 'all 0.2s'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select value={orden} onChange={e => setOrden(e.target.value as 'disponible' | 'valorados')} aria-label="Ordenar"
            style={{ padding: '0.6rem 0.9rem', borderRadius: '12px', border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.9rem' }}>
            <option value="disponible">Primero lo disponible</option>
            <option value="valorados">Lo mejor valorado</option>
          </select>
          <button
            className={`btn ${filterId === 'Todos' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem', borderRadius: '12px' }}
            onClick={() => setFilterId('Todos')}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`btn ${filterId === cat.id ? 'btn-primary' : 'btn-outline'}`}
              style={{
                padding: '0.6rem 1.25rem', fontSize: '0.9rem', borderRadius: '12px',
                opacity: cat.locked ? 0.55 : 1,
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
              onClick={() => setFilterId(cat.id)}
            >
              {cat.locked && <Lock size={13} />}
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {recomendados.length > 0 && filterId === 'Todos' && !searchQuery.trim() && (
        <div style={{ marginBottom: '3rem' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Sparkles size={22} color="#F5B301" /> Te puede gustar</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Por lo que has valorado y lo que gustó a quien tiene gustos parecidos. Cuanto más valores, mejor acierta.</p>
          <div className="responsive-catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2.5rem' }}>
            {recomendados.map(item => <ItemCard key={item.id} item={item} onSelect={onReserveClick} onProAlert={() => onProAlert(item)} clubId={clubId} />)}
          </div>
        </div>
      )}
      <div className="responsive-catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2.5rem' }}>
        {filteredItems.map(item => (
          <ItemCard key={item.id} item={item} onSelect={onReserveClick} onProAlert={() => onProAlert(item)} clubId={clubId} />
        ))}
        {filteredItems.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
            <Box size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ fontSize: '1.2rem' }}>No se encontraron artículos en esta categoría.</p>
          </div>
        )}
      </div>
    </div>
  );
};
