import { Box, BookOpen, Clock } from 'lucide-react';
import type { UserProfile } from '../data/mockData';

interface Props {
  user: UserProfile;
}

export const Profile: React.FC<Props> = ({ user }) => {
  return (
    <div className="animate-fade-in" style={{ padding: '2rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '1rem' }}>Mi Perfil</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }}>
          ¡Hola, {user.name}! Aquí tienes un resumen de tu actividad en Aim Brickslab y Libros.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)' }}>
            <BookOpen size={24} /> Libros Leídos ({user.readBooks.length})
          </h3>
          {user.readBooks.length > 0 ? (
            <div className="responsive-catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {user.readBooks.map(book => (
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
            <Box size={24} /> Brickslabs Montados ({user.builtBrickslabs.length})
          </h3>
          {user.builtBrickslabs.length > 0 ? (
            <div className="responsive-catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {user.builtBrickslabs.map(set => (
                <div key={set.id} style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                  <img src={set.imageUrl} alt={set.title} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{set.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>¡Misión cumplida!</span>
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
            <Clock size={24} /> Reservas Actuales ({user.currentReservations.length})
          </h3>
          {user.currentReservations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {user.currentReservations.map(id => (
                <div key={id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem 1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>Reserva confirmada. ID: {id}</span>
                  <span style={{ fontSize: '0.875rem', color: '#10B981', padding: '0.25rem 0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '9999px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    Activa
                  </span>
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
