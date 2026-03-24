import { useState, useEffect } from 'react';
import { Header } from './components/Header';
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
  }, []);

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
      alert('Necesitas el rango "Brickslab" para reservar este artículo.');
      return;
    }
    if (item.type === 'Libro' && !user.permissions?.library) {
      alert('Necesitas el rango "Biblioteca" para reservar este artículo.');
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
              <h2 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '1rem' }}>Catálogo Local</h2>
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
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
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
    </div>
  );
}

export default App;
