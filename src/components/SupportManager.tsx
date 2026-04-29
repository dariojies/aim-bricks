import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Clock, Filter, User, Search, Calendar, Copy, FileText, RefreshCw } from 'lucide-react';

interface Ticket {
  id: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  app_label: string | string[];
  dev_response: string | null;
  created_at: string;
  due_date: string | null;
  name: string;
  surname: string;
  email: string;
  assigned_to: string | null;
  assignee_username: string | null;
}

interface Superadmin {
  id: string;
  username: string;
  name: string;
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
  const [filterPriority, setFilterPriority] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todas');
  const [filterOnlyMe, setFilterOnlyMe] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortIdOrder, setSortIdOrder] = useState<'desc' | 'asc'>('desc');
  const [sortByPriority, setSortByPriority] = useState(false);

  // Selection & Modal
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit fields
  const [devResponse, setDevResponse] = useState('');
  const [ticketPriority, setTicketPriority] = useState('low');
  const [ticketStatus, setTicketStatus] = useState('open');
  const [ticketDueDate, setTicketDueDate] = useState('');
  const [ticketAssignedId, setTicketAssignedId] = useState('');

  // Creation fields
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const priorities = ['Todas', 'Baja', 'Media', 'Alta'];
  const statuses = ['Todas', 'OPEN', 'RESOLVED', 'CLOSED'];

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
        // Robust filter for 'Aim Brickslab'
        const brickslabTickets = data.tickets.filter((t: Ticket) => {
          const rawLabel = t.app_label;
          if (Array.isArray(rawLabel)) {
            return rawLabel.some(l => String(l).includes('Aim Brickslab'));
          }
          const labelStr = String(rawLabel || '');
          return labelStr.includes('Aim Brickslab') || labelStr.includes('{Aim Brickslab}');
        });
        setTickets(brickslabTickets);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      showToast('Error al cargar tickets', 'error');
    } finally {
      setLoading(false);
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

  const handleOpenTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDevResponse(ticket.dev_response || '');
    setTicketPriority(ticket.priority || 'low');
    setTicketStatus(ticket.status || 'open');
    setTicketAssignedId(ticket.assigned_to || '');
    
    if (ticket.due_date) {
      setTicketDueDate(new Date(ticket.due_date).toISOString().split('T')[0]);
    } else {
      setTicketDueDate('');
    }
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/support/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: ticketStatus,
          priority: ticketPriority,
          devResponse,
          dueDate: ticketDueDate || null,
          assignedTo: ticketAssignedId || null,
          appLabel: selectedTicket.app_label // Keep existing labels
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Ticket actualizado correctamente');
        setSelectedTicket(null);
        fetchTickets();
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      showToast('Error al actualizar ticket', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!newSubject || !newDescription) {
      showToast('Por favor, rellena todos los campos.', 'error');
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
        showToast('Ticket creado con éxito.', 'success');
        setNewSubject('');
        setNewDescription('');
        setActiveTab('list');
        fetchTickets();
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      showToast('Error al crear el ticket.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = () => {
    if (filteredAndSortedTickets.length === 0) return;
    
    let text = `REPORTE DE TICKETS (Aim Brickslab) - ${new Date().toLocaleDateString()}\n`;
    text += `Filtros: Estado: ${filterStatus}, Prioridad: ${filterPriority}\n`;
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
      showToast('Listado copiado al portapapeles', 'info');
    });
  };

  const exportPDF = () => {
    const html = `
      <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 10px; margin-bottom: 20px; }
          .ticket { border: 1px solid #eee; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; }
          .id { font-weight: bold; color: #10b981; }
          .prio { float: right; font-weight: bold; text-transform: uppercase; font-size: 12px; }
          .subject { font-size: 18px; font-weight: bold; margin: 10px 0; }
          .meta { font-size: 12px; color: #666; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>REPORTE DE SOPORTE - AIM BRICKSLAB</h1>
          <p>Generado el ${new Date().toLocaleString()}</p>
        </div>
        ${filteredAndSortedTickets.map(t => `
          <div class="ticket">
            <span class="prio" style="color: ${t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#10b981'}">${t.priority}</span>
            <div class="id">#${t.id} - ${t.status.toUpperCase()}</div>
            <div class="subject">${t.subject}</div>
            <div class="desc">${t.description}</div>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
            <div class="meta">
              <div><strong>De:</strong> ${t.name} ${t.surname}</div>
              <div><strong>Asignado a:</strong> ${t.assignee_username || 'Pendiente'}</div>
              <div><strong>Fecha:</strong> ${new Date(t.created_at).toLocaleDateString()}</div>
              <div><strong>Vence:</strong> ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'}</div>
            </div>
            ${t.dev_response ? `<div style="margin-top:10px; font-style:italic; font-size:13px;"><strong>Respuesta:</strong> ${t.dev_response}</div>` : ''}
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const style = document.createElement('style');
    style.id = 'print-isolation-style';
    style.innerHTML = `@media print { body > * { display: none !important; } #support-print-root { display: block !important; } }`;
    document.head.appendChild(style);

    const printRoot = document.createElement('div');
    printRoot.id = 'support-print-root';
    printRoot.innerHTML = html;
    document.body.appendChild(printRoot);

    window.print();

    setTimeout(() => {
      document.getElementById('print-isolation-style')?.remove();
      document.getElementById('support-print-root')?.remove();
    }, 1000);
  };

  const filteredAndSortedTickets = tickets
    .filter(t => {
      const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            String(t.id).includes(searchTerm);
      const matchesPriority = filterPriority === 'Todas' || 
                              (filterPriority === 'Baja' && t.priority === 'low') ||
                              (filterPriority === 'Media' && t.priority === 'medium') ||
                              (filterPriority === 'Alta' && t.priority === 'high');
      const matchesStatus = filterStatus === 'Todas' || t.status.toUpperCase() === filterStatus;
      const matchesUser = !filterOnlyMe || t.assigned_to === userId;
      
      return matchesSearch && matchesPriority && matchesStatus && matchesUser;
    })
    .sort((a, b) => {
      if (sortByPriority) {
        const weights: any = { high: 3, medium: 2, low: 1 };
        const weightA = weights[a.priority] || 0;
        const weightB = weights[b.priority] || 0;
        if (weightA !== weightB) return weightB - weightA;
      }
      return sortIdOrder === 'desc' ? b.id - a.id : a.id - b.id;
    });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      backgroundColor: 'var(--background)',
      color: 'var(--text)',
      display: 'flex', flexDirection: 'column',
      animation: 'slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem 2rem',
        borderBottom: '1px solid var(--surface-border)',
        background: 'var(--surface)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button 
            onClick={onClose} 
            className="btn"
            style={{ 
              padding: '0.5rem', borderRadius: '50%', background: 'transparent', 
              color: 'var(--text)', border: '1px solid var(--surface-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', height: '40px'
            }}
          >
            <X size={20} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle className="text-accent" /> Panel de Soporte
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            className="btn"
            onClick={fetchTickets}
            style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(128,128,128,0.1)', color: 'var(--text)', border: 'none' }}
            title="Refrescar datos"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--background)', padding: '0.4rem', borderRadius: '10px', border: '1px solid var(--surface-border)' }}>
            <button 
              className={`btn ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
              style={{ 
                background: activeTab === 'list' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'list' ? '#fff' : 'var(--text-muted)',
                padding: '0.4rem 1.2rem', borderRadius: '8px', border: 'none', fontSize: '0.9rem'
              }}
            >
              Listado
            </button>
            <button 
              className={`btn ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
              style={{ 
                background: activeTab === 'create' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'create' ? '#fff' : 'var(--text-muted)',
                padding: '0.4rem 1.2rem', borderRadius: '8px', border: 'none', fontSize: '0.9rem'
              }}
            >
              Nuevo
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div style={{
          position: 'fixed', top: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'success' ? '#10b981' : notification.type === 'error' ? '#ef4444' : '#3B82F6',
          color: '#fff', padding: '0.75rem 2rem', borderRadius: '12px', fontWeight: 700, zIndex: 4000,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'slideDown 0.3s ease-out'
        }}>
          {notification.message}
        </div>
      )}

      {activeTab === 'list' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Filters Bar */}
          <div style={{ padding: '1rem 2rem', background: 'var(--surface)', borderBottom: '1px solid var(--surface-border)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado:</span>
                  {statuses.map(s => (
                    <button 
                      key={s} 
                      onClick={() => setFilterStatus(s)}
                      style={{ 
                        padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
                        background: filterStatus === s ? 'var(--primary)' : 'rgba(128,128,128,0.1)',
                        color: filterStatus === s ? '#fff' : 'var(--text)',
                        border: '1px solid ' + (filterStatus === s ? 'var(--primary)' : 'var(--surface-border)')
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Prioridad:</span>
                  {priorities.map(p => (
                    <button 
                      key={p} 
                      onClick={() => setFilterPriority(p)}
                      style={{ 
                        padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
                        background: filterPriority === p ? 'var(--primary)' : 'rgba(128,128,128,0.1)',
                        color: filterPriority === p ? '#fff' : 'var(--text)',
                        border: '1px solid ' + (filterPriority === p ? 'var(--primary)' : 'var(--surface-border)')
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn" 
                  onClick={exportPDF}
                  style={{ background: '#10b981', color: '#fff', fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', border: 'none' }}
                >
                  <FileText size={16} /> PDF
                </button>
                <button 
                  className="btn" 
                  onClick={copyToClipboard}
                  style={{ background: '#3B82F6', color: '#fff', fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', border: 'none' }}
                >
                  <Copy size={16} /> Copiar
                </button>
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por ID, asunto o descripción..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    width: '100%', padding: '0.6rem 1rem 0.6rem 2.8rem', borderRadius: '10px', 
                    background: 'var(--background)', border: '1px solid var(--surface-border)', color: 'var(--text)' 
                  }}
                />
              </div>

              <button 
                className="btn" 
                onClick={() => setFilterOnlyMe(!filterOnlyMe)}
                style={{ 
                  background: filterOnlyMe ? 'var(--primary)' : 'var(--surface)',
                  color: filterOnlyMe ? '#fff' : 'var(--text)', border: '1px solid var(--surface-border)',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
                }}
              >
                <User size={16} fill={filterOnlyMe ? "white" : "none"} /> Mis Tareas
              </button>

              <button 
                className="btn" 
                onClick={() => setSortIdOrder(sortIdOrder === 'desc' ? 'asc' : 'desc')}
                style={{ 
                  background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--surface-border)',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
                }}
              >
                <Filter size={16} /> ID: {sortIdOrder.toUpperCase()}
              </button>

              <button 
                className="btn" 
                onClick={() => setSortByPriority(!sortByPriority)}
                style={{ 
                  background: sortByPriority ? '#f59e0b' : 'var(--surface)',
                  color: sortByPriority ? '#000' : 'var(--text)', border: '1px solid var(--surface-border)',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 700
                }}
              >
                <AlertCircle size={16} /> Prioridad
              </button>
            </div>
          </div>

          {/* Tickets List */}
          <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                <div className="premium-loader"></div>
              </div>
            ) : filteredAndSortedTickets.length > 0 ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {filteredAndSortedTickets.map(ticket => (
                  <div 
                    key={ticket.id} 
                    onClick={() => handleOpenTicket(ticket)}
                    style={{ 
                      background: 'var(--surface)', padding: '1.5rem', borderRadius: '15px', border: '1px solid var(--surface-border)',
                      borderLeft: `6px solid ${
                        ticket.priority === 'high' ? '#ef4444' : 
                        ticket.priority === 'medium' ? '#f59e0b' : '#10b981'
                      }`,
                      cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>#{ticket.id}</span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {(Array.isArray(ticket.app_label) ? ticket.app_label : [ticket.app_label]).map(l => (
                            <span key={String(l)} style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                              {String(l)}
                            </span>
                          ))}
                        </div>
                        <span style={{ 
                          background: ticket.priority === 'high' ? 'rgba(239,68,68,0.1)' : ticket.priority === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                          color: ticket.priority === 'high' ? '#ef4444' : ticket.priority === 'medium' ? '#f59e0b' : '#10b981',
                          padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase'
                        }}>
                          {ticket.priority}
                        </span>
                      </div>
                      <span style={{ 
                        fontWeight: 800, fontSize: '0.75rem',
                        color: ticket.status === 'open' ? '#f59e0b' : ticket.status === 'resolved' ? '#10b981' : '#6b7280'
                      }}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>{ticket.subject}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ticket.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                         <span>De: <strong>{ticket.name} {ticket.surname}</strong></span>
                         <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> {new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                      {ticket.assignee_username && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(128,128,128,0.1)', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
                          <User size={14} /> <span>{ticket.assignee_username}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '6rem 2rem', opacity: 0.5 }}>
                 <AlertCircle size={48} style={{ margin: '0 auto 1rem auto' }} />
                 <p style={{ fontSize: '1.2rem' }}>No se encontraron tickets con los filtros actuales.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '4rem 2rem', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             <h2 style={{ fontSize: '2rem', textAlign: 'center' }}>Crear Nuevo Reporte</h2>
             <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Esta sección te permite registrar una tarea o bug directamente.</p>
             <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '15px', border: '1px solid var(--surface-border)' }}>
               <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                 <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Asunto</label>
                 <input 
                   type="text" 
                   className="input" 
                   placeholder="Ej: Bug en el buscador" 
                   value={newSubject}
                   onChange={(e) => setNewSubject(e.target.value)}
                   style={{ width: '100%', padding: '0.8rem', background: 'var(--background)', border: '1px solid var(--surface-border)', color: 'var(--text)', borderRadius: '8px' }} 
                 />
               </div>
               <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                 <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Descripción</label>
                 <textarea 
                   className="input" 
                   rows={5} 
                   placeholder="Detalla el problema..." 
                   value={newDescription}
                   onChange={(e) => setNewDescription(e.target.value)}
                   style={{ width: '100%', padding: '0.8rem', background: 'var(--background)', border: '1px solid var(--surface-border)', color: 'var(--text)', borderRadius: '8px', resize: 'none' }}
                 ></textarea>
               </div>
               <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                 <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                   📌 Este reporte será etiquetado automáticamente como "Aim Brickslab".
                 </p>
               </div>
               <button 
                 className="btn" 
                 onClick={handleSubmitReport}
                 disabled={isCreating}
                 style={{ width: '100%', padding: '1rem', background: 'var(--primary)', color: '#fff', fontWeight: 700, borderRadius: '8px', opacity: isCreating ? 0.7 : 1, border: 'none' }}
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
          position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem'
        }}>
          <div style={{ 
            width: '100%', maxWidth: '800px', maxHeight: '90vh', background: 'var(--surface)', 
            borderRadius: '20px', border: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Ticket #{selectedTicket.id}</h3>
               <button onClick={() => setSelectedTicket(null)} className="btn" style={{ padding: '0.5rem', background: 'transparent', color: 'var(--text)', border: 'none' }}><X size={24} /></button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                 <div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Asunto</label>
                      <div style={{ fontSize: '1.4rem', fontWeight: 600, marginTop: '0.4rem' }}>{selectedTicket.subject}</div>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Descripción</label>
                      <div style={{ whiteSpace: 'pre-wrap', marginTop: '0.8rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>{selectedTicket.description}</div>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Respuesta de Desarrollo</label>
                      <textarea 
                        value={devResponse}
                        onChange={(e) => setDevResponse(e.target.value)}
                        placeholder="Escribe una respuesta técnica..."
                        style={{ 
                          width: '100%', marginTop: '0.8rem', padding: '1rem', background: 'var(--background)', 
                          border: '1px solid var(--surface-border)', color: 'var(--text)', borderRadius: '12px', resize: 'none'
                        }}
                        rows={6}
                      />
                    </div>
                 </div>

                 <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '15px', border: '1px solid var(--surface-border)', height: 'fit-content' }}>
                    <div style={{ marginBottom: '1.2rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado</label>
                      <select 
                        value={ticketStatus} 
                        onChange={(e) => setTicketStatus(e.target.value)}
                        style={{ width: '100%', marginTop: '0.4rem', padding: '0.6rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text)', borderRadius: '8px' }}
                      >
                        <option value="open">Abierto</option>
                        <option value="resolved">Resuelto</option>
                        <option value="closed">Cerrado</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: '1.2rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Prioridad</label>
                      <select 
                        value={ticketPriority} 
                        onChange={(e) => setTicketPriority(e.target.value)}
                        style={{ width: '100%', marginTop: '0.4rem', padding: '0.6rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text)', borderRadius: '8px' }}
                      >
                        <option value="low">Baja</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: '1.2rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Asignado a</label>
                      <select 
                        value={ticketAssignedId} 
                        onChange={(e) => setTicketAssignedId(e.target.value)}
                        style={{ width: '100%', marginTop: '0.4rem', padding: '0.6rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text)', borderRadius: '8px' }}
                      >
                        <option value="">Sin asignar</option>
                        {superadmins.map(sa => (
                          <option key={sa.id} value={sa.id}>{sa.username || sa.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginBottom: '1.2rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fecha de Entrega</label>
                      <div style={{ position: 'relative', marginTop: '0.4rem' }}>
                        <Calendar style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} size={16} />
                        <input 
                          type="date" 
                          value={ticketDueDate} 
                          onChange={(e) => setTicketDueDate(e.target.value)}
                          style={{ width: '100%', padding: '0.6rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text)', borderRadius: '8px' }}
                        />
                      </div>
                    </div>

                    <button 
                      className="btn"
                      onClick={handleUpdateTicket}
                      disabled={isUpdating}
                      style={{ width: '100%', marginTop: '1rem', background: 'var(--primary)', color: '#fff', fontWeight: 700, border: 'none' }}
                    >
                      {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
