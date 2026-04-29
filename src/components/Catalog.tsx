import { useState } from 'react';
import type { CatalogItem } from '../data/mockData';
import { ItemCard } from './ItemCard';

interface Props {
  items: CatalogItem[];
  onReserveClick: (item: CatalogItem) => void;
  onProAlert: (item: CatalogItem) => void;
}

export const Catalog: React.FC<Props> = ({ items, onReserveClick, onProAlert }) => {
  const [filter, setFilter] = useState<'Todos' | 'Aim Brickslab' | 'Biblioteca'>('Todos');
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
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '2rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="🔍 Buscar..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ 
            width: '300px', 
            padding: '0.85rem', 
            borderRadius: '12px', 
            border: '1px solid var(--surface-border)', 
            background: 'var(--surface)', 
            color: 'var(--text)', 
            fontSize: '1rem', 
            outline: 'none',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
          }}
        />
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {['Todos', 'Aim Brickslab', 'Biblioteca'].map(f => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              onClick={() => setFilter(f as any)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="responsive-catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
        {filteredItems.map(item => (
          <ItemCard key={item.id} item={item} onSelect={onReserveClick} onProAlert={() => onProAlert(item)} />
        ))}
        {filteredItems.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No se encontraron artículos que coincidan con tu búsqueda.
          </div>
        )}
      </div>
    </div>
  );
};
