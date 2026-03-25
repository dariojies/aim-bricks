import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ArrowUp } from 'lucide-react';
import { Catalog } from './components/Catalog';
import { Profile } from './components/Profile';
import { ReservationModal } from './components/ReservationModal';
import { AdminDashboard } from './components/AdminDashboard';
import { type CatalogItem } from './data/mockData';

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

function App() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('aim_bricks_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentView, setCurrentView] = useState<'catalog' | 'profile' | 'admin'>('catalog');
  
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [showRankAlert, setShowRankAlert] = useState<{show: boolean, type: 'Brickslab' | 'Biblioteca' | null}>({show: false, type: null});

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    loadCatalog();
    
    // Auto-sync session
    const saved = localStorage.getItem('aim_bricks_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        fetch(`${API_URL}/api/auth/me`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: u.id })
        }).then(r => r.json()).then(data => {
          if (!data.error) {
            setUser(data);
            localStorage.setItem('aim_bricks_user', JSON.stringify(data));
          }
        }).catch(console.error);
      } catch (e) { console.error(e); }
    }

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const handleReserveClick = async (item: CatalogItem) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (item.type === 'Aim Brickslab' && !user.permissions?.brickslab) {
      setShowRankAlert({show: true, type: 'Brickslab'});
      return;
    }
    if (item.type === 'Libro' && !user.permissions?.library) {
      setShowRankAlert({show: true, type: 'Biblioteca'});
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, type: item.type, itemId: item.id })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'No se pudo completar la reserva.');
        return;
      }
      
      setSelectedItem(item);
      loadCatalog(); // Refresh catalog stock immediately
      
      // Auto-sync User History to show the new reservation
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
      
    } catch (err) {
      console.error(err);
      alert('Error en conexión con el servidor.');
    }
  };

  const handleConfirmReservation = async () => {
    if (selectedItem && user) {
      try {
        const res = await fetch(`${API_URL}/api/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, itemId: selectedItem.id, type: selectedItem.type })
        });
        
        if (res.ok) {
          const { items: updatedItems } = await res.json();
          setItems(updatedItems);
          
          setUser({
            ...user,
            currentReservations: [...user.currentReservations, `${selectedItem.type}: ${selectedItem.title}`]
          });
          
          setSelectedItem(null);
        } else {
          alert('Hubo un error o el objeto ya está reservado.');
        }
      } catch (err) {
        console.error(err);
      }
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
      <Header 
        isLoggedIn={!!user} 
        userRole={user?.role}
        onLoginClick={() => setShowLoginModal(true)} 
        onLogoutClick={handleLogout}
        onProfileClick={() => setCurrentView('profile')} 
        onAdminClick={() => setCurrentView('admin')}
        onHomeClick={() => setCurrentView('catalog')}
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
            <Catalog items={items} onReserveClick={handleReserveClick} />
          </>
        ) : currentView === 'profile' && user ? (
          <Profile user={user} />
        ) : currentView === 'admin' && (user?.role === 'admin' || user?.role === 'superadmin') ? (
          <AdminDashboard />
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
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
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
              onClick={() => setShowRankAlert({show: false, type: null})}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Floating Scroll to Top button */}
      {showScrollTop && (
        <button 
          className="btn btn-primary scroll-to-top" 
          onClick={scrollToTop}
          style={{ 
            position: 'fixed', bottom: '2rem', right: '1.5rem', zIndex: 90, 
            width: '50px', height: '50px', borderRadius: '50%', padding: 0, 
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)' 
          }}
          aria-label="Volver arriba"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </div>
  );
}

export default App;
