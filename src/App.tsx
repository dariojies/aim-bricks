import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ArrowUp, MessageCircle, AlertCircle, CheckCircle2, X, Plus } from 'lucide-react';
import { Catalog } from './components/Catalog';
import { Profile } from './components/Profile';
import { ReservationModal } from './components/ReservationModal';
import { AdminDashboard } from './components/AdminDashboard';
import { Ranking } from './components/Ranking';
import { type CatalogItem } from './data/mockData';

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

function App() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('aim_bricks_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentView, setCurrentView] = useState<'catalog' | 'profile' | 'admin' | 'ranking'>('catalog');

  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [forcePasswordNew1, setForcePasswordNew1] = useState('');
  const [forcePasswordNew2, setForcePasswordNew2] = useState('');

  const [showRankAlert, setShowRankAlert] = useState<{ show: boolean, type: 'Brickslab' | 'Biblioteca' | null }>({ show: false, type: null });
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activePoll, setActivePoll] = useState<any>(null);

  // Support State
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportDesc, setSupportDesc] = useState('');
  const [supportStatus, setSupportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showProModal, setShowProModal] = useState(false);

  const syncUserSession = async () => {
    const saved = localStorage.getItem('aim_bricks_user');
    if (!saved) return;
    try {
      const u = JSON.parse(saved);
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id })
      });
      const data = await res.json();
      if (!data.error) {
        setUser(data);
        localStorage.setItem('aim_bricks_user', JSON.stringify(data));
      }
    } catch (e) { console.error('Error syncing session:', e); }
  };

  useEffect(() => {
    loadCatalog();
    syncUserSession();

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);

    const fetchPoll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/polls`);
        if (res.ok) setActivePoll(await res.json());
      } catch (e) { console.error(e); }
    };
    fetchPoll();

    const catalogInterval = setInterval(() => {
      loadCatalog();
      fetchPoll();
      syncUserSession();
    }, 10000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(catalogInterval);
    };
  }, []);

  useEffect(() => {
    // Logic removed in favor of direct iframe embed for reliability
  }, [showEnrollmentModal]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadCatalog = async () => {
    try {
      const res = await fetch(`${API_URL}/api/catalog`);
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const parsed = await res.json();
      if (res.ok) {
        const userProfile = parsed.profile || parsed;
        setUser(userProfile);
        localStorage.setItem('aim_bricks_user', JSON.stringify(userProfile));
        if (parsed.token) localStorage.setItem('aim_bricks_token', parsed.token);

        setShowLoginModal(false);
        setLoginEmail('');
        setLoginPassword('');
      } else {
        alert(parsed.error || 'Autenticación fallida');
      }
    } catch (err) {
      console.error(err);
      alert('Error en la conexión con el servidor.');
    }
  };

  const handleForcePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forcePasswordNew1 !== forcePasswordNew2) {
      alert('Las contraseñas no coinciden.');
      return;
    }
    if (forcePasswordNew1.length < 4) {
      alert('La contraseña es demasiado corta.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/force-password-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newPassword: forcePasswordNew1 })
      });
      if (res.ok) {
        const updatedUser = { ...user, requiresPasswordChange: false };
        setUser(updatedUser);
        localStorage.setItem('aim_bricks_user', JSON.stringify(updatedUser));
        setForcePasswordNew1('');
        setForcePasswordNew2('');
        alert('Contraseña actualizada correctamente. ¡Bienvenido de nuevo!');
      } else {
        alert('Error al actualizar la contraseña.');
      }
    } catch (err) {
      console.error(err);
      alert('Error en la conexión con el servidor.');
    }
  };

  const handleReserveClick = async (item: CatalogItem) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (item.type === 'Aim Brickslab' && !user.permissions?.brickslab) {
      setShowRankAlert({ show: true, type: 'Brickslab' });
      return;
    }
    if (item.type === 'Libro' && !user.permissions?.library) {
      setShowRankAlert({ show: true, type: 'Biblioteca' });
      return;
    }

    setSelectedItem(item);
  };

  const handleConfirmReservation = async () => {
    if (selectedItem && user) {
      try {
        const res = await fetch(`${API_URL}/api/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, itemId: selectedItem.id, type: selectedItem.type })
        });

        const data = await res.json();

        if (res.ok) {
          loadCatalog();
          fetch(`${API_URL}/api/auth/me`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
          }).then(r => r.json()).then(newData => {
            if (!newData.error) {
              setUser(newData);
              localStorage.setItem('aim_bricks_user', JSON.stringify(newData));
            }
          });

          setSelectedItem(null);
        } else {
          alert(data.error || 'Hubo un error al reservar el artículo.');
        }
      } catch (err) {
        console.error(err);
        alert('Error en la conexión con el servidor.');
      }
    }
  };

  const handleCancelReservation = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta reserva?')) return;
    try {
      const res = await fetch(`${API_URL}/api/reservations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadCatalog();
        if (user) {
          fetch(`${API_URL}/api/auth/me`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
          }).then(r => r.json()).then(newData => {
            if (!newData.error) {
              setUser(newData);
              localStorage.setItem('aim_bricks_user', JSON.stringify(newData));
            }
          });
        }
      } else {
        const data = await res.json();
        alert(data.error || 'No se pudo cancelar la reserva.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red.');
    }
  };

  const handleReportPieces = async (brickslabId: string, description: string) => {
    try {
      const res = await fetch(`${API_URL}/api/pieces/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, brickslabId, description })
      });
      if (res.ok) alert('Reporte enviado correctamente. ¡Muchas gracias!');
      else {
        const data = await res.json();
        alert(data.error || 'No se pudo enviar el reporte.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject || !supportDesc) return;
    
    setSupportStatus('loading');
    try {
      const res = await fetch(`${API_URL}/api/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || null, subject: supportSubject, description: supportDesc })
      });
      if (!res.ok) throw new Error('Error al enviar la tarea');
      
      setSupportStatus('success');
      setTimeout(() => {
        setSupportStatus('idle');
        setShowSupportModal(false);
        setSupportSubject('');
        setSupportDesc('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setSupportStatus('error');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('catalog');
    localStorage.removeItem('aim_bricks_user');
    localStorage.removeItem('aim_bricks_token');
  };

  return (
    <div className="container">
      {(!user || !user.permissions?.brickslab) && (
        <div style={{
          background: 'linear-gradient(90deg, #10B981, #3B82F6)',
          color: 'white',
          padding: '0.6rem 1rem',
          textAlign: 'center',
          fontSize: '0.9rem',
          fontWeight: 600,
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
        }}>
          <span>🚀 ¿Quieres reservar sets de LEGO®? Solicita tu acceso a Aim Brickslab ahora</span>
          <button
            onClick={() => setShowEnrollmentModal(true)}
            style={{
              background: 'white',
              color: '#10B981',
              border: 'none',
              padding: '0.3rem 0.8rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700
            }}
          >
            Saber más
          </button>
        </div>
      )}

      <Header
        isLoggedIn={!!user}
        userRole={user?.role}
        onLoginClick={() => setShowLoginModal(true)}
        onLogoutClick={handleLogout}
        onProfileClick={() => setCurrentView('profile')}
        onAdminClick={() => setCurrentView('admin')}
        onHomeClick={() => setCurrentView('catalog')}
        onRankingClick={() => setCurrentView('ranking')}
      />

      <main className="animate-fade-in">
        {currentView === 'catalog' ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 className="text-gradient hero-title">Catálogo Local</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
                Explora y reserva tus Aim Brickslabs y Libros favoritos para disfrutar en nuestro local.
              </p>
            </div>
            {activePoll && (
              <div className="glass-panel animate-fade-in" style={{ marginBottom: '3rem', padding: '2rem', border: '2px solid var(--accent)' }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--accent)', textAlign: 'center' }}>📊 Cuestionario Activo: {activePoll.title}</h3>
                {activePoll.description && <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{activePoll.description}</p>}

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {activePoll.options.map((opt: any) => (
                    <div key={opt.id} style={{ flex: '1 1 200px', maxWidth: '300px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <img src={opt.imageUrl} alt={opt.title} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                      <div style={{ padding: '1rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <h4 style={{ fontWeight: 600 }}>{opt.title}</h4>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Votos actuales: {opt.votes}</span>
                        <button
                          className="btn btn-primary"
                          style={{ marginTop: 'auto' }}
                          onClick={async () => {
                            if (!user) return setShowLoginModal(true);
                            const res = await fetch(`${API_URL}/api/polls/vote`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: user.id, optionId: opt.id })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              alert('¡Voto registrado con éxito!');
                              const resPoll = await fetch(`${API_URL}/api/polls`);
                              if (resPoll.ok) setActivePoll(await resPoll.json());
                            } else {
                              alert(data.error || 'Error al votar.');
                            }
                          }}
                        >
                          Votar por este set
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Catalog
              items={items}
              onReserveClick={handleReserveClick}
              onProAlert={() => setShowProModal(true)}
            />
          </>
        ) : currentView === 'profile' && user ? (
          <Profile user={user} onCancelReservation={handleCancelReservation} onReportPieces={handleReportPieces} />
        ) : currentView === 'admin' && (user?.role === 'admin' || user?.role === 'superadmin') ? (
          <AdminDashboard />
        ) : currentView === 'ranking' ? (
          <Ranking />
        ) : null}
      </main>

      {/* Modal de Reserva */}
      {selectedItem && (
        <ReservationModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onConfirm={handleConfirmReservation}
          isLoggedIn={!!user}
          onLoginRequest={() => {
            setSelectedItem(null);
            setShowLoginModal(true);
          }}
        />
      )}

      {/* Modal de Anuncio Brickslab Pro */}
      {showProModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="glass-panel animate-fade-in" style={{ 
            width: '100%', maxWidth: '400px', padding: '2.5rem 2rem', textAlign: 'center',
            border: '1px solid rgba(212, 175, 55, 0.5)', position: 'relative',
            background: 'linear-gradient(180deg, #1a1a1a, #0a0a0a)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 20px rgba(212, 175, 55, 0.1)'
          }}>
            <button 
              onClick={() => setShowProModal(false)}
              style={{ 
                position: 'absolute', top: '1.25rem', right: '1.25rem',
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center',
                justifyContent: 'center', transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            >
              <X size={24} />
            </button>
            
            <div style={{ 
              width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, #D4AF37, #FBBF24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
              boxShadow: '0 0 25px rgba(212, 175, 55, 0.4)'
            }}>
              <Plus size={36} color="#000" strokeWidth={3} />
            </div>

            <h2 style={{ 
              fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', 
              color: '#FBBF24', letterSpacing: '-0.02em'
            }}>
              Brickslab Pro
            </h2>
            
            <p style={{ color: '#fff', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              La posibilidad de reservar sets para montar en casa llegará próximamente con la versión <strong>Brickslab Pro</strong>.
            </p>

            <button 
              className="btn" 
              onClick={() => setShowProModal(false)}
              style={{ 
                width: '100%', padding: '1rem', 
                background: 'linear-gradient(135deg, #D4AF37, #FBBF24)',
                color: '#000', fontWeight: 800, border: 'none', borderRadius: '12px',
                fontSize: '1rem', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal de Login Básico */}
      {showLoginModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 60, padding: '1rem'
        }}>
          <div className="glass-panel animate-fade-in responsive-modal" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', textAlign: 'center' }}>Iniciar Sesión</h2>
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                required
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                required
              />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowLoginModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Entrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cambio de Contraseña Obligatorio */}
      {user?.requiresPasswordChange && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="glass-panel animate-fade-in responsive-modal" style={{ width: '100%', maxWidth: '450px', padding: '2rem', border: '1px solid var(--accent)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', textAlign: 'center', color: 'var(--accent)' }}>Acción Requerida</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
              Un administrador ha restablecido tu contraseña temporalmente. Por motivos de seguridad, debes ingresar una nueva contraseña personal para continuar.
            </p>
            <form onSubmit={handleForcePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nueva Contraseña</label>
                <input
                  type="password"
                  value={forcePasswordNew1}
                  onChange={e => setForcePasswordNew1(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Repetir Contraseña</label>
                <input
                  type="password"
                  value={forcePasswordNew2}
                  onChange={e => setForcePasswordNew2(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>Guardar Nueva Clave</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Aviso de Rango */}
      {showRankAlert.show && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 60, padding: '1rem'
        }}>
          <div className="glass-panel animate-fade-in responsive-modal" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                width: '60px', height: '60px', background: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444', borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 1rem auto'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Acceso Restringido</h2>
              <p style={{ color: 'var(--text-muted)' }}>
                Necesitas el rango <strong>{showRankAlert.type}</strong> para reservar este artículo.
              </p>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                Por favor, dirígete a <strong>Secretaría</strong> para informarte sobre cómo obtener acceso a las reservas.
              </p>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => setShowRankAlert({ show: false, type: null })}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal de Inscripción HubSpot */}
      {showEnrollmentModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="glass-panel animate-fade-in responsive-modal" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem' }}>Solicitud de Inscripción</h2>
              <button
                className="btn btn-outline"
                onClick={() => setShowEnrollmentModal(false)}
                style={{ padding: '0.25rem 0.75rem' }}
              >
                Cerrar
              </button>
            </div>
            <div id="hubspot-form-container" style={{ minHeight: '600px' }}>
              <iframe
                src="https://share-eu1.hsforms.com/2PTjFBJ03SICw-tO1NDWjUQ2fimav"
                width="100%"
                height="600"
                frameBorder="0"
                style={{ borderRadius: '8px' }}
                title="Solicitud de Inscripción"
              ></iframe>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem', textAlign: 'center' }}>
              Procesado de forma segura a través de HubSpot CRM.
            </p>
          </div>
        </div>
      )}

      {/* Floating Scroll to Top button */}
      {showScrollTop && (
        <button
          className="btn"
          onClick={scrollToTop}
          style={{
            position: 'fixed', bottom: '6.5rem', right: '1.5rem', zIndex: 90,
            width: '60px', height: '60px', borderRadius: '50%', padding: 0,
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)',
            background: 'linear-gradient(135deg, #10B981, #3B82F6)',
            color: 'white',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1) translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(16, 185, 129, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(16, 185, 129, 0.4)';
          }}
          aria-label="Volver arriba"
        >
          <ArrowUp size={28} color="white" />
        </button>
      )}

      {/* Floating Support Button */}
      <button 
        className="btn" 
        onClick={() => setShowSupportModal(true)}
        style={{ 
          position: 'fixed', bottom: '2rem', right: '1.5rem', zIndex: 90, 
          width: '60px', height: '60px', borderRadius: '50%', padding: 0, 
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)',
          background: 'linear-gradient(135deg, #10B981, #3B82F6)',
          color: 'white',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(16, 185, 129, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(16, 185, 129, 0.4)';
        }}
        aria-label="Soporte"
        title="Enviar ticket de soporte"
      >
        <MessageCircle size={28} color="white" />
      </button>

      {/* Support Modal */}
      {showSupportModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="glass-panel animate-fade-in responsive-modal" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <button 
              className="btn-icon" 
              onClick={() => setShowSupportModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}
            >
              <X size={18} />
            </button>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageCircle size={24} className="text-accent" /> Soporte Técnico
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                ¿Has encontrado algún problema? Envíanos un ticket.
              </p>
            </div>

            {supportStatus === 'success' && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
                <CheckCircle2 size={20} />
                <strong>¡Ticket enviado con éxito!</strong>
              </div>
            )}

            {supportStatus === 'error' && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                <AlertCircle size={20} />
                <strong>Error al enviar el ticket</strong>
              </div>
            )}

            <form onSubmit={handleSupportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Asunto *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Problema con una reserva"
                  value={supportSubject}
                  onChange={e => setSupportSubject(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Descripción *</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Explica el problema que has encontrado..."
                  value={supportDesc}
                  onChange={e => setSupportDesc(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', resize: 'none' }}
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={supportStatus === 'loading'}
                style={{ marginTop: '0.5rem' }}
              >
                {supportStatus === 'loading' ? 'Enviando...' : 'Enviar Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
