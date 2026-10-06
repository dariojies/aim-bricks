import { useState } from 'react';
import { Box, BookOpen, Clock, Star, Library, Plus } from 'lucide-react';
import type { UserProfile } from '../data/mockData';

interface Props {
  user: UserProfile;
  onCancelReservation?: (id: string) => void;
  onReportPieces?: (brickslabId: string, description: string) => void;
  // #87: valorar lo leído o montado.
  onRate?: (itemId: string, estrellas: number, comentario: string) => Promise<boolean>;
  // #90: cambiar de catálogo y crear el propio.
  onSwitchClub?: (clubId: string) => void;
  onCreatePersonal?: () => void;
}

// Valorar algo del historial (#87): las estrellas que puso o el botón para ponerlas.
const Valorar: React.FC<{ itemId?: string | null; actual?: { estrellas: number; comentario: string }; onRate?: Props['onRate'] }> = ({ itemId, actual, onRate }) => {
  const [abierto, setAbierto] = useState(false);
  const [estrellas, setEstrellas] = useState(actual?.estrellas || 0);
  const [sobre, setSobre] = useState(0);
  const [comentario, setComentario] = useState(actual?.comentario || '');
  const [guardando, setGuardando] = useState(false);
  if (!itemId || !onRate) return null;
  const pintar = (v: number, size: number, editable: boolean) => (
    <span style={{ display: 'inline-flex', gap: editable ? '0.2rem' : '0.1rem' }} onMouseLeave={() => setSobre(0)}>
      {[1, 2, 3, 4, 5].map(n => editable ? (
        <button key={n} type="button" aria-label={`${n} estrellas`} onMouseEnter={() => setSobre(n)} onClick={() => setEstrellas(n)}
          style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', display: 'grid' }}>
          <Star size={size} color="#F5B301" fill={(sobre || v) >= n ? '#F5B301' : 'none'} />
        </button>
      ) : <Star key={n} size={size} color="#F5B301" fill={v >= n ? '#F5B301' : 'none'} />)}
    </span>
  );
  if (!abierto) {
    return actual
      ? <button type="button" onClick={() => setAbierto(true)} title="Cambiar la valoración" style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', marginTop: '0.4rem', display: 'block' }}>{pintar(actual.estrellas, 14, false)}</button>
      : <button type="button" className="btn btn-outline" onClick={() => setAbierto(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem', padding: '0.2rem 0.55rem', fontSize: '0.75rem', borderColor: '#F5B301', color: '#F5B301' }}><Star size={12} /> Valorar</button>;
  }
  return (
    <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.4rem' }}>
      {pintar(estrellas, 22, true)}
      <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={2} maxLength={600} placeholder="¿Qué te ha parecido? (opcional)"
        style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--background)', color: 'var(--text)', fontSize: '0.8rem', resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button type="button" className="btn btn-outline" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setAbierto(false)}>Cancelar</button>
        <button type="button" className="btn btn-primary" disabled={!estrellas || guardando} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', opacity: !estrellas ? 0.5 : 1 }}
          onClick={async () => { setGuardando(true); const ok = await onRate(itemId, estrellas, comentario); setGuardando(false); if (ok) setAbierto(false); }}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
};

export const Profile: React.FC<Props> = ({ user, onCancelReservation, onReportPieces, onRate, onSwitchClub, onCreatePersonal }) => {
  const memberships = user?.memberships || [];
  const tienePropio = memberships.some(m => m.role === 'owner');
  const ROL: Record<string, string> = { owner: 'Dueño', profesor: 'Profesor', admin: 'Profesor', member: 'Miembro', student: 'Alumno', instructor: 'Profesor' };
  // Ensure we have safe defaults for arrays to prevent crashes with old data formats
  const readBooks = user?.readBooks || [];
  const builtBrickslabs = user?.builtBrickslabs || [];
  const currentReservations = user?.currentReservations || [];

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 className="text-gradient hero-title">Mi Perfil</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }}>
          ¡Hola, {user?.name || 'Usuario'}! Aquí tienes un resumen de tu actividad en Shelfie y Libros.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* #90: los catálogos de los que eres y el tuyo propio */}
        {(memberships.length > 0 || onCreatePersonal) && (
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Library size={24} /> Mis catálogos
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Elige con cuál trabajas. Puedes ser de un club o de un cole y tener además tu propio catálogo privado, gratis.</p>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {memberships.map(m => {
                const activo = m.clubId === user.clubId;
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: `1px solid ${activo ? 'var(--primary)' : 'transparent'}`, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <b>{m.clubName || 'Club'}</b>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ROL[m.role] || m.role}</span>
                    </div>
                    {activo
                      ? <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>Trabajando con este</span>
                      : onSwitchClub && <button type="button" className="btn btn-outline" style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem' }} onClick={() => onSwitchClub(m.clubId)}>Usar este</button>}
                  </div>
                );
              })}
            </div>
            {!tienePropio && onCreatePersonal && (
              <button type="button" className="btn btn-primary" style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={onCreatePersonal}>
                <Plus size={16} /> Crear mi catálogo personal (gratis)
              </button>
            )}
          </section>
        )}
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
                    <Valorar itemId={book.itemId} actual={book.itemId ? user.valoraciones?.[book.itemId] : undefined} onRate={onRate} />
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
                    <Valorar itemId={set.itemId} actual={set.itemId ? user.valoraciones?.[set.itemId] : undefined} onRate={onRate} />
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
