import { useState, useEffect } from 'react';
import { Box, Crown, LogIn, User, Moon, Sun, Heart } from 'lucide-react';

interface Props {
  isLoggedIn: boolean;
  userRole?: string;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onProfileClick: () => void;
  onAdminClick: () => void;
  onHomeClick: () => void;
}

export const Header: React.FC<Props> = ({ isLoggedIn, userRole, onLoginClick, onLogoutClick, onProfileClick, onAdminClick, onHomeClick }) => {
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
      <header className="glass-panel responsive-header" style={{ padding: '1rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', justifySelf: 'center' }} onClick={onHomeClick}>
          <Box className="text-accent" size={32} />
          <h1 className="text-gradient header-title">Aim Brickslab y Libros</h1>
        </div>
        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.2))', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#FCD34D' }}>
            <Crown size={20} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Premium: ¡Llévalo a casa!</span>
          </div>
          
          <button 
            className="btn btn-outline" 
            style={{ padding: '0.5rem 1rem', borderColor: '#EF4444', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }} 
            onClick={() => setShowDonationModal(true)}
          >
            <Heart size={18} fill="#EF4444" /> Dona un set LEGO®
          </button>

          {isLoggedIn ? (
            <div className="responsive-header-buttons" style={{ display: 'flex', gap: '0.75rem' }}>
              {(userRole === 'admin' || userRole === 'superadmin') && (
                <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', borderColor: '#8B5CF6', color: '#8B5CF6' }} onClick={onAdminClick}>
                  Panel Admin
                </button>
              )}
              <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={onProfileClick}>
                <User size={18} /> Mi Perfil
              </button>
              <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#F87171' }} onClick={onLogoutClick}>
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <div className="responsive-header-buttons" style={{ display: 'flex', width: '100%' }}>
              <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', width: '100%', justifyContent: 'center' }} onClick={onLoginClick}>
                <LogIn size={18} /> Iniciar Sesión
              </button>
            </div>
          )}
        </nav>
      </header>

      {/* Botón flotante para Alternar Tema */}
      <button 
        onClick={toggleTheme} 
        style={{ 
          position: 'fixed', 
          bottom: '2rem', 
          right: '2rem', 
          zIndex: 9999,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '56px', 
          height: '56px', 
          borderRadius: '50%', 
          cursor: 'pointer', 
          background: 'var(--accent)', 
          border: 'none', 
          color: 'white',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }} 
        aria-label="Alternar tema"
      >
        {theme === 'dark' ? <Sun size={28} /> : <Moon size={28} />}
      </button>

      {/* Modal de Donación */}
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
                <li>Tráelo a la sede principal de Aim y entrégalo en recepción.</li>
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
