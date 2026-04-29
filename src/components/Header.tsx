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
  onTabChange: (tab: 'catalog' | 'profile' | 'admin' | 'ranking') => void;
  currentView: string;
}

export const Header: React.FC<Props> = ({ 
  isLoggedIn, userRole, onLoginClick, onLogoutClick, onProfileClick, 
  onAdminClick, onRankingClick, onProClick,
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
      <header className="glass-panel animate-slide-down" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0.75rem 2rem', 
        marginBottom: '2rem',
        gap: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => onTabChange('catalog')}>
            <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '8px' }}>
              <Box color="#fff" size={20} />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--primary)', letterSpacing: '-0.5px' }}>Aim Brickslab</h1>
          </div>

          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => onTabChange('catalog')}
              style={{ 
                background: 'none', border: 'none', color: currentView === 'catalog' ? 'var(--primary)' : 'var(--text-muted)', 
                fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', textTransform: 'uppercase' 
              }}
            >
              Inicio
            </button>
            <button 
              onClick={onRankingClick}
              style={{ 
                background: 'none', border: 'none', color: currentView === 'ranking' ? 'var(--primary)' : 'var(--text-muted)', 
                fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', textTransform: 'uppercase' 
              }}
            >
              Ranking
            </button>
            <button 
              onClick={onProClick}
              style={{ 
                background: 'none', border: 'none', color: '#F59E0B', 
                fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', textTransform: 'uppercase' 
              }}
            >
              Brickslab Pro
            </button>
          </nav>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button 
            className="btn btn-outline" 
            style={{ borderColor: '#EF4444', color: '#EF4444', padding: '0.4rem 0.8rem', fontSize: '0.8rem', minHeight: '36px' }} 
            onClick={() => setShowDonationModal(true)}
          >
            <Heart size={14} fill="#EF4444" style={{ marginRight: '4px' }} /> Donar
          </button>

          {isLoggedIn ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(userRole === 'admin' || userRole === 'superadmin') && (
                <button 
                  className="btn btn-outline" 
                  style={{ borderColor: '#8B5CF6', color: '#8B5CF6', padding: '0.4rem 0.8rem', fontSize: '0.8rem', minHeight: '36px' }} 
                  onClick={onAdminClick}
                >
                  Admin
                </button>
              )}
              <button 
                className={`btn ${currentView === 'profile' ? 'btn-primary' : 'btn-outline'}`} 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', minHeight: '36px' }} 
                onClick={onProfileClick}
              >
                <User size={14} style={{ marginRight: '4px' }} /> Perfil
              </button>
              <button 
                className="btn btn-outline" 
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#F87171', padding: '0.4rem 0.8rem', fontSize: '0.8rem', minHeight: '36px' }} 
                onClick={onLogoutClick}
              >
                Salir
              </button>
            </div>
          ) : (
            <button 
              className="btn btn-primary" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', minHeight: '36px' }} 
              onClick={onLoginClick}
            >
              <LogIn size={14} style={{ marginRight: '4px' }} /> Entrar
            </button>
          )}
        </div>
      </header>

      <button
        onClick={toggleTheme}
        style={{
          position: 'fixed', bottom: '2rem', left: '2rem', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer',
          background: 'var(--accent)', border: 'none', color: 'white',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}
        aria-label="Alternar tema"
      >
        {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
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
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowDonationModal(false)}>
              ¡Entendido, gracias!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
