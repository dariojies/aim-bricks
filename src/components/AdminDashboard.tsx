import React, { useState, useEffect } from 'react';
import { Trash2, CheckCircle, Plus, Pencil, Search, X, Trophy, Download } from 'lucide-react';
import type { CatalogItem } from '../data/mockData';

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';
const SUPER_ADMINS = ['d3859034-059e-4e90-ad8d-2a0a7f95c1f2', '631c7f2a-4949-442b-890b-24a990aca939', '465858fb-4d71-4c0c-b0df-7ea7ac35bb75'];

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

interface AdminDashboardProps {
  user?: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const isSuperAdmin = user?.id && SUPER_ADMINS.includes(user.id);
  const [activeTab, setActiveTab] = useState<'reservations' | 'catalog' | 'users' | 'passwords' | 'pieces' | 'polls' | 'categories' | 'memberships' | 'superadmin'>('reservations');
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [detectedClubId, setDetectedClubId] = useState('');
  const [selectedClubStats, setSelectedClubStats] = useState<any>(null);

  // Super Admin state
  const [newClubName, setNewClubName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerClubId, setOwnerClubId] = useState('');

  // Add item form state
  const [newItemCategoryId, setNewItemCategoryId] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemImage, setNewItemImage] = useState('');
  const [newItemStock, setNewItemStock] = useState('1');
  const [isLegoSet, setIsLegoSet] = useState(false);

  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filterBrickslab, setFilterBrickslab] = useState(false);
  const [filterLibrary, setFilterLibrary] = useState(false);
  const [filterAnyRank, setFilterAnyRank] = useState(false);
  const [filterProOnly, setFilterProOnly] = useState(false);

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
  const [catCustomFields, setCatCustomFields] = useState<any[]>([]);
  const [catReservationMode, setCatReservationMode] = useState<'brickslab' | 'library'>('brickslab');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Filter Active Reservations
  const [reservationFilterSearchTerm, setReservationFilterSearchTerm] = useState('');
  const [reservationStatusFilter, setReservationStatusFilter] = useState<'all' | 'reserved' | 'delivered'>('all');

  const [isProOnly, setIsProOnly] = useState(false);
  const [editIsProOnly, setEditIsProOnly] = useState(false);
  const [allowHomeBuild, setAllowHomeBuild] = useState(true);
  const [editAllowHomeBuild, setEditAllowHomeBuild] = useState(true);

  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'member' | 'profesor' | 'owner'>('member');
  const [membershipSearchTerm, setMembershipSearchTerm] = useState('');

  // Plan state
  const [clubPlan, setClubPlan] = useState<{
    plan: string;
    effectivePlan: string;
    active: boolean;
    planPaidAt: string | null;
    planExpiresAt: string | null;
    features: { csvImport: boolean; maxItems: number; maxCategories: number; label: string; color: string };
  } | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvCategoryId, setCsvCategoryId] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);

  useEffect(() => {
    // Determine which club the user is admin/owner of
    if (user?.memberships && user.memberships.length > 0) {
      const adminMembership = user.memberships.find((m: any) => m.role === 'owner' || m.role === 'profesor') || user.memberships[0];
      const initialClubId = localStorage.getItem('detectedClubId') || adminMembership.clubId;
      setDetectedClubId(initialClubId);
    }
  }, [user]);

  useEffect(() => {
    if (!detectedClubId) return;
    localStorage.setItem('detectedClubId', detectedClubId);

    fetchCategories();
    fetchActivePolls();
    fetchReports();
    fetchUsers();
    fetchReservations();
    fetchCatalog();
    fetchMemberships();
    fetchClubPlan(detectedClubId);
  }, [detectedClubId]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAllClubs();
    }
  }, [isSuperAdmin]);

  const fetchAllClubs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/clubs/all`);
      if (res.ok) setAllClubs(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchClubPlan = async (clubId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/club/plan?clubId=${clubId}`);
      if (res.ok) setClubPlan(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchClubStats = async (club: any) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/clubs/${club.id}/stats`);
      if (res.ok) {
        const stats = await res.json();
        setSelectedClubStats({ ...stats, clubName: club.name, clubId: club.id });
      }
    } catch (e) { console.error(e); }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/categories?clubId=${detectedClubId}`);
      if (res.ok) {
        const cats = await res.json();
        setCategories(cats);
        if (cats.length > 0 && !newItemCategoryId) setNewItemCategoryId(cats[0].id);
      }
    } catch (e) { console.error(e); }
  };

  const fetchActivePolls = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/polls/active?clubId=${detectedClubId}`);
      if (res.ok) setActivePolls(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/pieces?clubId=${detectedClubId}`);
      if (res.ok) setReports(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/permissions?clubId=${detectedClubId}`);
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
      const res = await fetch(`${API_URL}/api/admin/reservations?clubId=${detectedClubId}`);
      if (res.ok) setReservations(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchCatalog = async () => {
    try {
      const res = await fetch(`${API_URL}/api/catalog?clubId=${detectedClubId}`);
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
    const hasDynamicPerm = item.categoryId ? (user.permissions?.[item.categoryId]?.standard || user.permissions?.[item.categoryId]?.pro) : false;
    const hasLegacyBrickslab = user.legacyPermissions?.brickslab || user.legacyPermissions?.brickslabPro;
    const hasLegacyLibrary = user.legacyPermissions?.library;

    let allowed = false;
    if (hasDynamicPerm) {
      allowed = true;
    } else if (item.type === 'Aim Brickslab' && hasLegacyBrickslab) {
      allowed = true;
    } else if ((item.type === 'Libro' || item.type === 'Biblioteca') && hasLegacyLibrary) {
      allowed = true;
    }

    if (!allowed) {
      alert(`Error: Este usuario no tiene el rango necesario (${item.type}) para reservar este artículo.`);
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
          clubId: detectedClubId,
          categoryId: newItemCategoryId,
          title: newItemTitle,
          description: newItemDesc,
          imageUrl: newItemImage,
          stock: newItemStock,
          isProOnly,
          metadata: { ...customFieldValues, allowHomeBuild }
        })
      });
      if (res.ok) {
        setNewItemTitle('');
        setNewItemDesc('');
        setNewItemImage('');
        setNewItemStock('1');
        setIsProOnly(false);
        setAllowHomeBuild(true);
        setIsLegoSet(false);
        setCustomFieldValues({});
        alert('Elemento añadido correctamente');
        fetchCatalog();
      }
    } catch (e) { console.error(e); }
  };

  const handleCsvImport = async () => {
    if (!csvFile || !csvCategoryId) return;
    setCsvImporting(true);
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ''; });
        return row;
      });
      const res = await fetch(`${API_URL}/api/admin/items/import-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId: detectedClubId, categoryId: csvCategoryId, rows }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Importación completada: ${data.created} elementos añadidos.`);
        setCsvFile(null);
        fetchCatalog();
      } else {
        alert(data.error || 'Error al importar');
      }
    } catch (e) {
      console.error(e);
      alert('Error al leer el archivo');
    } finally {
      setCsvImporting(false);
    }
  };

  const handleEditClick = (item: CatalogItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDesc(item.description);
    setEditStock(item.stock?.toString() || '1');
    setEditImage(item.imageUrl || '');
    setEditIsProOnly(item.isProOnly || false);
    setEditAllowHomeBuild(item.metadata?.allowHomeBuild !== false); 
    
    // Populate dynamic custom fields
    setCustomFieldValues(item.metadata || {});
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
          isProOnly: editIsProOnly,
          metadata: { ...customFieldValues, allowHomeBuild: editAllowHomeBuild }
        })
      });
      if (res.ok) {
        setEditingItem(null);
        setCustomFieldValues({});
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

  const fetchMemberships = async () => {
    const userStr = localStorage.getItem('aim_bricks_user') || localStorage.getItem('brickslab_user') || localStorage.getItem('user');
    const user = JSON.parse(userStr || '{}');
    let clubId = user.clubId || user.club_id;

    // Si es superadmin y no tiene club, intentamos pillar el primero
    if (!clubId && user.role === 'superadmin') {
      try {
        const res = await fetch(`${API_URL}/api/admin/clubs`);
        if (res.ok) {
          const clubs = await res.json();
          if (clubs.length > 0) clubId = clubs[0].id;
        }
      } catch (err) { console.error(err); }
    }

    setDetectedClubId(clubId);
    if (!clubId) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/memberships?clubId=${clubId}`);
      if (res.ok) setMemberships(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleAddMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detectedClubId) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId: detectedClubId, email: memberEmail, role: memberRole, requesterEmail: user.email })
      });
      if (res.ok) {
        setMemberEmail('');
        fetchMemberships();
      }
    } catch (err) { console.error(err); }
  };

  const userClubRole = user?.memberships?.find((m: any) => m.clubId === detectedClubId)?.role;
  const canAssignElevated = user?.role === 'superadmin' || userClubRole === 'owner';

  const handleDeleteMembership = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar esta autorización?')) return;
    try {
      const params = user?.email ? `?requesterEmail=${encodeURIComponent(user.email)}` : '';
      const res = await fetch(`${API_URL}/api/admin/memberships/${id}${params}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'No tienes permiso para realizar esta acción.');
        return;
      }
      fetchMemberships();
    } catch (err) { console.error(err); }
  };

  const canDeleteMember = (targetRole: string) => {
    if (user?.role === 'superadmin') return true;
    if (userClubRole === 'owner') return targetRole !== 'owner';
    if (userClubRole === 'profesor') return targetRole === 'member';
    return false;
  };

  const handleExportPiecesCsv = () => {
    const pending = reports.filter(r => r.status === 'Pending');
    const totals: Record<string, number> = {};

    pending.forEach(report => {
      const lines = (report.description || '').split(/[\n,;]+/);
      lines.forEach((line: string) => {
        const trimmed = line.trim();
        // Formats: "300321: 2", "300321 2", "300321x2", "300321 x 2"
        const match = trimmed.match(/^(\d{4,8})\s*[:\sx]+\s*(\d+)$/i);
        if (match) {
          const id = match[1];
          const qty = parseInt(match[2], 10);
          totals[id] = (totals[id] || 0) + qty;
        } else {
          // Solo el ID sin cantidad → contar como 1
          const solo = trimmed.match(/^(\d{4,8})$/);
          if (solo) totals[solo[1]] = (totals[solo[1]] || 0) + 1;
        }
      });
    });

    const rows = Object.entries(totals);
    if (rows.length === 0) {
      alert('No se encontraron IDs de piezas en los reportes pendientes.\nUsa el formato: "elementId: cantidad" en las descripciones (ej: "300321: 2").');
      return;
    }

    const csv = ['elementId,quantity', ...rows.map(([id, qty]) => `${id},${qty}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `piezas_faltantes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>
          Panel de Administración
        </h2>
        {user?.memberships?.filter((m: any) => m.role === 'owner' || m.role === 'profesor').length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gestionando:</span>
            <select
              value={detectedClubId}
              onChange={(e) => setDetectedClubId(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
            >
              {user.memberships.filter((m: any) => m.role === 'owner' || m.role === 'profesor').map((m: any) => (
                <option key={m.clubId} value={m.clubId} style={{ background: 'var(--surface)', color: 'var(--text)' }}>
                  {m.clubName || 'Club ' + m.clubId.substring(0, 5)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

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
          onClick={() => setActiveTab('categories')}
        >
          Categorías
        </button>
        <button
          className={`btn ${activeTab === 'memberships' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('memberships')}
        >
          Miembros
        </button>
        {isSuperAdmin && (
          <button
            className={`btn ${activeTab === 'superadmin' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              borderColor: activeTab === 'superadmin' ? 'var(--primary)' : '#A78BFA',
              color: activeTab === 'superadmin' ? '#fff' : '#A78BFA'
            }}
            onClick={() => setActiveTab('superadmin')}
          >
            Control Maestro
          </button>
        )}
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
                            fontWeight: 600,
                            background: (r.itemType === 'Aim Brickslab') ? 'rgba(6, 182, 212, 0.1)' : (r.itemType === 'Libro' || r.itemType === 'Biblioteca') ? 'rgba(168, 85, 247, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                            color: (r.itemType === 'Aim Brickslab') ? '#22D3EE' : (r.itemType === 'Libro' || r.itemType === 'Biblioteca') ? '#A78BFA' : '#94A3B8'
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
                                          body: JSON.stringify({ userId: r.userId, itemId: r.itemId, description: desc })
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
              <button
                className="btn"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  background: filterProOnly ? 'linear-gradient(135deg, #D4AF37, #FBBF24)' : 'transparent',
                  borderColor: filterProOnly ? 'transparent' : '#D4AF37',
                  color: filterProOnly ? '#000' : '#D4AF37',
                  fontWeight: 700,
                  boxShadow: filterProOnly ? '0 0 15px rgba(212, 175, 55, 0.4)' : 'none',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setFilterProOnly(!filterProOnly)}
              >
                Solo Pro
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

                  // New dynamic filter logic based on category reservation modes
                  const hasBrickslabPermission = categories.some(cat =>
                    cat.config?.reservationMode === 'brickslab' &&
                    (u.permissions?.[cat.id]?.standard || u.permissions?.[cat.id]?.pro)
                  );
                  const hasLibraryPermission = categories.some(cat =>
                    cat.config?.reservationMode === 'library' &&
                    (u.permissions?.[cat.id]?.standard || u.permissions?.[cat.id]?.pro)
                  );
                  const hasAnyPermission = categories.some(cat =>
                    (u.permissions?.[cat.id]?.standard || u.permissions?.[cat.id]?.pro)
                  );
                  const hasProPermission = categories.some(cat => u.permissions?.[cat.id]?.pro);

                  const matchBrickslab = filterBrickslab ? hasBrickslabPermission : true;
                  const matchLibrary = filterLibrary ? hasLibraryPermission : true;
                  const matchAnyRank = filterAnyRank ? hasAnyPermission : true;
                  const matchProOnly = filterProOnly ? hasProPermission : true;

                  return matchSearch && matchBrickslab && matchLibrary && matchAnyRank && matchProOnly;
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

          {/* Plan badge + CSV import panel */}
          {clubPlan && (
            <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Plan badge row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Plan</span>
                <span style={{
                  background: clubPlan.features.color,
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}>
                  {clubPlan.plan !== 'starter' && clubPlan.plan !== clubPlan.effectivePlan
                    ? `${clubPlan.plan.charAt(0).toUpperCase() + clubPlan.plan.slice(1)} (expirado)`
                    : clubPlan.features.label}
                </span>
                {clubPlan.features.maxItems !== Infinity && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>· Máx. {clubPlan.features.maxItems} recursos</span>
                )}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>· Máx. {clubPlan.features.maxCategories} categoría{clubPlan.features.maxCategories === 1 ? '' : 's'}</span>
                {clubPlan.planExpiresAt && clubPlan.plan !== 'starter' && (
                  <span style={{ fontSize: '0.8rem', color: clubPlan.active ? 'var(--text-muted)' : '#FF4F15' }}>
                    · {clubPlan.active ? 'Activo hasta' : 'Venció el'} {new Date(clubPlan.planExpiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* CSV import — always shown, locked when plan doesn't include it */}
              <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
                  Importar desde CSV / Excel
                </h4>

                {!clubPlan.features.csvImport ? (
                  <div style={{
                    background: 'rgba(82, 51, 168, 0.06)',
                    border: '1px dashed rgba(82, 51, 168, 0.25)',
                    borderRadius: '10px',
                    padding: '1.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}>
                    <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🔒</span>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
                        {!clubPlan.active && clubPlan.plan !== 'starter'
                          ? 'Tu suscripción ha expirado'
                          : 'Función no incluida en tu plan actual'}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {!clubPlan.active && clubPlan.plan !== 'starter'
                          ? 'Renueva tu plan Academy o Network para volver a importar elementos en masa desde CSV o Excel.'
                          : 'La importación masiva de elementos está disponible a partir del plan Academy. Contacta con Shelfie para actualizar tu plan y cargar tu catálogo de golpe.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      Columnas esperadas: <code>title</code>, <code>description</code>, <code>stock</code>, <code>imageUrl</code>, <code>isProOnly</code>
                    </p>
                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr auto' }}>
                      <select
                        value={csvCategoryId}
                        onChange={e => setCsvCategoryId(e.target.value)}
                        style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                      >
                        <option value="">-- Categoría de destino --</option>
                        {categories.filter((cat: any) => !cat.locked).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={e => setCsvFile(e.target.files?.[0] || null)}
                        style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', fontSize: '0.875rem' }}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={handleCsvImport}
                        disabled={!csvFile || !csvCategoryId || csvImporting}
                        style={{ opacity: (!csvFile || !csvCategoryId || csvImporting) ? 0.5 : 1 }}
                      >
                        {csvImporting ? 'Importando...' : 'Importar'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

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
                  {categories.filter((cat: any) => !cat.locked).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic Custom Fields block moved below */}

              {/* Special Brickslab Pro toggle if in brickslab mode */}
              {categories.find(c => c.id === newItemCategoryId)?.config?.reservationMode === 'brickslab' && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(82, 51, 168, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(82, 51, 168, 0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" id="isProOnly" checked={isProOnly} onChange={e => setIsProOnly(e.target.checked)} />
                    <label htmlFor="isProOnly" style={{ color: 'var(--accent)', fontWeight: 600 }}>Artículo Exclusivo Pro (No visible para usuarios estándar)</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" id="allowHomeBuild" checked={allowHomeBuild} onChange={e => setAllowHomeBuild(e.target.checked)} />
                    <label htmlFor="allowHomeBuild" style={{ color: '#D4AF37', fontWeight: 600 }}>Permitir reserva para llevar a CASA (Solo alumnos Pro)</label>
                  </div>
                </div>
              )}

              {categories.find(c => c.id === newItemCategoryId)?.config?.reservationMode === 'brickslab' && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '-0.5rem' }}>
                  <input 
                    type="checkbox" 
                    id="isLegoSet" 
                    checked={isLegoSet}
                    onChange={e => {
                      const checked = e.target.checked;
                      setIsLegoSet(checked);
                      if (checked && !newItemTitle.startsWith('LEGO® ')) {
                        setNewItemTitle('LEGO® ' + newItemTitle);
                      } else if (!checked && newItemTitle.startsWith('LEGO® ')) {
                        setNewItemTitle(newItemTitle.replace('LEGO® ', ''));
                      }
                    }} 
                  />
                  <label htmlFor="isLegoSet" style={{ color: 'var(--text)', fontWeight: 600 }}>Es un set de LEGO® (Añade prefijo y campos extra)</label>
                </div>
              )}

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Título</label>
                <input required value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} type="text" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Stock Inicial (Número de copias físicas)</label>
                <input required value={newItemStock} onChange={e => setNewItemStock(e.target.value)} type="number" min="1" step="1" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
              </div>

              {/* Dynamic Custom Fields placed here for better UX */}
              {(() => {
                const cat = categories.find(c => c.id === newItemCategoryId);
                const isAim = user?.clubId === 'b68ca873-5086-474f-a296-fe60b149b8a2';
                let fields = cat?.config?.customFields || [];
                if (fields.length === 0 && isAim) {
                  if (cat?.name === 'Aim Brickslab') fields = [{ name: 'legoReference', label: 'Referencia LEGO', type: 'text' }, { name: 'pieces', label: 'Piezas', type: 'number' }];
                  if (cat?.name === 'Biblioteca' || cat?.name === 'Libro') fields = [{ name: 'author', label: 'Autor(es)', type: 'text' }, { name: 'isbn', label: 'ISBN', type: 'text' }];
                }
                return fields.map((field: any) => {
                  if (field.name === 'legoReference' && !isLegoSet) return null;
                  return (
                    <div key={field.name} style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{field.label}</label>
                      {field.type === 'checkbox' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={!!customFieldValues[field.name]}
                            onChange={e => setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.checked })}
                          />
                          <span style={{ color: 'var(--text)' }}>{field.label}</span>
                        </div>
                      ) : (
                        <input
                          type={field.type}
                          value={customFieldValues[field.name] || ''}
                          onChange={e => setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.value })}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                        />
                      )}
                    </div>
                  );
                });
              })()}
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

              {/* Dynamic Custom Fields for Edit Modal */}
              {(() => {
                const cat = categories.find(c => c.name === editingItem.type || c.id === editingItem.categoryId);
                const isAim = user?.clubId === 'b68ca873-5086-474f-a296-fe60b149b8a2';
                let fields = cat?.config?.customFields || [];
                if (fields.length === 0 && isAim) {
                  if (cat?.name === 'Aim Brickslab') fields = [{ name: 'legoReference', label: 'Referencia LEGO', type: 'text' }, { name: 'pieces', label: 'Piezas', type: 'number' }];
                  if (cat?.name === 'Biblioteca' || cat?.name === 'Libro') fields = [{ name: 'author', label: 'Autor(es)', type: 'text' }, { name: 'isbn', label: 'ISBN', type: 'text' }];
                }
                return fields.map((field: any) => (
                  <div key={field.name}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{field.label}</label>
                    {field.type === 'checkbox' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={!!customFieldValues[field.name]}
                          onChange={e => setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.checked })}
                        />
                        <span style={{ color: 'var(--text)' }}>{field.label}</span>
                      </div>
                    ) : (
                      <input
                        type={field.type}
                        value={customFieldValues[field.name] || ''}
                        onChange={e => setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.value })}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                      />
                    )}
                  </div>
                ));
              })()}

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(82, 51, 168, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(82, 51, 168, 0.1)', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" id="edit-pro-check" checked={editIsProOnly} onChange={e => setEditIsProOnly(e.target.checked)} />
                    <label htmlFor="edit-pro-check" style={{ fontWeight: 600, color: 'var(--accent)' }}>Exclusivo para Brickslab Pro</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" id="edit-home-check" checked={editAllowHomeBuild} onChange={e => setEditAllowHomeBuild(e.target.checked)} />
                    <label htmlFor="edit-home-check" style={{ fontWeight: 600, color: '#D4AF37' }}>Permitir reserva para llevar a CASA</label>
                  </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Reportes de Piezas Faltantes</h3>
            {reports.length > 0 && (
              <button
                className="btn btn-outline"
                onClick={handleExportPiecesCsv}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
              >
                <Download size={16} /> Exportar CSV para LEGO
              </button>
            )}
          </div>
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
                      <span style={{ color: '#5233A8', fontSize: '0.875rem', fontWeight: 600 }}>Cerrado</span>
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
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: '#5233A8' }}>Votaciones Activas</h3>
              {activePolls.filter(p => p.isActive).map(poll => {
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
                            background: poll.isActive ? 'rgba(82, 51, 168, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: poll.isActive ? '#5233A8' : '#EF4444',
                            border: poll.isActive ? '1px solid rgba(82, 51, 168, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
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

          {/* Past Polls */}
          {activePolls.filter(p => !p.isActive).length > 0 && (
            <div className="glass-panel" style={{ padding: '2rem', opacity: 0.9 }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: 'var(--text-muted)' }}>Votaciones Finalizadas</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {activePolls.filter(p => !p.isActive).map(poll => {
                  const totalVotes = poll.options.reduce((acc: number, opt: any) => acc + opt.votes, 0);
                  const winner = poll.options.reduce((prev: any, current: any) => (prev.votes > current.votes) ? prev : current, poll.options[0]);
                  return (
                    <div key={poll.id} style={{ background: 'rgba(0,0,0,0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ fontWeight: 600 }}>{poll.title}</h4>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto' }}
                            onClick={async () => {
                              await fetch(`${API_URL}/api/admin/polls/${poll.id}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isActive: true })
                              });
                              fetchActivePolls();
                            }}
                          >
                            Reabrir
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Votos: {totalVotes}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--accent)' }}>Ganador: <span style={{ fontWeight: 700 }}>{winner.title}</span> ({winner.votes} votos)</div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                  clubId: detectedClubId,
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
      {activeTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.5rem' }}>
                {editingCatId ? 'Editar Categoría' : 'Añadir Nueva Categoría'}
              </h3>
              {clubPlan && !editingCatId && (
                <span style={{
                  fontSize: '0.8rem',
                  color: categories.length >= clubPlan.features.maxCategories ? '#FF4F15' : 'var(--text-muted)',
                  fontWeight: categories.length >= clubPlan.features.maxCategories ? 700 : 400,
                }}>
                  {categories.length} / {clubPlan.features.maxCategories} categoría{clubPlan.features.maxCategories === 1 ? '' : 's'} usadas
                  {categories.length >= clubPlan.features.maxCategories && (
                    <span style={{ color: 'var(--purple)', fontWeight: 600, marginLeft: '0.5rem' }}>
                      · Límite del plan {clubPlan.features.label}
                    </span>
                  )}
                </span>
              )}
            </div>

            {!editingCatId && (
              <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plantillas Rápidas</h4>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => {
                      setCatName('Biblioteca');
                      setCatIcon('📚');
                      setCatDescription('Colección de libros para préstamo y lectura.');
                      setCatReservationMode('library');
                      setCatCustomFields([
                        { name: 'author', label: 'Autor(es)', type: 'text' },
                        { name: 'isbn', label: 'ISBN', type: 'text' }
                      ]);
                    }}
                    style={{ fontSize: '0.85rem' }}
                  >
                    📖 Plantilla: Biblioteca
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => {
                      setCatName('Brickslab - Legos');
                      setCatIcon('🧱');
                      setCatDescription('Sets de LEGO® para construcción en el club y préstamo premium.');
                      setCatReservationMode('brickslab');
                      setCatCustomFields([
                        { name: 'legoReference', label: 'Referencia LEGO', type: 'text' },
                        { name: 'pieces', label: 'Número de Piezas', type: 'number' }
                      ]);
                    }}
                    style={{ fontSize: '0.85rem' }}
                  >
                    🧱 Plantilla: Brickslab - Legos
                  </button>
                </div>
              </div>
            )}

            {/* Category limit reached — block the form with in-app notice */}
            {!editingCatId && clubPlan && categories.length >= clubPlan.features.maxCategories && (
              <div style={{
                background: 'rgba(82, 51, 168, 0.06)',
                border: '1px dashed rgba(82, 51, 168, 0.25)',
                borderRadius: '10px',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                marginBottom: '1rem',
              }}>
                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🔒</span>
                <div>
                  <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
                    Límite de categorías alcanzado
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Tu plan <strong style={{ color: 'var(--purple)' }}>{clubPlan.features.label}</strong> permite un máximo de{' '}
                    <strong>{clubPlan.features.maxCategories}</strong> categoría{clubPlan.features.maxCategories === 1 ? '' : 's'}.
                    {clubPlan.plan === 'starter' && ' Actualiza al plan Academy para tener hasta 4 categorías, o al plan Network para hasta 10.'}
                    {clubPlan.plan === 'academy' && ' Actualiza al plan Network para tener hasta 10 categorías.'}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!detectedClubId) return alert('No se ha detectado un Club ID válido.');
              const url = editingCatId ? `${API_URL}/api/admin/categories/${editingCatId}` : `${API_URL}/api/admin/categories`;
              const method = editingCatId ? 'PUT' : 'POST';
              const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  clubId: detectedClubId,
                  name: catName,
                  description: catDescription,
                  icon: catIcon,
                  isHomeAllowed: catHome,
                  config: {
                    customFields: catCustomFields,
                    reservationMode: catReservationMode
                  }
                })
              });
              if (res.ok) {
                setCatName(''); setCatDescription(''); setCatIcon(''); setCatHome(true);
                setCatCustomFields([]); setCatReservationMode('brickslab');
                setEditingCatId(null);
                fetchCategories();
              } else {
                const data = await res.json().catch(() => ({}));
                if (data.limitReached) {
                  fetchCategories();
                } else {
                  alert(data.error || 'Error al guardar la categoría');
                }
              }
            }} style={{ display: 'grid', gap: '1rem' }}>
              <input required placeholder="Nombre (Ej: LEGO® Sets)" value={catName} onChange={e => setCatName(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
              <input placeholder="Icono (opcional)" value={catIcon} onChange={e => setCatIcon(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }} />
              <textarea placeholder="Descripción" value={catDescription} onChange={e => setCatDescription(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', minHeight: '80px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={catHome} onChange={e => setCatHome(e.target.checked)} />
                <label>Mostrar en Inicio</label>
              </div>

              <div style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--accent)', fontSize: '1rem' }}>Modo de Reserva</h4>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setCatReservationMode('brickslab')} className={`btn ${catReservationMode === 'brickslab' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>Modo Botón Doble (Pro/Standard)</button>
                  <button type="button" onClick={() => setCatReservationMode('library')} className={`btn ${catReservationMode === 'library' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>Modo Botón Único</button>
                </div>
              </div>

              <div style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--accent)', fontSize: '1rem' }}>Constructor de Campos Personalizados</h4>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {catCustomFields.map((field, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        placeholder="Etiqueta (Ej: ISBN)"
                        value={field.label}
                        onChange={e => {
                          const newFields = [...catCustomFields];
                          newFields[idx].label = e.target.value;
                          newFields[idx].name = e.target.value.toLowerCase().replace(/\s+/g, '_');
                          setCatCustomFields(newFields);
                        }}
                        style={{ flex: 2, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                      />
                      <select
                        value={field.type}
                        onChange={e => {
                          const newFields = [...catCustomFields];
                          newFields[idx].type = e.target.value;
                          setCatCustomFields(newFields);
                        }}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                      >
                        <option value="text">Texto</option>
                        <option value="number">Número</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                      <button type="button" onClick={() => setCatCustomFields(catCustomFields.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-outline" onClick={() => setCatCustomFields([...catCustomFields, { label: '', name: '', type: 'text' }])} style={{ width: 'fit-content' }}>
                    <Plus size={16} /> Añadir Campo
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>{editingCatId ? 'Guardar Cambios' : 'Añadir Categoría'}</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Categorías Existentes</h3>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
              {categories.map(cat => (
                <div key={cat.id} className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden' }}>
                  {cat.locked && (
                    <div className="plan-lock-overlay">
                      <X size={28} className="lock-icon" />
                      <span className="lock-title">Categoría bloqueada por plan</span>
                      <span className="lock-sub">{cat._count?.items || 0} artículos conservados</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontWeight: 600, fontSize: '1.1rem' }}>{cat.name}</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => {
                        if (cat.locked) return;
                        setEditingCatId(cat.id);
                        setCatName(cat.name);
                        setCatDescription(cat.description || '');
                        setCatIcon(cat.icon || '');
                        setCatHome(cat.isHomeAllowed);
                        const config = cat.config || {};
                        setCatCustomFields(config.customFields || []);
                        setCatReservationMode(config.reservationMode || 'brickslab');
                      }} className="text-accent" style={{ background: 'none', border: 'none', cursor: cat.locked ? 'not-allowed' : 'pointer', opacity: cat.locked ? 0.3 : 1 }}><Pencil size={18} /></button>
                      <button onClick={async () => {
                        if (cat.locked) return;
                        if (confirm(`¿Borrar categoría ${cat.name}? Los artículos se borrarán.`)) {
                          await fetch(`${API_URL}/api/admin/categories/${cat.id}`, { method: 'DELETE' });
                          fetchCategories();
                        }
                      }} style={{ background: 'none', border: 'none', cursor: cat.locked ? 'not-allowed' : 'pointer', color: '#EF4444', opacity: cat.locked ? 0.3 : 1 }}><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{cat.description || 'Sin descripción'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>
                      {cat._count?.items || 0} artículos
                    </div>
                    <button
                      disabled={!!cat.locked}
                      onClick={async () => {
                        if (cat.locked) return;
                        await fetch(`${API_URL}/api/admin/categories/${cat.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: cat.name, icon: cat.icon, isHomeAllowed: cat.isHomeAllowed, description: cat.description, config: cat.config, rankingEnabled: !cat.rankingEnabled })
                        });
                        fetchCategories();
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '8px', border: 'none', cursor: cat.locked ? 'not-allowed' : 'pointer', opacity: cat.locked ? 0.4 : 1, background: cat.rankingEnabled ? 'rgba(33,182,104,0.12)' : 'rgba(255,255,255,0.06)', color: cat.rankingEnabled ? '#21B668' : 'var(--text-muted)' }}
                      title={cat.rankingEnabled ? 'Ranking activo — clic para desactivar' : 'Ranking inactivo — clic para activar'}
                    >
                      <Trophy size={12} />
                      {cat.rankingEnabled ? 'Ranking ON' : 'Ranking OFF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'memberships' && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={24} className="text-accent" /> Autorizar Nuevo Miembro
            </h3>
            <form onSubmit={handleAddMembership} style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="alumno@ejemplo.com"
                  value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                />
              </div>
              <div style={{ width: '150px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Rol</label>
                <select
                  value={memberRole}
                  onChange={e => setMemberRole(e.target.value as any)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                >
                  <option value="member">Miembro</option>
                  {canAssignElevated && <option value="profesor">Profesor</option>}
                  {canAssignElevated && <option value="owner">Dueño</option>}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: '45px' }}>Añadir</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem' }}>Miembros Autorizados</h3>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar por email..."
                  value={membershipSearchTerm}
                  onChange={e => setMembershipSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                />
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)', textAlign: 'left' }}>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Email</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Rol</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Estado</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Fecha Alta</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.filter(m => m.email.toLowerCase().includes(membershipSearchTerm.toLowerCase())).length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron miembros con ese filtro.</td></tr>
                  ) : (
                    memberships
                      .filter(m => m.email.toLowerCase().includes(membershipSearchTerm.toLowerCase()))
                      .map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem', fontWeight: 500 }}>{m.email}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              background: m.role === 'owner' ? 'rgba(167, 139, 250, 0.1)' : m.role === 'profesor' ? 'rgba(33, 182, 104, 0.1)' : 'rgba(255,255,255,0.1)',
                              color: m.role === 'owner' ? '#A78BFA' : m.role === 'profesor' ? '#21B668' : 'var(--text)'
                            }}>
                              {m.role === 'owner' ? 'Dueño' : m.role === 'profesor' ? 'Profesor' : 'Miembro'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              background: m.isRegistered ? 'rgba(82, 51, 168, 0.1)' : 'rgba(255,255,255,0.05)',
                              color: m.isRegistered ? '#5233A8' : 'var(--text-muted)'
                            }}>
                              {m.isRegistered ? 'Registrado' : 'Pendiente'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            {new Date(m.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            {canDeleteMember(m.role) && (
                              <button
                                onClick={() => handleDeleteMembership(m.id)}
                                className="text-error"
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'superadmin' && isSuperAdmin && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: '#A78BFA' }}>Crear Nuevo Club</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch(`${API_URL}/api/admin/clubs`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: newClubName })
                });
                if (res.ok) {
                  alert('Club creado con éxito.');
                  setNewClubName('');
                  fetchAllClubs();
                }
              } catch (e) { console.error(e); }
            }} style={{ display: 'flex', gap: '1rem' }}>
              <input
                required
                placeholder="Nombre del Club (Ej: Aim Barcelona)"
                value={newClubName}
                onChange={e => setNewClubName(e.target.value)}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
              />
              <button type="submit" className="btn btn-primary">Registrar Club</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: '#A78BFA' }}>Asignar Owner a Club</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Esto otorgará permisos de administración total sobre el club seleccionado al email indicado.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!ownerClubId) return alert('Selecciona un club.');
              try {
                const res = await fetch(`${API_URL}/api/admin/memberships`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: ownerEmail, clubId: ownerClubId, role: 'owner', requesterEmail: user.email })
                });
                if (res.ok) {
                  alert('Dueño asignado correctamente.');
                  setOwnerEmail('');
                } else {
                  const data = await res.json();
                  alert(data.error || 'Error al asignar dueño.');
                }
              } catch (e) { console.error(e); }
            }} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr 100px' }}>
              <input
                required
                type="email"
                placeholder="email@del-owner.com"
                value={ownerEmail}
                onChange={e => setOwnerEmail(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
              />
              <select
                required
                value={ownerClubId}
                onChange={e => setOwnerClubId(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
              >
                <option value="">-- Seleccionar Club --</option>
                {allClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit" className="btn btn-primary">Asignar</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Clubes en el Sistema</h3>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
              {allClubs.map(c => (
                <div
                  key={c.id}
                  onClick={() => fetchClubStats(c)}
                  style={{
                    padding: '1.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    border: '1px solid var(--surface-border)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.borderColor = '#A78BFA';
                    e.currentTarget.style.background = 'rgba(167, 139, 250, 0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--surface-border)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{c.name}</div>
                    <span style={{
                      background: c.plan === 'network' ? '#21B668' : c.plan === 'academy' ? '#5233A8' : '#908E86',
                      color: 'white', padding: '0.15rem 0.6rem', borderRadius: '20px',
                      fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, marginLeft: '0.5rem'
                    }}>{c.plan || 'starter'}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '0.75rem' }}>ID: {c.id}</div>
                  {/* Billing info */}
                  {c.plan !== 'starter' && (
                    <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem', color: (() => {
                      if (!c.planExpiresAt) return '#FF4F15';
                      return new Date(c.planExpiresAt) > new Date() ? 'var(--text-muted)' : '#FF4F15';
                    })() }}>
                      {!c.planExpiresAt
                        ? '⚠ Sin pago registrado'
                        : new Date(c.planExpiresAt) > new Date()
                          ? `Activo hasta ${new Date(c.planExpiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : `⚠ Expiró el ${new Date(c.planExpiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      }
                    </div>
                  )}
                  {/* Plan selector */}
                  <select
                    value={c.plan || 'starter'}
                    onClick={e => e.stopPropagation()}
                    onChange={async (e) => {
                      e.stopPropagation();
                      const newPlan = e.target.value;
                      try {
                        const res = await fetch(`${API_URL}/api/admin/clubs/${c.id}/plan`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ plan: newPlan }),
                        });
                        if (res.ok) fetchAllClubs();
                        else alert('Error al cambiar el plan');
                      } catch (err) { console.error(err); }
                    }}
                    style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', fontSize: '0.8rem', marginBottom: '0.5rem', cursor: 'pointer' }}
                  >
                    <option value="starter">Starter (gratuito)</option>
                    <option value="academy">Academy</option>
                    <option value="network">Network</option>
                  </select>
                  {/* Record payment — only for paid plans */}
                  {c.plan !== 'starter' && (
                    <button
                      className="btn btn-primary"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const res = await fetch(`${API_URL}/api/admin/clubs/${c.id}/payment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({}),
                          });
                          if (res.ok) {
                            fetchAllClubs();
                          } else alert('Error al registrar el pago');
                        } catch (err) { console.error(err); }
                      }}
                      style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}
                    >
                      ✓ Registrar pago hoy
                    </button>
                  )}
                  <div style={{ fontSize: '0.8rem', color: '#A78BFA', fontWeight: 600 }}>Click para auditar →</div>
                </div>
              ))}
            </div>
          </div>

          {selectedClubStats && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
              zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
            }} onClick={() => setSelectedClubStats(null)}>
              <div
                className="hide-scrollbar"
                style={{
                  background: 'var(--surface)', width: '100%', maxWidth: '600px',
                  borderRadius: '20px', padding: '2.5rem', border: '1px solid #A78BFA',
                  maxHeight: '90vh', overflowY: 'auto'
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '2rem', color: '#A78BFA' }}>{selectedClubStats.clubName}</h2>
                  <button onClick={() => setSelectedClubStats(null)} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}>
                    <X size={24} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{selectedClubStats.totalMembers}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Miembros Totales</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{selectedClubStats.totalItems}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Productos Únicos</div>
                  </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase' }}>Miembros del Club</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Email</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Rol</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedClubStats.memberships?.filter((m: any) => m.role === 'owner' || m.role === 'profesor').map((m: any) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text)' }}>{m.email}</td>
                            <td style={{ padding: '0.6rem 0.75rem' }}>
                              <select
                                value={m.role}
                                onChange={async (e) => {
                                  const newRole = e.target.value;
                                  const res = await fetch(`${API_URL}/api/admin/memberships`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ clubId: selectedClubStats.clubId, email: m.email, role: newRole, requesterEmail: user.email })
                                  });
                                  if (res.ok) {
                                    setSelectedClubStats((prev: any) => ({
                                      ...prev,
                                      memberships: prev.memberships.map((x: any) => x.id === m.id ? { ...x, role: newRole } : x),
                                      owners: newRole === 'owner'
                                        ? [...prev.owners.filter((o: string) => o !== m.email), m.email]
                                        : prev.owners.filter((o: string) => o !== m.email)
                                    }));
                                  }
                                }}
                                style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--surface)', color: m.role === 'owner' ? '#A78BFA' : m.role === 'profesor' ? '#21B668' : 'var(--text)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                <option value="member">Miembro</option>
                                <option value="profesor">Profesor</option>
                                <option value="owner">Dueño</option>
                              </select>
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                              <button
                                onClick={async () => {
                                  if (!confirm(`¿Eliminar a ${m.email} del club?`)) return;
                                  const res = await fetch(`${API_URL}/api/admin/memberships/${m.id}?requesterEmail=${encodeURIComponent(user.email)}`, { method: 'DELETE' });
                                  if (res.ok) {
                                    setSelectedClubStats((prev: any) => ({
                                      ...prev,
                                      memberships: prev.memberships.filter((x: any) => x.id !== m.id),
                                      owners: prev.owners.filter((o: string) => o !== m.email),
                                      totalMembers: prev.totalMembers - 1
                                    }));
                                  }
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '0.2rem' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase' }}>Desglose por Categorías</h4>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {selectedClubStats.categories.map((cat: any) => (
                      <div key={cat.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                        <span style={{ fontWeight: 600 }}>{cat.name}</span>
                        <span style={{ color: '#A78BFA' }}>{cat.itemCount} productos</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Stock Total Acumulado: <span style={{ color: 'var(--text)', fontWeight: 700 }}>{selectedClubStats.totalStock} unidades</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
