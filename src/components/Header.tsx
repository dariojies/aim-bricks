import { useState } from 'react';
import { Box, LogIn, User, Heart, Trophy, Crown } from 'lucide-react';

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
  const [showDonationModal, setShowDonationModal] = useState(false);

  const btnStyle = {
    padding: '0.4rem 0.75rem',
    borderRadius: '10px',
    border: '1px solid var(--surface-border)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text)',
    fontWeight: 600,
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minHeight: '34px',
    whiteSpace: 'nowrap' as const
  };

  const activeBtnStyle = {
    ...btnStyle,
    borderColor: 'var(--primary)',
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--primary)'
  };

  return (
    <>
      <header className="glass-panel animate-slide-down" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0.6rem 1.5rem', 
        marginBottom: '2rem',
        gap: '1rem',
        overflowX: 'auto',
        scrollbarWidth: 'none'
      }}>
        {/* Left: Logo */}
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', flexShrink: 0 }} 
          onClick={() => onTabChange('catalog')}
        >
          <div style={{ background: 'var(--primary)', padding: '0.35rem', borderRadius: '8px' }}>
            <Box color="#fff" size={18} />
          </div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--primary)', letterSpacing: '-0.5px' }}>Aim Brickslab</h1>
        </div>

        {/* Right: All Buttons in ONE line */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
          {userRole !== 'superadmin' && currentView !== 'admin' && (
            <>
              <button 
                style={{ ...btnStyle, borderColor: 'rgba(245, 158, 11, 0.3)', color: '#F59E0B' }} 
                onClick={onProClick}
              >
                <Crown size={14} color="#F59E0B" /> Premium: ¡Llévalo a casa!
              </button>

              <button 
                style={{ ...btnStyle, borderColor: 'rgba(239, 68, 68, 0.3)', color: '#EF4444' }} 
                onClick={() => setShowDonationModal(true)}
              >
                <Heart size={14} fill="#EF4444" /> Dona un set LEGO®
              </button>
            </>
          )}

          <button 
            style={currentView === 'ranking' ? activeBtnStyle : btnStyle} 
            onClick={onRankingClick}
          >
            <Trophy size={14} color="#F59E0B" /> Ranking
          </button>

          {isLoggedIn ? (
            <>
              {(userRole === 'owner' || userRole === 'admin' || userRole === 'superadmin') && (
                <button 
                  style={{ ...btnStyle, borderColor: '#8B5CF6', color: '#8B5CF6' }} 
                  onClick={onAdminClick}
                >
                  Admin
                </button>
              )}
              <button 
                style={currentView === 'profile' ? activeBtnStyle : btnStyle} 
                onClick={onProfileClick}
              >
                <User size={14} /> Mi Perfil
              </button>
              <button 
                style={{ ...btnStyle, color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.2)' }} 
                onClick={onLogoutClick}
              >
                Cerrar Sesión
              </button>
            </>
          ) : (
            <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff', border: 'none' }} onClick={onLoginClick}>
              <LogIn size={14} /> Iniciar Sesión
            </button>
          )}
        </div>
      </header>


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
