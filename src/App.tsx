import { useState } from 'react';
import { Header } from './components/Header';
import { Catalog } from './components/Catalog';
import { Profile } from './components/Profile';
import { ReservationModal } from './components/ReservationModal';
import { mockItems, mockUser, type CatalogItem, type UserProfile } from './data/mockData';

function App() {
  const [items, setItems] = useState<CatalogItem[]>(mockItems);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<'catalog' | 'profile'>('catalog');
  
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);

  const handleLogin = () => {
    setUser(mockUser);
  };

  const handleReserveClick = (item: CatalogItem) => {
    setSelectedItem(item);
  };

  const handleConfirmReservation = () => {
    if (selectedItem && user) {
      setItems(items.map(item => 
        item.id === selectedItem.id ? { ...item, status: 'Reservado' } : item
      ));
      
      const setInfo = `${selectedItem.type}: ${selectedItem.title}`;
      setUser({
        ...user,
        currentReservations: [...user.currentReservations, setInfo]
      });
      
      setSelectedItem(null);
    }
  };

  return (
    <div className="container">
      <Header 
        isLoggedIn={!!user} 
        onLoginClick={handleLogin} 
        onProfileClick={() => setCurrentView('profile')} 
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
        ) : (
          user && <Profile user={user} />
        )}
      </main>

      {selectedItem && (
        <ReservationModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          onConfirm={handleConfirmReservation}
          isLoggedIn={!!user}
          onLoginRequest={handleLogin}
        />
      )}
    </div>
  );
}

export default App;
