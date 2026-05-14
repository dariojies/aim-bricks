import { useState } from 'react';
import { LogIn, User, Heart, Trophy, Crown, Menu, X } from 'lucide-react';

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobile = () => setMobileNavOpen(false);

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
    background: 'rgba(82, 51, 168, 0.1)',
    color: 'var(--primary)'
  };

  const isAdmin = userRole === 'owner' || userRole === 'profesor' || userRole === 'superadmin';
  const isMember = !['profesor', 'owner', 'superadmin'].includes(userRole || '');

  return (
    <>
      <header className="glass-panel animate-slide-down app-header">
        {/* Logo */}
        <div className="app-header-logo" onClick={() => { closeMobile(); onTabChange('catalog'); }}>
          <img src="/logo.svg" alt="Shelfie" style={{ width: '36px', height: '36px', display: 'block', flexShrink: 0 }} />
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--primary)', letterSpacing: '-0.5px' }}>Shelfie</h1>
        </div>

        {/* Desktop buttons */}
        <div className="app-header-actions">
          {isMember && (
            <>
              <button style={{ ...btnStyle, borderColor: 'rgba(245, 158, 11, 0.3)', color: '#F59E0B' }} onClick={onProClick}>
                <Crown size={14} color="#F59E0B" /> Premium: ¡Llévalo a casa!
              </button>
              <button style={{ ...btnStyle, borderColor: 'rgba(239, 68, 68, 0.3)', color: '#EF4444' }} onClick={() => setShowDonationModal(true)}>
                <Heart size={14} fill="#EF4444" /> Dona un set LEGO®
              </button>
            </>
          )}
          <button style={currentView === 'ranking' ? activeBtnStyle : btnStyle} onClick={onRankingClick}>
            <Trophy size={14} color="#F59E0B" /> Ranking
          </button>
          {isLoggedIn ? (
            <>
              {isAdmin && (
                <button
                  style={currentView === 'admin'
                    ? { ...activeBtnStyle, borderColor: '#8B5CF6', color: '#8B5CF6', background: 'rgba(139, 92, 246, 0.1)' }
                    : { ...btnStyle, borderColor: '#8B5CF6', color: '#8B5CF6' }}
                  onClick={onAdminClick}
                >
                  Admin
                </button>
              )}
              <button style={currentView === 'profile' ? activeBtnStyle : btnStyle} onClick={onProfileClick}>
                <User size={14} /> Mi Perfil
              </button>
              <button style={{ ...btnStyle, color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={onLogoutClick}>
                Cerrar Sesión
              </button>
            </>
          ) : (
            <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff', border: 'none' }} onClick={onLoginClick}>
              <LogIn size={14} /> Iniciar Sesión
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="app-header-burger" onClick={() => setMobileNavOpen(o => !o)} aria-label="Menú">
          {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="app-mobile-overlay" onClick={closeMobile}>
          <div className="app-mobile-panel" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>Shelfie</span>
              <button className="app-mobile-close" onClick={closeMobile} aria-label="Cerrar"><X size={18} /></button>
            </div>

            <button className="app-mobile-btn" onClick={() => { closeMobile(); onRankingClick(); }}>
              <Trophy size={16} color="#F59E0B" /> Ranking
            </button>

            {isLoggedIn && isAdmin && (
              <button className="app-mobile-btn" style={{ color: '#8B5CF6', borderColor: 'rgba(139,92,246,0.3)' }}
                onClick={() => { closeMobile(); onAdminClick(); }}>
                Admin
              </button>
            )}

            {isLoggedIn ? (
              <>
                <button className="app-mobile-btn" onClick={() => { closeMobile(); onProfileClick(); }}>
                  <User size={16} /> Mi Perfil
                </button>
                {isMember && (
                  <>
                    <button className="app-mobile-btn" style={{ color: '#F59E0B', borderColor: 'rgba(245,158,11,0.3)' }}
                      onClick={() => { closeMobile(); onProClick(); }}>
                      <Crown size={16} color="#F59E0B" /> Premium: ¡Llévalo a casa!
                    </button>
                    <button className="app-mobile-btn" style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }}
                      onClick={() => { closeMobile(); setShowDonationModal(true); }}>
                      <Heart size={16} fill="#EF4444" /> Dona un set LEGO®
                    </button>
                  </>
                )}
                <div style={{ flexGrow: 1 }} />
                <button className="app-mobile-btn" style={{ color: '#F87171', borderColor: 'rgba(239,68,68,0.2)' }}
                  onClick={() => { closeMobile(); onLogoutClick(); }}>
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <button className="app-mobile-btn" style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
                onClick={() => { closeMobile(); onLoginClick(); }}>
                <LogIn size={16} /> Iniciar Sesión
              </button>
            )}
          </div>
        </div>
      )}

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
