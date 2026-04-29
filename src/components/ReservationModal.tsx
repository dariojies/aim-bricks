import type { CatalogItem } from '../data/mockData';
import { Crown, X } from 'lucide-react';

interface Props {
  item: CatalogItem;
  onClose: () => void;
  onConfirm: () => void;
  isLoggedIn: boolean;
  isPro: boolean;
  onLoginRequest: () => void;
}

export const ReservationModal: React.FC<Props> = ({ item, onClose, onConfirm, isLoggedIn, isPro, onLoginRequest }) => {
  const [reservationType, setReservationType] = React.useState<'local' | 'home'>(isPro ? 'home' : 'local');
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, padding: '1rem'
    }}>
      <div className="glass-panel animate-fade-in responsive-modal" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
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
            <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opciones de reserva</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', background: reservationType === 'local' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', transition: 'all 0.2s' }}>
                  <input type="radio" name="resType" checked={reservationType === 'local'} onChange={() => setReservationType('local')} style={{ width: '1.2rem', height: '1.2rem' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Montar en el local</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Disfruta de la experiencia Aim Brickslab</div>
                  </div>
                </label>
                
                <label style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: isPro ? 'pointer' : 'not-allowed', padding: '0.5rem', borderRadius: '8px', 
                  background: reservationType === 'home' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  opacity: isPro ? 1 : 0.6,
                  transition: 'all 0.2s'
                }}>
                  <input type="radio" name="resType" disabled={!isPro} checked={reservationType === 'home'} onChange={() => setReservationType('home')} style={{ width: '1.2rem', height: '1.2rem' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      Llevar a casa {isPro && <Crown size={14} style={{ color: '#FCD34D' }} />}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {isPro ? 'Como miembro Pro, puedes llevártelo' : 'Exclusivo para rango Brickslab Pro'}
                    </div>
                  </div>
                </label>
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
