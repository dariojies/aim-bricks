import React, { useState, useEffect } from 'react';
import { ShelfieTweaks } from './ShelfieTweaks';

const Sparkle = () => (
  <span className="sparkle">
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0l2.5 9.5L24 12l-9.5 2.5L12 24l-2.5-9.5L0 12l9.5-2.5L12 0z" />
    </svg>
  </span>
);

export function LandingPage() {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regClub, setRegClub] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('shelfie-theme');
    if (stored) document.documentElement.setAttribute('data-theme', stored);
  }, []);

  useEffect(() => {
    const selectors = [
      '.section-head', '.feature-card', '.step', '.price-card', '.faq-item',
      '.logo-chip', '.showcase > div', '.testi > div', '.stats-band h3', '.stat',
      '.benefits-strip .b', '.cta-block', '.steps',
    ];
    selectors.forEach((sel) => {
      const last = sel.split(' ').pop()!;
      document.querySelectorAll(sel).forEach((el) => {
        el.classList.add('fade-up');
        const siblings = el.parentElement ? el.parentElement.querySelectorAll(last) : [];
        const idx = Array.from(siblings).indexOf(el as Element);
        if (idx === 1) el.classList.add('fade-up-delay-1');
        else if (idx === 2) el.classList.add('fade-up-delay-2');
        else if (idx === 3) el.classList.add('fade-up-delay-3');
        else if (idx >= 4) el.classList.add('fade-up-delay-4');
      });
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.fade-up').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!registerOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRegister(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [registerOpen]);

  const openRegister = () => { setRegisterOpen(true); setRegError(''); };
  const closeRegister = () => {
    setRegisterOpen(false);
    setRegError('');
    setRegName(''); setRegClub(''); setRegEmail(''); setRegPassword('');
  };

  const toggleTheme = () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('shelfie-theme', next);
    window.dispatchEvent(new CustomEvent('shelfie-theme-changed', { detail: next }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, clubName: regClub, email: regEmail, password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setRegError(data.error || 'Error al crear la cuenta.'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      window.location.href = '/app';
    } catch {
      setRegError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <>
      {/* Top banner */}
      <div className="top-banner">
        <span>🚀 Shelfie ya gestiona los catálogos de préstamo de las academias Aim Education — ¿y el tuyo?</span>
        <span className="pill">Saber más</span>
      </div>

      {/* Header */}
      <header className="site">
        <div className="container nav">
          <div className="left">
            <div className="logo-tile" aria-hidden="true">
              <div className="inset">
                <div className="cell"><div className="book b1"></div><div className="book b2"></div><div className="book b3"></div></div>
                <div className="cell"><div className="box"></div></div>
                <div className="cell"><div className="pawn"></div></div>
                <div className="cell">
                  <div className="bricks" style={{ '--scale': '.5' } as React.CSSProperties}>
                    <div className="brick k1" style={{ height: '6px' }}></div>
                    <div className="brick k2" style={{ height: '5px' }}></div>
                    <div className="brick k3" style={{ height: '7px' }}></div>
                  </div>
                </div>
              </div>
            </div>
            <span className="wordmark">shelfie<Sparkle /></span>
          </div>
          <nav className="links">
            <a href="#producto">Plataforma</a>
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#centros">Para academias</a>
            <a href="#precios">Planes</a>
            <a href="#recursos">Preguntas</a>
          </nav>
          <div className="right">
            <a href="/app?login=1" className="signin">Iniciar sesión</a>
            <button className="theme-switch" onClick={toggleTheme} aria-label="Cambiar tema" style={{ flexShrink: 0 }}>
              <span className="ts-icon ts-sun" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              </span>
              <span className="ts-icon ts-moon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </span>
            </button>
            <button onClick={openRegister} className="btn btn-primary">Registrarse</button>
            <button className="nav-burger" onClick={() => setMobileNavOpen(true)} aria-label="Menú">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      <div className={`landing-mobile-nav${mobileNavOpen ? ' open' : ''}`} onClick={() => setMobileNavOpen(false)}>
        <div className="landing-mobile-panel" onClick={e => e.stopPropagation()}>
          <button className="landing-mobile-close" onClick={() => setMobileNavOpen(false)} aria-label="Cerrar">✕</button>
          <span className="wordmark" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>shelfie<Sparkle /></span>
          <nav>
            <a href="#producto" onClick={() => setMobileNavOpen(false)}>Plataforma</a>
            <a href="#funcionalidades" onClick={() => setMobileNavOpen(false)}>Funcionalidades</a>
            <a href="#centros" onClick={() => setMobileNavOpen(false)}>Para academias</a>
            <a href="#precios" onClick={() => setMobileNavOpen(false)}>Planes</a>
            <a href="#recursos" onClick={() => setMobileNavOpen(false)}>Preguntas</a>
          </nav>
          <div style={{ flexGrow: 1 }} />
          <a href="/app?login=1" className="btn btn-outline" style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}>Iniciar sesión</a>
          <button onClick={() => { setMobileNavOpen(false); openRegister(); }} className="btn btn-primary" style={{ width: '100%' }}>Registrarse</button>
        </div>
      </div>

      {/* Hero */}
      <section className="hero" id="producto">
        <div className="ornament ornament-1"></div>
        <svg className="ornament ornament-dots" viewBox="0 0 110 80" fill="none">
          <g fill="currentColor" style={{ color: 'var(--purple)', opacity: 0.4 }}>
            {[4, 18, 32, 46, 60, 74, 88, 102].flatMap((cx, ci) =>
              [4, 18, 32, 46].map((cy, ri) => <circle key={`${ci}-${ri}`} cx={cx} cy={cy} r="2" />)
            )}
          </g>
        </svg>
        <div className="container hero-grid">
          <div className="fade-up">
            <span className="pill-badge">Para academias, clubes y centros de actividades</span>
            <h1>
              Tu club tiene recursos.<br />
              <span className="row2">Shelfie los gestiona.</span>
            </h1>
            <p className="subhead">
              Shelfie es la plataforma que convierte el catálogo de sets, libros y materiales de tu academia en un sistema
              de reservas online. Tus alumnos reservan solos, tú controlas el stock y el equipo deja de gestionar préstamos
              por WhatsApp.
            </p>
            <div className="ctas">
              <a href="#demo" className="btn btn-primary btn-lg">
                Solicitar demo
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
              <a href="#funcionalidades" className="btn btn-ghost btn-lg">Ver funcionalidades</a>
            </div>
            <div className="feature-icons">
              <div className="fi">
                <div className="icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <span className="lbl">Catálogo digital propio</span>
              </div>
              <div className="fi">
                <div className="icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-4" />
                  </svg>
                </div>
                <span className="lbl">Reservas online sin fricciones</span>
              </div>
              <div className="fi">
                <div className="icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <span className="lbl">Ranking que fideliza alumnos</span>
              </div>
              <div className="fi">
                <div className="icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <span className="lbl">Panel de administración completo</span>
              </div>
            </div>
          </div>
          <div className="tablet-scene">
            <div className="shelf">
              <div className="cell-shelf"><div className="books"><div className="book b1"></div><div className="book b2"></div><div className="book b3"></div><div className="book b4"></div></div></div>
              <div className="cell-shelf"><div className="crate"></div></div>
              <div className="cell-shelf"><div className="pawn"></div></div>
              <div className="cell-shelf"><div className="bricks"><div className="brick k1"></div><div className="brick k2"></div><div className="brick k3"></div></div></div>
            </div>
            <div className="plant">
              <div className="leaf l4"></div><div className="leaf l5"></div><div className="leaf l1"></div><div className="leaf l3"></div><div className="leaf l2"></div>
              <div className="pot"></div>
            </div>
            <div className="tablet">
              <div className="keyboard"></div>
              <div className="screen">
                <div className="topbar">
                  <span className="wordmark" style={{ fontSize: '14px' }}>shelfie<span className="sparkle" style={{ width: '5px', height: '5px', marginTop: '1px' }}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.5 9.5L24 12l-9.5 2.5L12 24l-2.5-9.5L0 12l9.5-2.5L12 0z" /></svg></span></span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink-2)' }}>
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    </svg>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--ink-2)' }}>
                      <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div className="search">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
                  </svg>
                  Buscar recursos...
                </div>
                <div className="sec-title">Categorías</div>
                <div className="cats">
                  <div className="cat c1"><span className="ico">🧱</span>Brickslabs</div>
                  <div className="cat c2"><span className="ico">📚</span>Biblioteca</div>
                  <div className="cat c3"><span className="ico">👑</span>Premium</div>
                </div>
                <div className="sec-row">
                  <span className="sec-title">Sets destacados</span>
                  <span className="more">Ver todos</span>
                </div>
                <div className="pops">
                  <div className="pop"><div className="cover">🧱</div><div className="title">City Police Station</div><div className="sub">Brickslab</div></div>
                  <div className="pop"><div className="cover">🚀</div><div className="title">Space Rover</div><div className="sub">Brickslab</div></div>
                  <div className="pop"><div className="cover">📖</div><div className="title">Hábitos Atómicos</div><div className="sub">Libro</div></div>
                  <div className="pop"><div className="cover">👑</div><div className="title">Technic Bugatti</div><div className="sub">Premium</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits strip */}
      <div className="container" style={{ position: 'relative' }}>
        <div className="benefits-strip">
          <div className="b">
            <div className="ico">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B9A4F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            Tus alumnos reservan solos, sin llamadas
          </div>
          <div className="b">
            <div className="ico">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5FE3D2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            Stock y piezas siempre bajo control
          </div>
          <div className="b">
            <div className="ico">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FCD179" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
            </div>
            Ranking que mantiene a los alumnos activos
          </div>
          <div className="b">
            <div className="ico">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5FE3D2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </div>
            Tu equipo admin lo gestiona todo desde un panel
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="block" id="funcionalidades">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Funcionalidades</span>
              <h2 className="section-title">Todo lo que necesita tu academia para prestar, <span className="accent">en un solo sitio.</span></h2>
            </div>
            <p className="section-lede">Desde que un alumno descubre un set hasta que lo devuelve: Shelfie gestiona cada paso del ciclo de préstamo para que tu equipo no tenga que hacerlo manualmente.</p>
          </div>
          <div className="features-grid" id="features-grid">
            <div className="feature-card feature-card-lg">
              <div className="icon-tile">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <h3>Un catálogo digital para todo lo que presta tu academia.</h3>
              <p>Sets de LEGO®, libros, juegos, materiales — da igual lo que tengas. Tus alumnos lo ven, filtran por categoría y reservan en segundos desde el móvil o el ordenador.</p>
              <span className="meta">Brickslabs · Biblioteca · Categorías personalizadas · Stock en tiempo real →</span>
            </div>
            <div className="feature-card">
              <div className="icon-tile teal">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <h3>Reservas online, entrega presencial</h3>
              <p>El alumno reserva desde casa. Tu equipo lo ve en el panel, confirma con un clic y le entrega el set cuando llega. Sin papel, sin confusión.</p>
            </div>
            <div className="feature-card">
              <div className="icon-tile orange">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.4-2.6" /><path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.4 2.6" /><path d="M21 3v6h-6M3 21v-6h6" />
                </svg>
              </div>
              <h3>Panel de administración</h3>
              <p>Gestiona el catálogo, las reservas activas, los usuarios y los permisos desde un panel centralizado. Sin hojas de cálculo.</p>
            </div>
            <div className="feature-card">
              <div className="icon-tile yellow">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </div>
              <h3>Ranking que fideliza</h3>
              <p>Clasificación mensual, anual y de todos los tiempos. Los alumnos compiten por el podio de tu club, lo que los mantiene activos y con ganas de volver.</p>
            </div>
            <div className="feature-card">
              <div className="icon-tile blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
              </div>
              <h3>Premium: una fuente de ingresos extra</h3>
              <p>Ofrece a tus alumnos la opción de llevarse sets a casa con una membresía Premium. Ellos construyen cuando quieren, tú generas ingresos adicionales.</p>
            </div>
            <div className="feature-card">
              <div className="icon-tile green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>Reporte de piezas</h3>
              <p>¿Faltaba alguna pieza al desmontar? Los alumnos lo reportan desde su historial y el equipo de la academia lo gestiona directamente.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="block tight" id="centros">
        <div className="container">
          <div className="showcase">
            <div>
              <span className="eyebrow">Para academias y clubes</span>
              <h2 className="section-title">Diseñado para el equipo que gestiona tu academia.</h2>
              <p className="section-lede">Cada miembro de tu equipo tiene el rol que necesita. El propietario lo controla todo, los administradores gestionan el día a día, y los alumnos solo ven su catálogo y sus reservas.</p>
              <ul className="bullet-list">
                <li><span className="dot">✓</span> Roles diferenciados: propietario, administrador y alumno.</li>
                <li><span className="dot">✓</span> Multi-club: perfecta para cadenas de academias o redes de centros.</li>
                <li><span className="dot">✓</span> Control de stock en tiempo real — siempre sabes qué hay disponible y qué no.</li>
                <li><span className="dot">✓</span> Historial completo de préstamos por alumno, con reporte de piezas faltantes.</li>
              </ul>
            </div>
            <div className="mock mock-table-wrap">
              <div className="mock-head">
                <strong>Reservas en curso</strong>
                <span className="chip">5 activas</span>
              </div>
              <div className="mock-toolbar">
                <div className="mock-search">🔍 Buscar alumno...</div>
                <div className="mock-tabs">
                  <span className="tab active">Todas</span>
                  <span className="tab">Pendientes</span>
                  <span className="tab">Entregadas</span>
                </div>
              </div>
              <div className="mock-thead">
                <span>Usuario</span><span>Artículo</span><span>Estado</span><span>Acción</span>
              </div>
              <div className="mock-row">
                <div className="mock-user"><div className="avatar">AG</div><div className="uname">Ana García</div></div>
                <div className="mock-article-cell"><div className="mock-article">LEGO® City Police Station</div><span className="mock-type brickslab">Aim Brickslab</span></div>
                <span className="status ok">Entregado</span>
                <div className="mock-actions"><button className="mock-btn primary">✓ Devuelto</button><button className="mock-btn warn">Piezas</button></div>
              </div>
              <div className="mock-row">
                <div className="mock-user"><div className="avatar" style={{ background: 'linear-gradient(135deg,#F5B935,#EF7E3B)' }}>CM</div><div className="uname">Carlos Martín</div></div>
                <div className="mock-article-cell"><div className="mock-article">LEGO® Technic Bugatti</div><span className="mock-type brickslab">Aim Brickslab</span></div>
                <span className="status ok">Entregado</span>
                <div className="mock-actions"><button className="mock-btn primary">✓ Devuelto</button><button className="mock-btn warn">Piezas</button></div>
              </div>
              <div className="mock-row">
                <div className="mock-user"><div className="avatar" style={{ background: 'linear-gradient(135deg,#34A4D9,#6B7CE0)' }}>LP</div><div className="uname">Laura Pérez</div></div>
                <div className="mock-article-cell"><div className="mock-article">Hábitos Atómicos</div><span className="mock-type biblioteca">Biblioteca</span></div>
                <span className="status warn">Pendiente</span>
                <div className="mock-actions"><button className="mock-btn primary">✓ Devuelto</button></div>
              </div>
              <div className="mock-row">
                <div className="mock-user"><div className="avatar" style={{ background: 'linear-gradient(135deg,#4A8A6F,#6FB593)' }}>DR</div><div className="uname">Diego Romero</div></div>
                <div className="mock-article-cell"><div className="mock-article">LEGO® Castillo Medieval</div><span className="mock-type brickslab">Aim Brickslab</span></div>
                <span className="status ok">Entregado</span>
                <div className="mock-actions"><button className="mock-btn primary">✓ Devuelto</button><button className="mock-btn warn">Piezas</button></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="block tight">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Cómo funciona</span>
              <h2 className="section-title">Tu academia en Shelfie, <span className="accent">lista en una tarde.</span></h2>
            </div>
          </div>
          <div className="steps">
            <div className="step"><div className="num">01</div><h4>Crea tu academia</h4><p>Te damos acceso y configuramos Shelfie con el nombre y las categorías de tu club. Sin tecnicismos.</p></div>
            <div className="step"><div className="num">02</div><h4>Sube tu catálogo</h4><p>Añade los sets, libros o materiales que tienes disponibles. Título, imagen, stock y categoría es todo lo que necesitas.</p></div>
            <div className="step"><div className="num">03</div><h4>Invita a tus alumnos</h4><p>Crea las cuentas de tus alumnos y empieza a recibir reservas. Ellos lo ven todo desde el móvil o el ordenador.</p></div>
            <div className="step"><div className="num">04</div><h4>Tú a lo importante</h4><p>Shelfie gestiona las reservas, el stock y el ranking. Tu equipo solo tiene que entregar y recoger.</p></div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="block tight">
        <div className="container">
          <div className="stats-band">
            <h3>Academias que ya gestionan sus préstamos con Shelfie.</h3>
            <div className="stat"><div className="v">Sets</div><div className="l">LEGO® y libros en catálogo</div></div>
            <div className="stat"><div className="v">Multi-club</div><div className="l">Una plataforma, varios centros</div></div>
            <div className="stat"><div className="v">Premium</div><div className="l">Ingresos extra para tu academia</div></div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="block tight">
        <div className="container">
          <div className="testi">
            <div>
              <span className="eyebrow">Lo que dicen las academias</span>
              <p className="quote">Teníamos decenas de sets de LEGO® sin gestionar bien — siempre faltaba alguna pieza y nadie sabía quién tenía qué. Con Shelfie los alumnos reservan solos y nuestro equipo solo tiene que entregar y recoger. Ha sido un cambio brutal.</p>
              <div className="quote-attr">
                <div className="av">CM</div>
                <div className="meta"><strong>Carlos M.</strong>Director · Aim Education</div>
              </div>
            </div>
            <div className="logos-wall">
              <div className="logo-chip">Aim Education</div>
              <div className="logo-chip">Aim Madrid</div>
              <div className="logo-chip">Aim Barcelona</div>
              <div className="logo-chip">Aim Valencia</div>
              <div className="logo-chip">Aim Sevilla</div>
              <div className="logo-chip">Aim Murcia</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="block" id="precios">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Planes para academias y clubes</span>
              <h2 className="section-title">Empieza gratis. Escala <span className="accent">cuando crezcas.</span></h2>
            </div>
            <p className="section-lede">Sin coste por alumno, sin permanencia. Pagas por tu academia y tus alumnos acceden sin límite.</p>
          </div>
          <div className="pricing">
            <div className="price-card">
              <div className="name">Starter</div>
              <div className="price">Gratis</div>
              <p className="desc">Para empezar a digitalizar tus préstamos sin ningún compromiso.</p>
              <ul>
                <li><span className="dot">✓</span> 1 categoría de catálogo</li>
                <li><span className="dot">✓</span> Hasta 50 recursos en catálogo</li>
                <li><span className="dot">✓</span> Alumnos ilimitados</li>
                <li><span className="dot">✓</span> Reservas y panel de administración</li>
                <li><span className="dot">✓</span> Ranking del club</li>
                <li><span className="dot" style={{ color: '#908E86' }}>✗</span> <span style={{ color: '#908E86' }}>Importación CSV/Excel</span></li>
                <li><span className="dot" style={{ color: '#908E86' }}>✗</span> <span style={{ color: '#908E86' }}>Membresías Premium</span></li>
              </ul>
              <button onClick={openRegister} className="btn btn-outline" style={{ marginTop: 'auto', width: '100%' }}>Empezar gratis</button>
            </div>
            <div className="price-card featured">
              <span className="ribbon" style={{ fontWeight: 700 }}>Más elegido</span>
              <div className="name">Academy</div>
              <div className="price">Consúltanos</div>
              <p className="desc">Para academias con catálogo activo y alumnos que reservan cada semana.</p>
              <ul>
                <li><span className="dot">✓</span> Hasta 4 categorías de catálogo</li>
                <li><span className="dot">✓</span> Recursos ilimitados en catálogo</li>
                <li><span className="dot">✓</span> Importación masiva desde CSV / Excel</li>
                <li><span className="dot">✓</span> Membresías Premium para tus alumnos</li>
                <li><span className="dot">✓</span> Múltiples administradores y roles</li>
                <li><span className="dot">✓</span> Control de piezas y reporte de incidencias</li>
                <li><span className="dot">✓</span> Soporte prioritario</li>
              </ul>
              <a href="#demo" className="btn btn-primary" style={{ marginTop: 'auto', background: 'var(--navy)', color: 'white' }}>Solicitar demo</a>
            </div>
            <div className="price-card">
              <div className="name">Network</div>
              <div className="price">A medida</div>
              <p className="desc">Para cadenas o grupos con varios centros que comparten la plataforma.</p>
              <ul>
                <li><span className="dot">✓</span> Hasta 10 categorías de catálogo</li>
                <li><span className="dot">✓</span> Recursos ilimitados en catálogo</li>
                <li><span className="dot">✓</span> Importación masiva desde CSV / Excel</li>
                <li><span className="dot">✓</span> Multi-club con catálogos independientes</li>
                <li><span className="dot">✓</span> Panel unificado para todos los centros</li>
                <li><span className="dot">✓</span> Onboarding asistido</li>
                <li><span className="dot">✓</span> Gestor de cuenta dedicado</li>
              </ul>
              <a href="#demo" className="btn btn-outline" style={{ marginTop: 'auto' }}>Hablar con el equipo</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="block tight" id="recursos">
        <div className="container">
          <div className="section-head" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column', alignItems: 'center' }}>
            <div>
              <span className="eyebrow">Preguntas frecuentes</span>
              <h2 className="section-title" style={{ textAlign: 'center' }}>Resolvemos las dudas <span className="accent">más habituales.</span></h2>
            </div>
          </div>
          <div className="faq-list">
            <details className="faq-item" open>
              <summary>¿Con qué tipo de recursos funciona Shelfie?<span className="toggle">+</span></summary>
              <div className="answer">Con cualquier cosa que tu academia preste: sets de LEGO®, libros, juegos de mesa, kits de robótica, material didáctico... Tú defines las categorías y el catálogo.</div>
            </details>
            <details className="faq-item">
              <summary>¿Necesito instalar algo en mi academia?<span className="toggle">+</span></summary>
              <div className="answer">No. Shelfie funciona en el navegador desde cualquier dispositivo: el ordenador de recepción, el móvil del monitor o la tablet del alumno. Solo necesitáis conexión.</div>
            </details>
            <details className="faq-item">
              <summary>¿Cuánto tiempo lleva poner en marcha Shelfie?<span className="toggle">+</span></summary>
              <div className="answer">La mayoría de academias tienen el catálogo listo y los alumnos activos en una tarde. Nosotros os acompañamos durante la configuración inicial.</div>
            </details>
            <details className="faq-item">
              <summary>¿Puedo gestionar varias academias desde una sola cuenta?<span className="toggle">+</span></summary>
              <div className="answer">Sí. Shelfie soporta multi-club: cada academia tiene su propio catálogo y sus propios alumnos, pero el propietario puede verlas todas desde un panel unificado.</div>
            </details>
            <details className="faq-item">
              <summary>¿Qué es la membresía Premium para alumnos?<span className="toggle">+</span></summary>
              <div className="answer">Es una capa adicional que tú ofreces en tu academia: los alumnos Premium pueden llevarse sets a casa y devolverlos en su próxima visita. Es una forma de añadir valor y generar ingresos extra.</div>
            </details>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="block tight" id="demo">
        <div className="container">
          <div className="cta-block">
            <h2>¿Tu academia aún gestiona préstamos a mano?</h2>
            <p>Reserva una demo. Te daremos acceso Shelfie con el tipo de catálogo de tu club y te dejamos un entorno listo para probar.</p>
            <div className="ctas">
              <a href="#demo" className="btn btn-primary btn-lg">
                Solicitar demo
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
              <a href="#funcionalidades" className="btn btn-outline btn-lg">Ver funcionalidades</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site">
        <div className="container">
          <div className="foot-grid">
            <div className="brand">
              <span className="wordmark">shelfie<Sparkle /></span>
              <p>Construye. Aprende. Comparte.</p>
            </div>
            <div>
              <h5>Plataforma</h5>
              <ul>
                <li><a href="#funcionalidades">Funcionalidades</a></li>
                <li><a href="#precios">Planes</a></li>
                <li><a href="#centros">Para academias</a></li>
                <li><a href="#demo">Solicitar demo</a></li>
              </ul>
            </div>
            <div>
              <h5>Shelfie incluye</h5>
              <ul>
                <li><a href="#funcionalidades">Catálogo digital</a></li>
                <li><a href="#funcionalidades">Reservas online</a></li>
                <li><a href="#funcionalidades">Ranking del club</a></li>
                <li><a href="#funcionalidades">Membresías Premium</a></li>
              </ul>
            </div>
            <div>
              <h5>Aim Education</h5>
              <ul>
                <li><a href="#">Sobre Aim</a></li>
                <li><a href="#">Academias</a></li>
                <li><a href="#">Contacto</a></li>
              </ul>
            </div>
            <div>
              <h5>Legal</h5>
              <ul>
                <li><a href="#">Privacidad</a></li>
                <li><a href="#">Términos</a></li>
                <li><a href="#">RGPD</a></li>
              </ul>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 Shelfie · Aim Education</span>
            <span>Hecho por y para centros educativos.</span>
          </div>
        </div>
      </footer>

      {/* Register modal */}
      <div
        className={`reg-overlay${registerOpen ? ' open' : ''}`}
        onClick={(e) => { if (e.target === e.currentTarget) closeRegister(); }}
        aria-hidden={!registerOpen}
      >
        <div className="reg-modal" role="dialog" aria-modal={true} aria-labelledby="reg-title">
          <button className="reg-close" onClick={closeRegister} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="reg-header">
            <span className="wordmark" style={{ fontSize: '1.25rem' }}>shelfie<Sparkle /></span>
            <h2 id="reg-title">Crea tu cuenta gratis</h2>
            <p>Plan Starter — sin tarjeta de crédito</p>
          </div>
          <form onSubmit={handleRegister} noValidate>
            <div className="reg-field">
              <label htmlFor="reg-name">Tu nombre</label>
              <input id="reg-name" type="text" placeholder="Ana García" autoComplete="name" required
                value={regName} onChange={(e) => setRegName(e.target.value)} />
            </div>
            <div className="reg-field">
              <label htmlFor="reg-club">Nombre del club / academia</label>
              <input id="reg-club" type="text" placeholder="Brickslab Madrid" autoComplete="organization" required
                value={regClub} onChange={(e) => setRegClub(e.target.value)} />
            </div>
            <div className="reg-field">
              <label htmlFor="reg-email">Correo electrónico</label>
              <input id="reg-email" type="email" placeholder="ana@miclub.com" autoComplete="email" required
                value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
            </div>
            <div className="reg-field">
              <label htmlFor="reg-password">
                Contraseña <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(mín. 6 caracteres)</span>
              </label>
              <input id="reg-password" type="password" placeholder="••••••••" autoComplete="new-password" required
                value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
            </div>
            {regError && <div className="reg-error">{regError}</div>}
            <button type="submit" className="btn btn-primary reg-submit" disabled={regLoading}>
              {regLoading ? <span className="reg-loader" /> : <span>Crear cuenta</span>}
            </button>
            <p className="reg-legal">Al registrarte aceptas nuestros <a href="#">Términos de uso</a> y <a href="#">Política de privacidad</a>.</p>
          </form>
          <p className="reg-footer">¿Ya tienes cuenta? <a href="/app?login=1">Iniciar sesión</a></p>
          <button className="reg-cancel-mobile" onClick={closeRegister}>Cancelar</button>
        </div>
      </div>

      {/* Tweaks panel (dev tool, activates via postMessage) */}
      <ShelfieTweaks />
    </>
  );
}
