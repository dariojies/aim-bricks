import { BookOpen, Box, Crown, LogIn, User } from 'lucide-react';

interface Props {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onProfileClick: () => void;
  onHomeClick: () => void;
}

export const Header: React.FC<Props> = ({ isLoggedIn, onLoginClick, onProfileClick, onHomeClick }) => {
  return (
    <header className="glass-panel" style={{ padding: '1rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={onHomeClick}>
        <Box className="text-accent" size={32} />
        <h1 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Aim Brickslab y Libros</h1>
      </div>
      <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); onHomeClick(); }} style={{ color: 'var(--text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
          <Box size={20} /> Aim Brickslabs
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); onHomeClick(); }} style={{ color: 'var(--text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
          <BookOpen size={20} /> Libros
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.2))', padding: '0.5rem 1rem', borderRadius: '9999px', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#FCD34D' }}>
          <Crown size={20} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Premium: ¡Llévalo a casa!</span>
        </div>
        
        {isLoggedIn ? (
          <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={onProfileClick}>
            <User size={18} /> Mi Perfil
          </button>
        ) : (
          <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={onLoginClick}>
            <LogIn size={18} /> Iniciar Sesión
          </button>
        )}
      </nav>
    </header>
  );
};
