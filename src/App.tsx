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
  const [user, setUser] = useState<any>(null); // Usamos any para simplificar el mapeo que añadimos nuevo (id, email)
  const [currentView, setCurrentView] = useState<'catalog' | 'profile' | 'admin'>('catalog');
  
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/catalog`)
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(console.error);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      if (res.ok) {
        const profile = await res.json();
        setUser(profile);
        setShowLoginModal(false);
      } else {
        alert('Credenciales incorrectas');
      }
    } catch (err) {
      console.error(err);
      alert('Error en la conexión con el servidor.');
    }
  };

  const handleReserveClick = (item: CatalogItem) => {
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

  return (
    <div className="container">
      <Header 
        isLoggedIn={!!user} 
        userRole={user?.role}
        onLoginClick={() => setShowLoginModal(true)} 
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
