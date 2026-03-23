import type { CatalogItem } from '../data/mockData';
import { Crown, X } from 'lucide-react';

interface Props {
  item: CatalogItem;
  onClose: () => void;
  onConfirm: () => void;
  isLoggedIn: boolean;
  onLoginRequest: () => void;
}

export const ReservationModal: React.FC<Props> = ({ item, onClose, onConfirm, isLoggedIn, onLoginRequest }) => {
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, padding: '1rem'
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Reservar "{item.title}"</h2>
        
        {!isLoggedIn ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Debes iniciar sesión para poder reservar artículos.
            </p>
            <button className="btn btn-primary" onClick={onLoginRequest}>Iniciar Sesión</button>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Al reservar este artículo, te comprometes a construirlo o leerlo dentro de nuestro local Aim Brickslab. 
              ¡Por favor, trata todas las piezas y páginas con cuidado para que otros también puedan disfrutarlos!
            </p>

            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <Crown className="text-accent" style={{ color: '#FCD34D', flexShrink: 0 }} />
              <div>
                <h4 style={{ color: '#FCD34D', fontWeight: 600, marginBottom: '0.25rem' }}>¿Quieres llevarlo a casa?</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  ¡Nuestra futura suscripción Premium permitirá a los miembros llevarse los artículos a casa! Pregúntanos en el local para acceso anticipado.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" onClick={onConfirm}>Confirmar Reserva</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
