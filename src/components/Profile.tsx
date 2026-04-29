import { Box, BookOpen, Clock } from 'lucide-react';
import type { UserProfile } from '../data/mockData';

interface Props {
  user: UserProfile;
  onCancelReservation?: (id: string) => void;
  onReportPieces?: (brickslabId: string, description: string) => void;
}

export const Profile: React.FC<Props> = ({ user, onCancelReservation, onReportPieces }) => {
  // Ensure we have safe defaults for arrays to prevent crashes with old data formats
  const readBooks = user?.readBooks || [];
  const builtBrickslabs = user?.builtBrickslabs || [];
  const currentReservations = user?.currentReservations || [];

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 className="text-gradient hero-title">Mi Perfil</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }}>
          ¡Hola, {user?.name || 'Usuario'}! Aquí tienes un resumen de tu actividad en Aim Brickslab y Libros.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)' }}>
            <BookOpen size={24} /> Libros Leídos ({readBooks.length})
          </h3>
          {readBooks.length > 0 ? (
            <div className="responsive-catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {readBooks.map(book => (
                <div key={book.id} style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                  <img src={book.imageUrl} alt={book.title} style={{ width: '60px', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{book.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>¡Completado!</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Aún no has leído ningún libro.</p>
          )}
        </section>

        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
            <Box size={24} /> Brickslabs Montados ({builtBrickslabs.length})
          </h3>
          {builtBrickslabs.length > 0 ? (
            <div className="responsive-catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {builtBrickslabs.map(set => (
                <div key={set.id} style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                  <img src={set.imageUrl} alt={set.title} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{set.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>¡Misión cumplida!</span>
                    {onReportPieces && (
                      <button 
                        className="btn btn-outline" 
                        style={{ display: 'block', marginTop: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderColor: '#F59E0B', color: '#F59E0B' }}
                        onClick={() => {
                          const desc = prompt('¿Qué pieza falta? Describe color y forma si lo recuerdas:');
                          if (desc) onReportPieces(set.id, desc);
                        }}
                      >
                        ¿Faltaban Piezas?
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Aún no has montado ningún set.</p>
          )}
        </section>

        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#FCD34D' }}>
            <Clock size={24} /> Reservas Actuales ({currentReservations.length})
          </h3>
          {currentReservations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {currentReservations.map(res => (
                <div key={res.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem 1.5rem', borderRadius: '12px', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>{res.text}</span>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: res.status === 'Reserved' ? '#EAB308' : '#3B82F6', padding: '0.25rem 0.75rem', background: res.status === 'Reserved' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: `1px solid ${res.status === 'Reserved' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(59, 130, 246, 0.3)'}` }}>
                      {res.status === 'Reserved' ? 'Pendiente Recogida' : 'Entregado a Alumno'}
                    </span>
                    {res.status === 'Reserved' && onCancelReservation && (
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: '#EF4444', color: '#EF4444' }}
                        onClick={() => onCancelReservation(res.id)}
                      >
                        Cancelar Reserva
                      </button>
                    )}
                    {res.status === 'Delivered' && res.isBrickslab && onReportPieces && (
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: '#F59E0B', color: '#F59E0B' }}
                        onClick={() => {
                          const desc = prompt('¿Qué pieza falta? Describe color y forma si lo recuerdas:');
                          if (desc && res.brickslabId) onReportPieces(res.brickslabId, desc);
                        }}
                      >
                        ¿Faltan Piezas?
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No tienes reservas activas en este momento.</p>
          )}
        </section>
      </div>
    </div>
  );
};
