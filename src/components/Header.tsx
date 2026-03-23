import { useState, useEffect } from 'react';
import { Box, Crown, LogIn, User, Moon, Sun } from 'lucide-react';

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
      <header className="glass-panel" style={{ padding: '1rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={onHomeClick}>
          <Box className="text-accent" size={32} />
          <h1 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Aim Brickslab y Libros</h1>
        </div>
        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.2))', padding: '0.5rem 1rem', borderRadius: '9999px', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#FCD34D' }}>
            <Crown size={20} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Premium: ¡Llévalo a casa!</span>
          </div>

          {isLoggedIn ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={onLoginClick}>
              <LogIn size={18} /> Iniciar Sesión
            </button>
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
    </>
  );
};
