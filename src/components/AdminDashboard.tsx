import React, { useState, useEffect } from 'react';
import { Trash2, CheckCircle, Plus, Pencil, Search } from 'lucide-react';
import type { CatalogItem } from '../data/mockData';

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

interface AdminReservation {
  id: string;
  userId: string;
  itemId: string;
  userName: string;
  userEmail: string;
  itemTitle: string;
  itemType: string;
  reservationDate: string;
  status?: string;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reservations' | 'catalog' | 'users' | 'passwords' | 'pieces' | 'polls'>('reservations');
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Add item form state
  const [newItemCategoryId, setNewItemCategoryId] = useState('');
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

  // Manual Reservation state
  const [selectedUserForReservation, setSelectedUserForReservation] = useState('');
  const [selectedItemForReservation, setSelectedItemForReservation] = useState('');
  const [reservationSearchUserTerm, setReservationSearchUserTerm] = useState('');
  const [reservationSearchItemTerm, setReservationSearchItemTerm] = useState('');

  // Edit form state
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStock, setEditStock] = useState('1');
  const [editImage, setEditImage] = useState('');

  // Password reset state
  const [selectedUserForPassword, setSelectedUserForPassword] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [passwordUserSearchTerm, setPasswordUserSearchTerm] = useState('');

  // Polls state
  const [pollTitle, setPollTitle] = useState('');
  const [pollDesc, setPollDesc] = useState('');
  const [pollExpiresAt, setPollExpiresAt] = useState('');
  const [pollOptions, setPollOptions] = useState([{ title: '', imageUrl: '', id: undefined as string | undefined }, { title: '', imageUrl: '', id: undefined as string | undefined }]);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [activePolls, setActivePolls] = useState<any[]>([]);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  
  // Category Form State
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const [catHome, setCatHome] = useState(true);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Filter Active Reservations
  const [reservationFilterSearchTerm, setReservationFilterSearchTerm] = useState('');
  const [reservationStatusFilter, setReservationStatusFilter] = useState<'all' | 'reserved' | 'delivered'>('all');

  const [isProOnly, setIsProOnly] = useState(false);
  const [editIsProOnly, setEditIsProOnly] = useState(false);

  useEffect(() => {
    fetchReservations();
    fetchCatalog();
    fetchUsers();
    fetchReports();
    fetchActivePolls();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/categories`);
      if (res.ok) {
        const cats = await res.json();
        setCategories(cats);
        if (cats.length > 0 && !newItemCategoryId) setNewItemCategoryId(cats[0].id);
      }
    } catch (e) { console.error(e); }
  };

  const fetchActivePolls = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/polls/active`);
      if (res.ok) setActivePolls(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/pieces`);
      if (res.ok) setReports(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/permissions`);
      if (res.ok) setUsers(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleRankToggle = async (userId: string, categoryId: string, isStandard: boolean, isPro: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, categoryId, isStandard, isPro })
      });
      if (res.ok) fetchUsers();
    } catch (e) { console.error(e); }
  };

  const fetchReservations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/reservations`);
      if (res.ok) setReservations(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchCatalog = async () => {
    try {
      const res = await fetch(`${API_URL}/api/catalog`);
      if (res.ok) setItems(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleCreateManualReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReservation || !selectedItemForReservation) return;

    const user = users.find(u => u.id === selectedUserForReservation);
    const item = items.find(i => i.id === selectedItemForReservation);

    if (!user || !item) return;

    // Permissions check - STRICT
    if (item.type === 'Aim Brickslab' && !user.permissions?.brickslab) {
      alert('Error: Este usuario no tiene el rango necesario (Aim Brickslab) para reservar sets de LEGO.');
      return;
    }
    if (item.type === 'Libro' && !user.permissions?.library) {
      alert('Error: Este usuario no tiene el rango necesario (Biblioteca) para reservar libros.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, itemId: item.id, type: item.type })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Reserva manual creada con éxito.');
        setSelectedUserForReservation('');
        setSelectedItemForReservation('');
        setReservationSearchUserTerm('');
        fetchReservations();
        fetchCatalog();
      } else {
        alert(data.error || 'Error al crear la reserva.');
      }
    } catch (err) {
      console.error(err);
      alert('Error en la conexión con el servidor.');
    }
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
    } catch (e) { console.error(e) }
  };

  const handleDeliver = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: id })
      });
      if (res.ok) {
        fetchReservations();
        fetchCatalog();
      }
    } catch (e) { console.error(e) }
  };

  const handleAdminCancel = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres anular esta reserva que aún no ha sido recogida?')) return;
    try {
      const res = await fetch(`${API_URL}/api/reservations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchReservations();
        fetchCatalog();
      } else {
        alert('No se pudo cancelar la reserva.');
      }
    } catch (e) { console.error(e) }
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
    } catch (e) { console.error(e); }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/admin/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: newItemCategoryId,
          title: newItemTitle,
          description: newItemDesc,
          imageUrl: newItemImage,
          stock: newItemStock,
          isProOnly,
          metadata: {
            isLego,
            legoReference: legoReferenceInput,
            author,
            isbn
          }
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
    } catch (e) { console.error(e); }
  };

  const handleEditClick = (item: CatalogItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDesc(item.description);
    setEditStock(item.stock?.toString() || '1');
    setEditImage(item.imageUrl || '');
    setEditIsProOnly(item.isProOnly || false);
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
          stock: editStock,
          imageUrl: editImage,
          isProOnly: editIsProOnly
        })
      });
      if (res.ok) {
        setEditingItem(null);
        fetchCatalog();
      }
    } catch (e) { console.error(e); }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newUserPassword) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/users/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserForPassword, newPassword: newUserPassword })
      });
      if (res.ok) {
        setNewUserPassword('');
        setSelectedUserForPassword('');
        alert('Contraseña actualizada correctamente para el usuario seleccionado.');
      } else {
        alert('Hubo un error al actualizar la contraseña.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión con el servidor.');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>
        Panel de Administración
      </h2>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
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
        <button
          className={`btn ${activeTab === 'passwords' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('passwords')}
        >
          Contraseñas
        </button>
        <button
          className={`btn ${activeTab === 'pieces' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('pieces')}
        >
          Reportes de Piezas
        </button>
        <button
          className={`btn ${activeTab === 'polls' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('polls')}
        >
          Votaciones
        </button>
        <button
          className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('categories' as any)}
        >
          Categorías
        </button>
      </div>

      {activeTab === 'reservations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={24} className="text-accent" /> Crear Reserva Manual Presencial
            </h3>
            <form onSubmit={handleCreateManualReservation} style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Alumno</label>
                <input 
                  type="text" 
                  placeholder="Buscar alumno por nombre o correo..." 
                  value={reservationSearchUserTerm}
                  onChange={e => setReservationSearchUserTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', marginBottom: '0.5rem' }}
                />
                <select 
                  required
                  value={selectedUserForReservation} 
                  onChange={e => setSelectedUserForReservation(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                >
                  <option value="">-- Selecciona un alumno --</option>
                  {users.filter(u => 
                    u.name.toLowerCase().includes(reservationSearchUserTerm.toLowerCase()) || 
                    u.email.toLowerCase().includes(reservationSearchUserTerm.toLowerCase())
                  ).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Artículo (Set o Libro)</label>
                <input 
                  type="text" 
                  placeholder="Buscar artículo por título o referencia..." 
                  value={reservationSearchItemTerm}
                  onChange={e => setReservationSearchItemTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', marginBottom: '0.5rem' }}
                />
                <select 
                  required
                  value={selectedItemForReservation} 
                  onChange={e => setSelectedItemForReservation(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                >
                  <option value="">-- Selecciona un artículo --</option>
                  {items.filter(i => 
                    i.isAvailable && 
                    (i.title.toLowerCase().includes(reservationSearchItemTerm.toLowerCase()) || 
                     (i.legoReference && i.legoReference.toLowerCase().includes(reservationSearchItemTerm.toLowerCase())))
                  ).map(i => (
                    <option key={i.id} value={i.id}>{i.type}: {i.title} {i.legoReference ? `(Ref: ${i.legoReference})` : ''}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Asignar Reserva Manualmente</button>
              </div>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Reservas en curso</h3>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                  <input 
                    type="text"
                    placeholder="Buscar alumno..."
                    value={reservationFilterSearchTerm}
                    onChange={e => setReservationFilterSearchTerm(e.target.value)}
                    style={{ padding: '0.5rem 1rem 0.5rem 2.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--background)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--surface-border)' }}>
                  <button 
                    className="btn"
                    onClick={() => setReservationStatusFilter('all')}
                    style={{ 
                      padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', border: 'none',
                      background: reservationStatusFilter === 'all' ? 'var(--primary)' : 'transparent',
                      color: reservationStatusFilter === 'all' ? '#fff' : 'var(--text-muted)'
                    }}
                  >Todas</button>
                  <button 
                    className="btn"
                    onClick={() => setReservationStatusFilter('reserved')}
                    style={{ 
                      padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', border: 'none',
                      background: reservationStatusFilter === 'reserved' ? 'var(--primary)' : 'transparent',
                      color: reservationStatusFilter === 'reserved' ? '#fff' : 'var(--text-muted)'
                    }}
                  >Pendientes</button>
                  <button 
                    className="btn"
                    onClick={() => setReservationStatusFilter('delivered')}
                    style={{ 
                      padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', border: 'none',
                      background: reservationStatusFilter === 'delivered' ? 'var(--primary)' : 'transparent',
                      color: reservationStatusFilter === 'delivered' ? '#fff' : 'var(--text-muted)'
                    }}
                  >Entregadas</button>
                </div>
              </div>
            </div>

          {reservations.filter(r => {
            const matchesSearch = r.userName.toLowerCase().includes(reservationFilterSearchTerm.toLowerCase()) || 
                                 r.userEmail.toLowerCase().includes(reservationFilterSearchTerm.toLowerCase());
            const matchesStatus = reservationStatusFilter === 'all' || 
                                 (reservationStatusFilter === 'reserved' && r.status === 'Reserved') ||
                                 (reservationStatusFilter === 'delivered' && r.status === 'Delivered');
            return matchesSearch && matchesStatus;
          }).length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No hay reservas que coincidan con los filtros.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Usuario</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Artículo</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Tipo</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Fecha</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Estado</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.filter(r => {
                    const matchesSearch = r.userName.toLowerCase().includes(reservationFilterSearchTerm.toLowerCase()) || 
                                         r.userEmail.toLowerCase().includes(reservationFilterSearchTerm.toLowerCase());
                    const matchesStatus = reservationStatusFilter === 'all' || 
                                         (reservationStatusFilter === 'reserved' && r.status === 'Reserved') ||
                                         (reservationStatusFilter === 'delivered' && r.status === 'Delivered');
                    return matchesSearch && matchesStatus;
                  }).map(r => (
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
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          background: r.status === 'Reserved' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                          color: r.status === 'Reserved' ? '#EAB308' : '#22C55E'
                        }}>
                          {r.status === 'Reserved' ? 'Pendiente Recogida' : 'Entregado a Alumno'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        {r.status === 'Reserved' ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                              onClick={() => handleDeliver(r.id)}
                            >
                              <CheckCircle size={16} /> Marcar Entregado
                            </button>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#EF4444', color: '#EF4444' }}
                              onClick={() => handleAdminCancel(r.id)}
                            >
                              Anular
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent)' }}
                              onClick={() => handleReturn(r.id)}
                            >
                              <CheckCircle size={16} /> Marcar Devuelto
                            </button>
                            {r.itemType === 'Aim Brickslab' && (
                              <button
                                className="btn btn-outline"
                                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#F59E0B', color: '#F59E0B' }}
                                onClick={async () => {
                                  const desc = prompt(`Reportar piezas faltantes para ${r.itemTitle}.\nDescribe las piezas que faltan:`);
                                  if (desc) {
                                    try {
                                      const res = await fetch(`${API_URL}/api/pieces/report`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: r.userId, brickslabId: r.itemId, description: desc })
                                      });
                                      if (res.ok) alert('Reporte de piezas enviado.');
                                      else alert('Error al enviar el reporte.');
                                    } catch (e) { console.error(e); }
                                  }
                                }}
                              >
                                Faltan Piezas
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}

      {activeTab === 'users' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Gestión de Rangos</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--background)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '0 0.75rem' }}>
                <Search size={16} className="text-muted" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  style={{ padding: '0.5rem 0', border: 'none', background: 'transparent', color: 'var(--text)', width: '150px', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>
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
            </div>
          </div>
          <div className="table-responsive-wrapper">
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Usuario</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Email</th>
                  {categories.map(cat => (
                    <th key={cat.id} style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                      {cat.name}
                    </th>
                  ))}
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
                    {categories.map(cat => {
                      const p = u.permissions?.[cat.id] || { standard: false, pro: false };
                      return (
                        <td key={cat.id} style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>S</label>
                            <input
                              type="checkbox"
                              checked={p.standard}
                              onChange={() => handleRankToggle(u.id, cat.id, !p.standard, p.pro)}
                              style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                            />
                            {cat.name.toLowerCase().includes('bricks') && (
                              <>
                                <label style={{ fontSize: '0.7rem', color: '#FCD34D' }}>P</label>
                                <input
                                  type="checkbox"
                                  checked={p.pro}
                                  onChange={() => handleRankToggle(u.id, cat.id, p.standard, !p.pro)}
                                  style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                                />
                              </>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'passwords' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Recuperación de Contraseña</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Selecciona un usuario del sistema para sustituir su contraseña actual por una nueva. Esta clave será cifrada de manera segura.</p>

          <form onSubmit={handlePasswordChangeSubmit} style={{ display: 'grid', gap: '1.5rem', maxWidth: '500px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Usuario a modificar</label>
              <input
                type="text"
                placeholder="Buscar por nombre o correo para filtrar la lista..."
                value={passwordUserSearchTerm}
                onChange={e => setPasswordUserSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', marginBottom: '0.5rem' }}
              />
              <select
                required
                value={selectedUserForPassword}
                onChange={e => setSelectedUserForPassword(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
              >
                <option value="">-- Selecciona un usuario --</option>
                {users.filter(u =>
                  u.name.toLowerCase().includes(passwordUserSearchTerm.toLowerCase()) ||
                  u.email.toLowerCase().includes(passwordUserSearchTerm.toLowerCase())
                ).map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nueva Contraseña</label>
              <input
                required
                type="text"
                value={newUserPassword}
                onChange={e => setNewUserPassword(e.target.value)}
                placeholder="Ejemplo: nueva_clave_segura_123"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Cambiar Contraseña</button>
          </form>
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
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Categoría</label>
                <select
                  value={newItemCategoryId}
                  onChange={e => setNewItemCategoryId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', appearance: 'none', WebkitAppearance: 'none', fontSize: '1rem', minHeight: '48px' }}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {newItemType === 'Aim Brickslab' && (
                <>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" id="isLego" checked={isLego} onChange={e => setIsLego(e.target.checked)} />
                    <label htmlFor="isLego" style={{ color: 'var(--text)' }}>Es un set de LEGO®</label>
                  </div>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" id="isProOnly" checked={isProOnly} onChange={e => setIsProOnly(e.target.checked)} />
                    <label htmlFor="isProOnly" style={{ color: 'var(--accent)', fontWeight: 600 }}>Exclusivo Brickslab Pro (Se puede llevar a casa)</label>
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
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                Inventario Actual
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--background)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '0 0.75rem' }}>
                  <Search size={16} className="text-muted" />
                  <input 
                    type="text"
                    placeholder="Buscar set o libro..."
                    value={catalogSearchTerm}
                    onChange={e => setCatalogSearchTerm(e.target.value)}
                    style={{ 
                      padding: '0.5rem 0', 
                      border: 'none', 
                      background: 'transparent', 
                      color: 'var(--text)',
                      fontSize: '0.875rem',
                      width: '150px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              <span style={{ fontSize: '0.875rem', background: 'var(--surface-border)', padding: '0.25rem 0.75rem', borderRadius: '8px' }}>
                {items.length} artículos
              </span>
            </h3>
            <div className="responsive-catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {items.filter(item => 
                item.title.toLowerCase().includes(catalogSearchTerm.toLowerCase()) ||
                (item.legoReference && item.legoReference.toLowerCase().includes(catalogSearchTerm.toLowerCase())) ||
                (item.author && item.author.toLowerCase().includes(catalogSearchTerm.toLowerCase())) ||
                (item.isbn && item.isbn.toLowerCase().includes(catalogSearchTerm.toLowerCase()))
              ).map(item => (
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
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>URL de la Imagen</label>
                <input required value={editImage} onChange={e => setEditImage(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Descripción</label>
                <textarea required value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', minHeight: '100px' }} />
              </div>
              {editingItem.type === 'Aim Brickslab' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input type="checkbox" id="edit-pro-check" checked={editIsProOnly} onChange={e => setEditIsProOnly(e.target.checked)} />
                  <label htmlFor="edit-pro-check" style={{ fontWeight: 600, color: 'var(--accent)' }}>Exclusivo para Brickslab Pro</label>
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditingItem(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'pieces' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Reportes de Piezas Faltantes</h3>
          {reports.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No hay reportes de piezas perdidas por el momento.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reports.map((report: any) => (
                <div key={report.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: report.status === 'Pending' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--surface-border)' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>{report.itemName}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--accent)' }}>{report.userName}</span> ({report.userEmail})
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#EF4444', fontStyle: 'italic' }}>
                      Descripción: "{report.description}"
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Reportado el: {new Date(report.reportedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    {report.status === 'Pending' ? (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        onClick={async () => {
                          await fetch(`${API_URL}/api/admin/pieces/resolve`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ reportId: report.id })
                          });
                          fetchReports();
                        }}
                      >
                        Marcar Resuelto
                      </button>
                    ) : (
                      <span style={{ color: '#10B981', fontSize: '0.875rem', fontWeight: 600 }}>Cerrado</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'polls' && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {activePolls.length > 0 && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: 'var(--accent)' }}>Estado de Votación Actual</h3>
              {activePolls.map(poll => {
                const totalVotes = poll.options.reduce((acc: number, opt: any) => acc + opt.votes, 0);
                return (
                  <div key={poll.id} style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h4 style={{ fontWeight: 600, fontSize: '1.25rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {poll.title}
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            background: poll.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: poll.isActive ? '#10B981' : '#EF4444',
                            border: poll.isActive ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                          }}>
                            {poll.isActive ? 'Activa' : 'Finalizada'}
                          </span>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto' }}
                            onClick={async () => {
                              const newStatus = !poll.isActive;
                              await fetch(`${API_URL}/api/admin/polls/${poll.id}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isActive: newStatus })
                              });
                              fetchActivePolls();
                            }}
                          >
                            {poll.isActive ? 'Cerrar Votación' : 'Abrir Votación'}
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto' }}
                            onClick={() => {
                              setEditingPollId(poll.id);
                              setPollTitle(poll.title);
                              setPollDesc(poll.description || '');
                              setPollExpiresAt(poll.expiresAt ? poll.expiresAt.substring(0, 16) : '');
                              setPollOptions(poll.options.map((o: any) => ({ title: o.title, imageUrl: o.imageUrl, id: o.id })));
                            }}
                          >
                            Editar
                          </button>
                        </h4>
                        <p style={{ color: 'var(--text-muted)' }}>{poll.description}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent)' }}>
                          {poll.expiresAt ? `Finaliza el: ${new Date(poll.expiresAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Sin fecha de fin'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Votos: {totalVotes}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                      {poll.options.map((opt: any) => {
                        const percentage = totalVotes > 0 ? (opt.votes / totalVotes * 100).toFixed(1) : '0';
                        return (
                          <div key={opt.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column' }}>
                            {opt.imageUrl && <img src={opt.imageUrl} alt={opt.title} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />}
                            <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '1rem' }}>{opt.title}</span>
                                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{opt.votes} v ({percentage}%)</span>
                              </div>
                              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }}></div>
                              </div>
                              
                              <div style={{ marginTop: '0.5rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Votantes:</div>
                                <div style={{ maxHeight: '100px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '0.5rem' }}>
                                  {opt.voters && opt.voters.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                      {opt.voters.map((v: any, idx: number) => (
                                        <div key={idx} style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column' }}>
                                          <span style={{ color: 'var(--text)' }}>{v.name} {v.surname}</span>
                                          <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{v.email}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin votos aún</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
              {editingPollId ? 'Editar Votación' : 'Crear Nueva Votación'}
            </h3>
            {!editingPollId && <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Al crear una encuesta, desactivarás la anterior automáticamente.</p>}
            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={async (e) => {
              e.preventDefault();
              const url = editingPollId ? `${API_URL}/api/admin/polls/${editingPollId}` : `${API_URL}/api/admin/polls`;
              const method = editingPollId ? 'PUT' : 'POST';

              await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: pollTitle,
                  description: pollDesc,
                  expiresAt: pollExpiresAt,
                  options: pollOptions
                })
              });
              alert(editingPollId ? 'Votación actualizada.' : 'Votación publicada.');
              setPollTitle(''); setPollDesc(''); setPollExpiresAt(''); setPollOptions([{ title: '', imageUrl: '', id: undefined }, { title: '', imageUrl: '', id: undefined }]);
              setEditingPollId(null);
              fetchActivePolls();
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <input required placeholder="Título" value={pollTitle} onChange={e => setPollTitle(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>Fecha fin (opcional, por defecto 1 del mes siguiente + 1)</label>
                  <input type="datetime-local" value={pollExpiresAt} onChange={e => setPollExpiresAt(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', fontSize: '0.85rem' }} />
                </div>
              </div>
              <input required placeholder="Descripción (opcional)" value={pollDesc} onChange={e => setPollDesc(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />

              <h4 style={{ marginTop: '1rem', color: 'var(--accent)' }}>Opciones a Votar</h4>
              {pollOptions.map((opt, i) => {
                return (
                  <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                    <input required placeholder={`Nombre Opción ${i + 1}`} value={opt.title} onChange={e => {
                      const newOpts = [...pollOptions];
                      newOpts[i].title = e.target.value;
                      setPollOptions(newOpts);
                    }} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
                    <input required placeholder={`URL Imagen ${i + 1}`} value={opt.imageUrl} onChange={e => {
                      const newOpts = [...pollOptions];
                      newOpts[i].imageUrl = e.target.value;
                      setPollOptions(newOpts);
                    }} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setPollOptions([...pollOptions, { title: '', imageUrl: '', id: undefined }])}>Añadir Opción</button>
                <button type="submit" className="btn btn-primary">{editingPollId ? 'Guardar Cambios' : 'Publicar Votación'}</button>
                {editingPollId && (
                  <button type="button" className="btn btn-outline" onClick={() => {
                    setEditingPollId(null);
                    setPollTitle(''); setPollDesc(''); setPollExpiresAt(''); setPollOptions([{ title: '', imageUrl: '', id: undefined }, { title: '', imageUrl: '', id: undefined }]);
                  }}>
                    Cancelar Edición
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {activeTab === ('categories' as any) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
              {editingCatId ? 'Editar Categoría' : 'Añadir Nueva Categoría'}
            </h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const url = editingCatId ? `${API_URL}/api/admin/categories/${editingCatId}` : `${API_URL}/api/admin/categories`;
              const method = editingCatId ? 'PUT' : 'POST';
              const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: catName, description: catDescription, icon: catIcon, isHomeAllowed: catHome })
              });
              if (res.ok) {
                setCatName(''); setCatDescription(''); setCatIcon(''); setCatHome(true); setEditingCatId(null);
                fetchCategories();
              }
            }} style={{ display: 'grid', gap: '1rem' }}>
              <input required placeholder="Nombre (Ej: LEGO® Sets)" value={catName} onChange={e => setCatName(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
              <input placeholder="Icono (opcional)" value={catIcon} onChange={e => setCatIcon(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
              <textarea placeholder="Descripción" value={catDescription} onChange={e => setCatDescription(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', minHeight: '80px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={catHome} onChange={e => setCatHome(e.target.checked)} />
                <label>Mostrar en Inicio</label>
              </div>
              <button type="submit" className="btn btn-primary">{editingCatId ? 'Guardar Cambios' : 'Añadir Categoría'}</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Categorías Existentes</h3>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
              {categories.map(cat => (
                <div key={cat.id} className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontWeight: 600, fontSize: '1.1rem' }}>{cat.name}</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => {
                        setEditingCatId(cat.id);
                        setCatName(cat.name);
                        setCatDescription(cat.description || '');
                        setCatIcon(cat.icon || '');
                        setCatHome(cat.isHomeAllowed);
                      }} className="text-accent" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Pencil size={18} /></button>
                      <button onClick={async () => {
                        if (confirm(`¿Borrar categoría ${cat.name}? Los artículos se borrarán.`)) {
                          await fetch(`${API_URL}/api/admin/categories/${cat.id}`, { method: 'DELETE' });
                          fetchCategories();
                        }
                      }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{cat.description || 'Sin descripción'}</p>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>
                    {cat._count?.items || 0} artículos
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
