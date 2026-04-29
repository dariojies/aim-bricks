import { useState, useEffect } from 'react';
import { Box, Crown, LogIn, User, Moon, Sun, Heart, Trophy, LayoutGrid } from 'lucide-react';

interface Props {
  isLoggedIn: boolean;
  userRole?: string;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onProfileClick: () => void;
  onAdminClick: () => void;
  onRankingClick: () => void;
  onProClick: () => void;
  categories: any[];
  activeCategoryId: string | null;
  onCategoryChange: (id: string | null) => void;
  onTabChange: (tab: 'catalog' | 'profile' | 'admin' | 'ranking') => void;
  currentView: string;
}

export const Header: React.FC<Props> = ({ 
  isLoggedIn, userRole, onLoginClick, onLogoutClick, onProfileClick, 
  onAdminClick, onRankingClick, onProClick,
  categories, activeCategoryId, onCategoryChange,
  onTabChange, currentView
}) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  const [showDonationModal, setShowDonationModal] = useState(false);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <>
      <header className="glass-panel animate-slide-down" style={{ padding: '1.25rem 2rem', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => { onTabChange('catalog'); onCategoryChange(null); }}>
            <div style={{ background: 'var(--secondary)', padding: '0.6rem', borderRadius: '10px' }}>
              <Box color="#fff" size={24} />
            </div>
            <h1 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Aim Brickslab</h1>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              className="btn btn-outline"
              style={{ borderColor: '#EF4444', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={() => setShowDonationModal(true)}
            >
              <Heart size={18} fill="#EF4444" /> Donar
            </button>

            {isLoggedIn ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(userRole === 'admin' || userRole === 'superadmin') && (
                  <button className={`btn ${currentView === 'admin' ? 'btn-primary' : 'btn-outline'}`} style={{ borderColor: '#8B5CF6', color: currentView === 'admin' ? '#fff' : '#8B5CF6' }} onClick={onAdminClick}>
                    Admin
                  </button>
                )}
                <button className={`btn ${currentView === 'profile' ? 'btn-primary' : 'btn-outline'}`} onClick={onProfileClick}>
                  <User size={18} /> Perfil
                </button>
                <button className="btn btn-outline" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#F87171' }} onClick={onLogoutClick}>
                  Salir
                </button>
              </div>
            ) : (
              <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={onLoginClick}>
                <LogIn size={18} /> Entrar
              </button>
            )}
          </div>
        </div>

        <div style={{ width: '100%', display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
          <button 
            onClick={() => { onTabChange('catalog'); onCategoryChange(null); }}
            style={{
              padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid transparent',
              background: currentView === 'catalog' && !activeCategoryId ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: currentView === 'catalog' && !activeCategoryId ? '#fff' : 'var(--text)',
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap'
            }}
          >
            <LayoutGrid size={18} /> Inicio
          </button>
          
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => { onTabChange('catalog'); onCategoryChange(cat.id); }}
              style={{
                padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid transparent',
                background: activeCategoryId === cat.id ? 'var(--secondary)' : 'rgba(255,255,255,0.05)',
                color: activeCategoryId === cat.id ? '#fff' : 'var(--text)',
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap'
              }}
            >
              {cat.name}
            </button>
          ))}

          <button 
            onClick={onRankingClick}
            style={{
              padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid transparent',
              background: currentView === 'ranking' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: currentView === 'ranking' ? '#fff' : '#F59E0B',
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap'
            }}
          >
            <Trophy size={18} /> Ranking
          </button>

          <button 
            onClick={onProClick}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.2))', 
              padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)', 
              color: '#FCD34D', cursor: 'pointer', transition: 'all 0.2s ease', fontWeight: 600, whiteSpace: 'nowrap'
            }}
          >
            <Crown size={20} /> Brickslab Pro
          </button>
        </div>
      </header>

      <button
        onClick={toggleTheme}
        style={{
          position: 'fixed', bottom: '2rem', left: '2rem', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '56px', height: '56px', borderRadius: '50%', cursor: 'pointer',
          background: 'var(--accent)', border: 'none', color: 'white',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}
        aria-label="Alternar tema"
      >
        {theme === 'dark' ? <Sun size={28} /> : <Moon size={28} />}
      </button>

      {showDonationModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="glass-panel animate-fade-in responsive-modal" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                <Heart size={48} color="#EF4444" fill="#EF4444" />
              </div>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', textAlign: 'center' }}>¿Tienes un set LEGO® que ya no usas?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'center', lineHeight: '1.5' }}>
              Puedes donarlo para que otros estudiantes tengan la oportunidad de aprender y disfrutar con él. Ayúdanos a hacer crecer nuestra colección pública.
            </p>
            <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--surface-border)', marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>¿Cómo donar?</h4>
              <ul style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1rem' }}>
                <li>Asegúrate de que el set esté lo más completo posible.</li>
                <li>Si tienes las instrucciones o la caja original, inclúyelas.</li>
                <li>Tráelo al local de Aim Education y entrégalo en recepción.</li>
              </ul>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowDonationModal(false)}>
              ¡Entendido, gracias!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
