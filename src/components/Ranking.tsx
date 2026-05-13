import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown } from 'lucide-react';

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

interface RankingEntry {
  id: string;
  name: string;
  avatar: string | null;
  monthly: number;
  yearly: number;
  allTime: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  rankingEnabled: boolean;
}

export const Ranking: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'monthly' | 'yearly' | 'allTime'>('monthly');
  const [loading, setLoading] = useState(true);

  const getClubId = () => {
    const userStr = localStorage.getItem('aim_bricks_user');
    return userStr ? (JSON.parse(userStr)?.clubId || '') : '';
  };

  const fetchRanking = async (clubId: string, categoryId: string) => {
    const params = new URLSearchParams();
    if (clubId) params.set('clubId', clubId);
    if (categoryId && categoryId !== 'all') params.set('categoryId', categoryId);
    const res = await fetch(`${API_URL}/api/ranking?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    setCategories(data.categories || []);
    setRanking(data.ranking || []);
  };

  useEffect(() => {
    const clubId = getClubId();
    setLoading(true);
    fetchRanking(clubId, 'all').finally(() => setLoading(false));
  }, []);

  const handleCategoryChange = async (catId: string) => {
    setSelectedCategory(catId);
    setLoading(true);
    await fetchRanking(getClubId(), catId);
    setLoading(false);
  };

  const enabledCategories = categories.filter(c => c.rankingEnabled);
  const allRankingDisabled = categories.length > 0 && enabledCategories.length === 0;

  const getSortedRanking = () =>
    [...ranking].filter(e => e[timeframe] > 0).sort((a, b) => b[timeframe] - a[timeframe]);

  const sortedRanking = getSortedRanking();

  const getMedalColor = (index: number) => {
    if (index === 0) return '#FBBF24';
    if (index === 1) return '#9CA3AF';
    if (index === 2) return '#B45309';
    return 'var(--text-muted)';
  };

  const renderPodium = () => {
    if (sortedRanking.length === 0) return null;
    const podium = [sortedRanking[1], sortedRanking[0], sortedRanking[2]];
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '1rem', marginTop: '3rem', marginBottom: '4rem', flexWrap: 'wrap' }}>
        {podium.map((entry, i) => {
          if (!entry) return <div key={i} style={{ width: '120px' }} />;
          const position = i === 0 ? 2 : i === 1 ? 1 : 3;
          const height = position === 1 ? '160px' : position === 2 ? '120px' : '100px';
          const color = getMedalColor(position - 1);
          return (
            <div key={entry.id} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px', animationDelay: `${position * 0.1}s` }}>
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--surface-border)', overflow: 'hidden', border: `3px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                  {entry.avatar ? <img src={entry.avatar} alt={entry.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : entry.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', background: color, color: '#000', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                  {position}
                </div>
                {position === 1 && <Crown size={32} color="#FBBF24" style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)' }} />}
              </div>
              <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>{entry.name}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent)' }}>{entry[timeframe]}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>préstamos</div>
              </div>
              <div style={{ width: '100%', height, background: 'linear-gradient(to top, var(--surface-border), transparent)', borderRadius: '8px 8px 0 0', border: '1px solid var(--surface-border)', borderBottom: 'none' }} />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '0 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 className="text-gradient" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <Trophy size={40} className="text-accent" />
          Ranking de Préstamos
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '1rem' }}>
          Los alumnos más activos por categoría de préstamo.
        </p>
      </div>

      {/* Category tabs */}
      {enabledCategories.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn ${selectedCategory === 'all' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
            onClick={() => handleCategoryChange('all')}
          >
            General
          </button>
          {enabledCategories.map(cat => (
            <button
              key={cat.id}
              className={`btn ${selectedCategory === cat.id ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Timeframe tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
        {(['monthly', 'yearly', 'allTime'] as const).map(tf => (
          <button key={tf} className={`btn ${timeframe === tf ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTimeframe(tf)}>
            {tf === 'monthly' ? 'Mes Actual' : tf === 'yearly' ? 'Este Año' : 'Histórico Total'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Cargando ranking...</div>
      ) : allRankingDisabled ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Trophy size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>El ranking está desactivado en todas las categorías.</p>
        </div>
      ) : sortedRanking.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Aún no hay datos para este período. ¡Anímate a reservar!
        </div>
      ) : (
        <>
          {renderPodium()}
          <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Medal size={20} className="text-accent" /> Clasificación General
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sortedRanking.slice(3).map((entry, index) => (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                  <div style={{ width: '40px', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '1.2rem' }}>#{index + 4}</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {entry.avatar ? <img src={entry.avatar} alt={entry.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : entry.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500 }}>{entry.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(56,189,248,0.1)', padding: '0.5rem 1rem', borderRadius: '999px' }}>
                    <Award size={16} color="var(--accent)" />
                    <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{entry[timeframe]}</span>
                  </div>
                </div>
              ))}
              {sortedRanking.length <= 3 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No hay más entradas en este período.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
