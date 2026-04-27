import { useState } from 'react';
import type { CatalogItem } from '../data/mockData';
import { ItemCard } from './ItemCard';

interface Props {
  items: CatalogItem[];
  onReserveClick: (item: CatalogItem) => void;
  sidebar?: React.ReactNode;
}

export const Catalog: React.FC<Props> = ({ items, onReserveClick, sidebar }) => {
  const [filter, setFilter] = useState<'Todos' | 'Aim Brickslab' | 'Libro'>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'Todos' || item.type === filter;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    if (a.isAvailable === b.isAvailable) return 0;
    return a.isAvailable ? -1 : 1;
  });

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
        <input 
          type="text" 
          placeholder="🔍 Buscar un set de LEGO o un libro..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '1rem', 
            borderRadius: '12px', 
            border: '1px solid var(--surface-border)', 
            background: 'var(--surface)', 
            color: 'var(--text)', 
            fontSize: '1rem', 
            outline: 'none',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
          }}
        />
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {['Todos', 'Aim Brickslab', 'Libro'].map(f => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              onClick={() => setFilter(f as any)}
            >
              {f === 'Libro' ? 'Biblioteca' : f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: sidebar ? '1fr 350px' : '1fr', gap: '2rem', alignItems: 'start' }} className="responsive-dashboard-grid">
        <div className="responsive-catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem', alignContent: 'start' }}>
          {filteredItems.map(item => (
            <ItemCard key={item.id} item={item} onSelect={onReserveClick} />
          ))}
          {filteredItems.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No se encontraron artículos que coincidan con tu búsqueda.
            </div>
          )}
        </div>
        
        {sidebar && (
          <div className="catalog-sidebar">
            {sidebar}
          </div>
        )}
      </div>
    </div>
  );
};
