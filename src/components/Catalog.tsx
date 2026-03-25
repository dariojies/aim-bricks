import { useState } from 'react';
import type { CatalogItem } from '../data/mockData';
import { ItemCard } from './ItemCard';

interface Props {
  items: CatalogItem[];
  onReserveClick: (item: CatalogItem) => void;
}

export const Catalog: React.FC<Props> = ({ items, onReserveClick }) => {
  const [filter, setFilter] = useState<'Todos' | 'Aim Brickslab' | 'Libro'>('Todos');

  const filteredItems = items.filter(item => {
    if (filter === 'Todos') return true;
    return item.type === filter;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
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

      <div className="responsive-catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
        {filteredItems.map(item => (
          <ItemCard key={item.id} item={item} onSelect={onReserveClick} />
        ))}
      </div>
    </div>
  );
};
