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
            onClick={() => setFilter(f as any)}
          >
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
        {filteredItems.map(item => (
          <ItemCard key={item.id} item={item} onSelect={onReserveClick} />
        ))}
      </div>
    </div>
  );
};
