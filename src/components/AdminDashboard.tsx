import React, { useState, useEffect } from 'react';
import { Trash2, CheckCircle, Plus, Pencil } from 'lucide-react';
import type { CatalogItem } from '../data/mockData';

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

interface AdminReservation {
  id: string;
  userName: string;
  userEmail: string;
  itemTitle: string;
  itemType: string;
  reservationDate: string;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reservations' | 'catalog' | 'users'>('reservations');
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Add item form state
  const [newItemType, setNewItemType] = useState('Aim Brickslab');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemImage, setNewItemImage] = useState('');
  const [newItemStock, setNewItemStock] = useState('1');

  // New specific fields
  const [isLego, setIsLego] = useState(false);
  const [legoReferenceInput, setLegoReferenceInput] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filterBrickslab, setFilterBrickslab] = useState(false);
  const [filterLibrary, setFilterLibrary] = useState(false);
  const [filterAnyRank, setFilterAnyRank] = useState(false);

  // Edit form state
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStock, setEditStock] = useState('1');
  
  useEffect(() => {
    fetchReservations();
    fetchCatalog();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/permissions`);
      if (res.ok) setUsers(await res.json());
    } catch(e) { console.error(e); }
  };

  const handleRankToggle = async (userId: string, currentPerms: any, field: 'brickslab' | 'library') => {
    // Optimistic UI update or block during request? We can just do request then fetch
    const newPerms = { 
      brickslab: currentPerms?.brickslab || false, 
      library: currentPerms?.library || false,
      [field]: !currentPerms?.[field] 
    };
    try {
      const res = await fetch(`${API_URL}/api/admin/users/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, brickslab: newPerms.brickslab, library: newPerms.library })
      });
      if (res.ok) fetchUsers();
    } catch(e) { console.error(e); }
  };

  const fetchReservations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/reservations`);
      if (res.ok) setReservations(await res.json());
    } catch(e) { console.error(e); }
  };

  const fetchCatalog = async () => {
    try {
      const res = await fetch(`${API_URL}/api/catalog`);
      if (res.ok) setItems(await res.json());
    } catch(e) { console.error(e); }
  };

  const handleReturn = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: id })
      });
      if (res.ok) {
        fetchReservations();
        fetchCatalog();
      }
    } catch(e) { console.error(e) }
  };

  const handleDeleteItem = async (id: string, type: string) => {
    if (!confirm('¿Seguro que quieres borrar este artículo permanentemente?')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/items/${id}?type=${encodeURIComponent(type)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchCatalog();
        fetchReservations();
      }
    } catch(e) { console.error(e); }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/admin/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newItemType,
          title: newItemTitle,
          description: newItemDesc,
          imageUrl: newItemImage,
          stock: newItemStock,
          isLego,
          legoReferenceInput,
          author,
          isbn
        })
      });
      if (res.ok) {
        setNewItemTitle('');
        setNewItemDesc('');
        setNewItemImage('');
        setNewItemStock('1');
        setIsLego(false);
        setLegoReferenceInput('');
        setAuthor('');
        setIsbn('');
        alert('Elemento añadido correctamente');
        fetchCatalog();
      }
    } catch(e) { console.error(e); }
  };

  const handleEditClick = (item: CatalogItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDesc(item.description);
    setEditStock(item.stock?.toString() || '1');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editingItem.type,
          title: editTitle,
          description: editDesc,
          stock: editStock
        })
      });
      if (res.ok) {
        setEditingItem(null);
        fetchCatalog();
      }
    } catch(e) { console.error(e); }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>
        Panel de Administración
      </h2>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          className={`btn ${activeTab === 'reservations' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('reservations')}
        >
          Reservas Activas
        </button>
        <button 
          className={`btn ${activeTab === 'catalog' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('catalog')}
        >
          Gestión de Catálogo
        </button>
        <button 
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('users')}
        >
          Gestión de Rangos
        </button>
      </div>

      {activeTab === 'reservations' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Reservas en curso</h3>
          {reservations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No hay reservas activas en este momento.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Usuario</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Artículo</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Tipo</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Fecha</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ fontWeight: 500 }}>{r.userName}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{r.userEmail}</div>
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>{r.itemTitle}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          background: r.itemType === 'Libro' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: r.itemType === 'Libro' ? '#60A5FA' : '#F87171'
                        }}>
                          {r.itemType}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>{new Date(r.reservationDate).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                          onClick={() => handleReturn(r.id)}
                        >
                          <CheckCircle size={16} /> Entregado
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Gestión de Rangos</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                className={`btn ${filterBrickslab ? 'btn-primary' : 'btn-outline'}`} 
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                onClick={() => setFilterBrickslab(!filterBrickslab)}
              >
                Tienen Brickslab
              </button>
              <button 
                className={`btn ${filterLibrary ? 'btn-primary' : 'btn-outline'}`} 
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                onClick={() => setFilterLibrary(!filterLibrary)}
              >
                Tienen Biblioteca
              </button>
              <button 
                className={`btn ${filterAnyRank ? 'btn-primary' : 'btn-outline'}`} 
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                onClick={() => setFilterAnyRank(!filterAnyRank)}
              >
                Abonados
              </button>
              <input 
                type="text" 
                placeholder="Buscar por nombre o correo..." 
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', minWidth: '250px' }}
              />
            </div>
          </div>
          <div className="table-responsive-wrapper">
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Usuario</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Email</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Rango Brickslab</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Rango Biblioteca</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => {
                  const matchSearch = u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(userSearchTerm.toLowerCase());
                  const matchBrickslab = filterBrickslab ? u.permissions?.brickslab : true;
                  const matchLibrary = filterLibrary ? u.permissions?.library : true;
                  const matchAnyRank = filterAnyRank ? (u.permissions?.brickslab || u.permissions?.library) : true;
                  return matchSearch && matchBrickslab && matchLibrary && matchAnyRank;
                }).map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{u.name}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={u.permissions?.brickslab || false} 
                        onChange={() => handleRankToggle(u.id, u.permissions, 'brickslab')}
                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={u.permissions?.library || false} 
                        onChange={() => handleRankToggle(u.id, u.permissions, 'library')}
                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
              <Plus className="text-accent" /> Añadir Nuevo Elemento
            </h3>
            <form onSubmit={handleAddItem} className="responsive-dashboard-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Tipo de elemento</label>
                <select 
                  value={newItemType} 
                  onChange={e => setNewItemType(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', appearance: 'none', WebkitAppearance: 'none', fontSize: '1rem', minHeight: '48px' }}
                >
                  <option value="Aim Brickslab">Aim Brickslab</option>
                  <option value="Libro">Libro</option>
                </select>
              </div>

              {newItemType === 'Aim Brickslab' && (
                <>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" id="isLego" checked={isLego} onChange={e => setIsLego(e.target.checked)} />
                    <label htmlFor="isLego" style={{ color: 'var(--text)' }}>Es un set de LEGO®</label>
                  </div>
                  {isLego && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Número de referencia LEGO (Ej: Harry Potter 71043)</label>
                      <input value={legoReferenceInput} onChange={e => setLegoReferenceInput(e.target.value)} type="text" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
                    </div>
                  )}
                </>
              )}

              {newItemType === 'Libro' && (
                <>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Autor(es)</label>
                    <input value={author} onChange={e => setAuthor(e.target.value)} type="text" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>ISBN</label>
                    <input value={isbn} onChange={e => setIsbn(e.target.value)} type="text" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
                  </div>
                </>
              )}

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Título</label>
                <input required value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} type="text" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Stock Inicial (Número de copias físicas)</label>
                <input required value={newItemStock} onChange={e => setNewItemStock(e.target.value)} type="number" min="1" step="1" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Descripción</label>
                <textarea required value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', minHeight: '100px' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>URL de la Imagen (opcional)</label>
                <input value={newItemImage} onChange={e => setNewItemImage(e.target.value)} type="text" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Dar de alta en el inventario</button>
              </div>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Inventario Actual
              <span style={{ fontSize: '0.875rem', background: 'var(--surface-border)', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>
                {items.length} artículos
              </span>
            </h3>
            <div className="responsive-catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {items.map(item => (
                <div key={item.id} style={{ padding: '1rem', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <img src={item.imageUrl} alt={item.title} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{item.title}</h4>
                      {item.type === 'Aim Brickslab' && item.legoReference && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Ref: {item.legoReference}</div>
                      )}
                      {item.type === 'Libro' && (item.author || item.isbn) && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {item.author && item.author !== 'Desconocido' && <span>{item.author}</span>}
                          {item.author && item.author !== 'Desconocido' && item.isbn && <span>•</span>}
                          {item.isbn && <span>ISBN: {item.isbn}</span>}
                        </div>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.type} • Stock físico: {item.stock || 1} • {item.isAvailable ? 'Disponible' : 'Agotado'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                      onClick={() => handleEditClick(item)}
                    >
                      <Pencil size={16} /> Editar
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#F87171' }}
                      onClick={() => handleDeleteItem(item.id, item.type)}
                    >
                      <Trash2 size={16} /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', position: 'relative' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Editar {editingItem.type}</h3>
            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Título</label>
                <input required value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Stock Total</label>
                <input required type="number" min="1" step="1" value={editStock} onChange={e => setEditStock(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Descripción</label>
                <textarea required value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', minHeight: '100px' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditingItem(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
