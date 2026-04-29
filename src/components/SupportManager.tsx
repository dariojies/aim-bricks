import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Clock, Filter, ChevronRight, User, Plus, Search, Calendar, Copy, FileText } from 'lucide-react';

interface Ticket {
  id: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  app_label: string | string[];
  dev_response: string | null;
  created_at: string;
  name: string;
  surname: string;
  email: string;
  assignee_username: string | null;
  assignee_picture: string | null;
  assigned_to: string | null;
}

interface Superadmin {
  id: string;
  name: string;
  username: string;
}

interface SupportManagerProps {
  onClose: () => void;
  userId: string;
}

export const SupportManager: React.FC<SupportManagerProps> = ({ onClose, userId }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [superadmins, setSuperadmins] = useState<Superadmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  // Filters
  const [filterApp, setFilterApp] = useState('Todas');
  const [filterPriority, setFilterPriority] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('OPEN');
  const [filterOnlyMe, setFilterOnlyMe] = useState(false);
  const [sortIdOrder, setSortIdOrder] = useState<'desc' | 'asc'>('desc');
  const [sortByPriority, setSortByPriority] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selection
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [editData, setEditData] = useState({
    status: '',
    priority: '',
    devResponse: '',
    dueDate: '',
    assignedTo: '',
    appLabel: [] as string[]
  });

  const apps = ['Todas', 'Aim Education', 'Learning Dungeon', 'Aim Training', 'Aim Brickslab', 'Aim Artemis', 'Aim Eventos'];
  const priorities = ['Todas', 'Baja', 'Media', 'Alta'];
  const statuses = ['Todas', 'OPEN', 'RESOLVED', 'CLOSED'];

  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchSuperadmins();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/support');
      const data = await res.json();
      if (data.success) {
        // BASE FILTER: Only tickets that have 'Aim Brickslab' in their labels
        const brickslabTickets = data.tickets.filter((t: Ticket) => {
          const labels = Array.isArray(t.app_label) 
            ? t.app_label 
            : (t.app_label ? t.app_label.split(',').map(s => s.trim()) : []);
          return labels.includes('Aim Brickslab');
        });
        setTickets(brickslabTickets);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!newSubject || !newDescription) {
      alert('Por favor, rellena todos los campos.');
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          subject: newSubject, 
          description: newDescription,
          appLabel: ['Aim Brickslab'] 
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Ticket creado con éxito.');
        setNewSubject('');
        setNewDescription('');
        setActiveTab('list');
        fetchTickets();
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const fetchSuperadmins = async () => {
    try {
      const res = await fetch('/api/admin/superadmins');
      const data = await res.json();
      if (data.success) setSuperadmins(data.superadmins);
    } catch (error) {
      console.error('Error fetching superadmins:', error);
    }
  };

  const handleOpenDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    const labels = Array.isArray(ticket.app_label) ? ticket.app_label : (ticket.app_label ? ticket.app_label.split(',').map(s => s.trim()) : ['Aim Brickslab']);
    
    let formattedDate = '';
    if (ticket.due_date) {
      const d = new Date(ticket.due_date);
      formattedDate = d.toISOString().split('T')[0];
    }

    setEditData({
      status: ticket.status.toUpperCase(),
      priority: ticket.priority.toLowerCase(),
      devResponse: ticket.dev_response || '',
      dueDate: formattedDate,
      assignedTo: ticket.assigned_to || '',
      appLabel: labels
    });
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/support/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTicket(null);
        fetchTickets();
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': case 'alta': return '#ef4444';
      case 'medium': case 'media': return '#f59e0b';
      case 'low': case 'baja': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'RESOLVED': return '#10b981';
      case 'CLOSED': return '#6b7280';
      case 'OPEN': default: return '#f59e0b';
    }
  };

  const filteredAndSortedTickets = tickets.filter(t => {
    const labels = Array.isArray(t.app_label) ? t.app_label : (t.app_label ? t.app_label.split(',').map(s => s.trim()) : []);
    const matchesApp = filterApp === 'Todas' || labels.includes(filterApp);
    const matchesPriority = filterPriority === 'Todas' || t.priority.toLowerCase() === (filterPriority === 'Alta' ? 'high' : filterPriority === 'Media' ? 'medium' : 'low');
    const matchesStatus = filterStatus === 'Todas' || t.status.toUpperCase() === filterStatus;
    const matchesOnlyMe = !filterOnlyMe || t.assigned_to === userId;
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toString().includes(searchQuery);
    return matchesApp && matchesPriority && matchesStatus && matchesSearch && matchesOnlyMe;
  }).sort((a, b) => {
    if (sortByPriority) {
      const weights: any = { 'high': 3, 'medium': 2, 'low': 1 };
      const weightA = weights[a.priority.toLowerCase()] || 0;
      const weightB = weights[b.priority.toLowerCase()] || 0;
      if (weightA !== weightB) return weightB - weightA;
    }
    return sortIdOrder === 'desc' ? b.id - a.id : a.id - b.id;
  });

  const copyToClipboard = () => {
    if (filteredAndSortedTickets.length === 0) return;
    
    let text = `REPORTE DE TICKETS (Aim Brickslab) - ${new Date().toLocaleDateString()}\n`;
    text += `Filtros: App: ${filterApp}, Estado: ${filterStatus}, Prioridad: ${filterPriority}\n`;
    text += `--------------------------------------------------\n\n`;

    filteredAndSortedTickets.forEach(t => {
      const appsStr = Array.isArray(t.app_label) ? t.app_label.join(', ') : t.app_label;
      text += `[#${t.id}] ${t.subject.toUpperCase()}\n`;
      text += `Prioridad: ${t.priority.toUpperCase()} | Estado: ${t.status.toUpperCase()}\n`;
      text += `Apps: ${appsStr}\n`;
      text += `Creado por: ${t.name} ${t.surname} (${t.email})\n`;
      text += `Asignado a: ${t.assignee_username || 'Sin asignar'}\n`;
      text += `Fecha de Entrega: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'}\n`;
      text += `Descripción: ${t.description}\n`;
      if (t.dev_response) text += `Respuesta Dev: ${t.dev_response}\n`;
      text += `\n--------------------------------------------------\n\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      alert('Listado copiado al portapapeles');
    });
  };

  const exportPDF = () => {
    if (filteredAndSortedTickets.length === 0) return;

    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            .header { border-bottom: 2px solid #10b981; padding-bottom: 10px; margin-bottom: 20px; }
            .ticket { border: 1px solid #eee; padding: 15px; margin-bottom: 15px; border-radius: 8px; }
            .ticket-id { color: #10b981; font-weight: bold; }
            .priority { font-weight: bold; text-transform: uppercase; font-size: 10px; }
            .subject { font-size: 18px; font-weight: bold; margin: 10px 0; }
            .metadata { font-size: 12px; color: #666; margin-top: 10px; border-top: 1px solid #f5f5f5; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>REPORTE DE SOPORTE - AIM BRICKSLAB</h1>
            <p>Generado el ${new Date().toLocaleString()}</p>
          </div>
          ${filteredAndSortedTickets.map(t => `
            <div class="ticket">
              <span class="ticket-id">#${t.id}</span> | 
              <span class="priority">${t.priority}</span> | 
              <span>${t.status.toUpperCase()}</span>
              <div class="subject">${t.subject}</div>
              <div class="description">${t.description}</div>
              <div class="metadata">
                <div>De: ${t.name} ${t.surname} (${t.email})</div>
                <div>Asignado a: ${t.assignee_username || 'PENDIENTE'}</div>
                <div>Apps: ${Array.isArray(t.app_label) ? t.app_label.join(', ') : t.app_label}</div>
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="support-manager-overlay" style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      zIndex: 2000, display: 'flex', flexDirection: 'column', color: '#fff'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onClose} className="btn-icon">
            <X size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Panel de Soporte (Superadmin)</h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className={`btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
            style={{ 
              background: activeTab === 'list' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: activeTab === 'list' ? '#10b981' : '#fff',
              border: activeTab === 'list' ? '1px solid #10b981' : '1px solid transparent',
              padding: '0.5rem 1.5rem', borderRadius: '8px'
            }}
          >
            Ver Registros
          </button>
          <button 
            className={`btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
            style={{ 
              background: activeTab === 'create' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: activeTab === 'create' ? '#10b981' : '#fff',
              border: activeTab === 'create' ? '1px solid #10b981' : '1px solid transparent',
              padding: '0.5rem 1.5rem', borderRadius: '8px'
            }}
          >
            Crear Reporte
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
        <>
          {/* Filters Bar */}
          <div style={{
            padding: '1rem 2rem', background: '#161616', borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', flexDirection: 'column', gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>App:</span>
                <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '4px' }}>
                  {apps.map(app => (
                    <button 
                      key={app}
                      onClick={() => setFilterApp(app)}
                      style={{
                        padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem',
                        background: filterApp === app ? '#10b981' : 'rgba(255,255,255,0.05)',
                        border: 'none', color: filterApp === app ? '#000' : '#fff', cursor: 'pointer', whiteSpace: 'nowrap',
                        fontWeight: filterApp === app ? 700 : 400
                      }}
                    >
                      {app}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Prioridad:</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {priorities.map(p => (
                    <button 
                      key={p}
                      onClick={() => setFilterPriority(p)}
                      style={{
                        padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem',
                        background: filterPriority === p ? '#10b981' : 'rgba(255,255,255,0.05)',
                        border: 'none', color: filterPriority === p ? '#000' : '#fff', cursor: 'pointer',
                        fontWeight: filterPriority === p ? 700 : 400
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Estado:</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {statuses.map(s => (
                    <button 
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      style={{
                        padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem',
                        background: filterStatus === s ? '#10b981' : 'rgba(255,255,255,0.05)',
                        border: 'none', color: filterStatus === s ? '#000' : '#fff', cursor: 'pointer',
                        fontWeight: filterStatus === s ? 700 : 400
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                  <input 
                    type="text"
                    placeholder="Buscar ticket..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem', borderRadius: '10px',
                      background: '#222', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem'
                    }}
                  />
                </div>

                <button 
                  className="btn" 
                  onClick={() => setFilterOnlyMe(!filterOnlyMe)}
                  style={{
                    background: filterOnlyMe ? '#3B82F6' : 'rgba(255,255,255,0.05)',
                    color: '#fff', padding: '0.6rem 1rem', borderRadius: '8px', border: 'none',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
                  }}
                >
                  <User size={18} fill={filterOnlyMe ? "white" : "none"} /> Solo las mías
                </button>

                <button 
                  className="btn" 
                  onClick={() => setSortIdOrder(sortIdOrder === 'desc' ? 'asc' : 'desc')}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff', padding: '0.6rem 1rem', borderRadius: '8px', border: 'none',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
                  }}
                >
                  <Filter size={18} /> ID: {sortIdOrder.toUpperCase()}
                </button>

                <button 
                  className="btn" 
                  onClick={() => setSortByPriority(!sortByPriority)}
                  style={{
                    background: sortByPriority ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                    color: sortByPriority ? '#000' : '#fff', padding: '0.6rem 1rem', borderRadius: '8px', border: 'none',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 700
                  }}
                >
                  <AlertCircle size={18} /> Prioridad
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn" 
                  onClick={exportPDF}
                  style={{ background: '#10b981', color: '#000', fontWeight: 700, padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <FileText size={18} /> Listado PDF
                </button>
                <button 
                  className="btn" 
                  onClick={copyToClipboard}
                  style={{ background: '#3B82F6', color: '#fff', fontWeight: 700, padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Copy size={18} /> Copiar Texto
                </button>
              </div>
            </div>
          </div>

          {/* Tickets List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                <div className="loader"></div>
              </div>
            ) : filteredAndSortedTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
                <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p>No se encontraron tickets con los filtros actuales.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '1100px', margin: '0 auto' }}>
                {filteredAndSortedTickets.map(ticket => (
                  <div 
                    key={ticket.id}
                    onClick={() => handleOpenDetail(ticket)}
                    style={{
                      background: '#1a1a1a', borderRadius: '12px', padding: '1.25rem 1.5rem',
                      borderLeft: `5px solid ${getPriorityColor(ticket.priority)}`,
                      cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', flexDirection: 'column', gap: '0.5rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#222';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#1a1a1a';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>#{ticket.id}</span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {(Array.isArray(ticket.app_label) ? ticket.app_label : [ticket.app_label || 'Aim Brickslab']).map(label => (
                            <span key={label} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>
                              {label}
                            </span>
                          ))}
                        </div>
                        <span style={{ 
                          background: `${getPriorityColor(ticket.priority)}15`, 
                          color: getPriorityColor(ticket.priority),
                          border: `1px solid ${getPriorityColor(ticket.priority)}30`,
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase'
                        }}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      </div>
                      <span style={{ color: getStatusColor(ticket.status), fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </div>

                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#eee' }}>{ticket.subject}</h3>
                    <p style={{ margin: 0, color: '#888', fontSize: '0.9rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ticket.description}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#555' }}>De: <strong style={{ color: '#777' }}>{ticket.name} {ticket.surname}</strong></span>
                        <span style={{ fontSize: '0.8rem', color: '#555', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={12} /> {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {ticket.assignee_username && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '20px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>Asignado a:</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>{ticket.assignee_username}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'create' && (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '4rem 2rem', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             <h2 style={{ fontSize: '2rem', textAlign: 'center' }}>Crear Nuevo Reporte</h2>
             <p style={{ textAlign: 'center', color: '#888' }}>Esta sección te permite registrar una tarea o bug directamente.</p>
             <div style={{ background: '#1a1a1a', padding: '2rem', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
               <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                 <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Asunto</label>
                 <input 
                   type="text" 
                   className="input" 
                   placeholder="Ej: Bug en el buscador" 
                   value={newSubject}
                   onChange={(e) => setNewSubject(e.target.value)}
                   style={{ width: '100%', padding: '0.8rem', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '8px' }} 
                 />
               </div>
               <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                 <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Descripción</label>
                 <textarea 
                   className="input" 
                   rows={5} 
                   placeholder="Detalla el problema..." 
                   value={newDescription}
                   onChange={(e) => setNewDescription(e.target.value)}
                   style={{ width: '100%', padding: '0.8rem', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '8px', resize: 'none' }}
                 ></textarea>
               </div>
               <button 
                 className="btn" 
                 onClick={handleSubmitReport}
                 disabled={isCreating}
                 style={{ width: '100%', padding: '1rem', background: '#10b981', color: '#000', fontWeight: 700, borderRadius: '8px', opacity: isCreating ? 0.7 : 1 }}
               >
                 {isCreating ? 'Enviando...' : 'Enviar Reporte'}
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedTicket && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 3000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '850px', maxHeight: '95vh', overflowY: 'auto',
            background: '#111', border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '2.5rem', borderRadius: '24px', position: 'relative',
            boxShadow: '0 0 50px rgba(0,0,0,0.5)'
          }}>
            <button onClick={() => setSelectedTicket(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={24} />
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#10b981', fontWeight: 900, fontSize: '1.4rem' }}>Ticket #{selectedTicket.id}</span>
                    <span style={{ color: getStatusColor(selectedTicket.status), fontWeight: 800, fontSize: '0.9rem', border: `1px solid ${getStatusColor(selectedTicket.status)}40`, padding: '2px 10px', borderRadius: '20px' }}>
                      {selectedTicket.status.toUpperCase()}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '2.2rem', margin: '0 0 1rem 0', fontWeight: 800, letterSpacing: '-0.03em' }}>{selectedTicket.subject}</h2>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.95rem', color: '#888' }}>Informado por: <strong style={{ color: '#aaa' }}>{selectedTicket.name} {selectedTicket.surname}</strong></span>
                    <span style={{ color: '#333' }}>|</span>
                    <span style={{ fontSize: '0.95rem', color: '#888' }}>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#181818', padding: '1.5rem', borderRadius: '16px', border: '1px solid #222' }}>
                <h4 style={{ margin: '0 0 1rem 0', textTransform: 'uppercase', fontSize: '0.7rem', color: '#555', letterSpacing: '0.1em', fontWeight: 800 }}>Descripción del problema</h4>
                <div style={{ color: '#ccc', fontSize: '1.05rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {selectedTicket.description}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', fontWeight: 800 }}>Actualizar Estado</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {['OPEN', 'RESOLVED', 'CLOSED'].map(s => (
                        <button 
                          key={s}
                          onClick={() => setEditData({ ...editData, status: s })}
                          style={{
                            padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800,
                            background: editData.status === s ? getStatusColor(s) : '#222',
                            color: editData.status === s ? '#000' : '#888', border: 'none', cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', fontWeight: 800 }}>Cambiar Prioridad</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {['low', 'medium', 'high'].map(p => (
                        <button 
                          key={p}
                          onClick={() => setEditData({ ...editData, priority: p })}
                          style={{
                            padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800,
                            background: editData.priority === p ? getPriorityColor(p) : '#222',
                            color: editData.priority === p ? '#fff' : '#888', border: 'none', cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {p === 'low' ? 'BAJA' : p === 'medium' ? 'MEDIA' : 'ALTA'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', fontWeight: 800 }}>Fecha de Entrega</label>
                    <div style={{ position: 'relative' }}>
                      <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                      <input 
                        type="date" 
                        value={editData.dueDate}
                        onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                        style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '10px' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', fontWeight: 800 }}>Responsable Asignado</label>
                    <select 
                      value={editData.assignedTo}
                      onChange={(e) => setEditData({ ...editData, assignedTo: e.target.value })}
                      style={{ width: '100%', padding: '0.8rem', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '10px' }}
                    >
                      <option value="">Pendiente de asignar</option>
                      {superadmins.map(sa => (
                        <option key={sa.id} value={sa.id}>{sa.username || sa.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', fontWeight: 800 }}>Aplicaciones Asociadas</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {apps.filter(a => a !== 'Todas').map(app => {
                        const isSelected = editData.appLabel.includes(app);
                        return (
                          <button 
                            key={app}
                            onClick={() => {
                              const newList = isSelected 
                                ? editData.appLabel.filter(l => l !== app)
                                : [...editData.appLabel, app];
                              setEditData({ ...editData, appLabel: newList });
                            }}
                            style={{
                              padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700,
                              background: isSelected ? '#10b981' : '#222',
                              color: isSelected ? '#000' : '#666', border: 'none', cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {app}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', fontWeight: 800 }}>Notas de Desarrollo / Respuesta</label>
                    <textarea 
                      value={editData.devResponse}
                      onChange={(e) => setEditData({ ...editData, devResponse: e.target.value })}
                      placeholder="Escribe la solución o notas para otros desarrolladores..."
                      style={{ width: '100%', padding: '1rem', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '12px', resize: 'none', fontSize: '0.9rem', lineHeight: '1.5' }}
                      rows={5}
                    ></textarea>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem' }}>
                <button 
                  className="btn"
                  onClick={handleUpdateTicket}
                  style={{ flex: 1.5, padding: '1.25rem', background: '#10b981', color: '#000', fontWeight: 900, borderRadius: '16px', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Confirmar Actualización
                </button>
                <button 
                  className="btn"
                  onClick={() => setSelectedTicket(null)}
                  style={{ flex: 1, padding: '1.25rem', background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 700, borderRadius: '16px', fontSize: '1.1rem' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

