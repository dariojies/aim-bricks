/* global React, ReactDOM, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakColor, TweakSlider */

const { useEffect } = React;

function ShelfieTweaks() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);

  // Sync theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    localStorage.setItem('shelfie-theme', t.theme);
  }, [t.theme]);

  // Listen for vanilla theme toggle so they stay in sync
  useEffect(() => {
    const handler = (e) => setTweak('theme', e.detail);
    window.addEventListener('shelfie-theme-changed', handler);
    return () => window.removeEventListener('shelfie-theme-changed', handler);
  }, [setTweak]);

  // Apply accent colors and radius live
  useEffect(() => {
    document.documentElement.style.setProperty('--purple', t.accent);
    // Derive a lighter variant
    document.documentElement.style.setProperty('--purple-2',
      lighten(t.accent, 0.12));
    document.documentElement.style.setProperty('--teal', t.highlight);
    document.documentElement.style.setProperty('--teal-2',
      lighten(t.highlight, 0.12));
    document.documentElement.style.setProperty('--radius', t.radius + 'px');
  }, [t.accent, t.highlight, t.radius]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Apariencia" />
      <TweakRadio
        label="Tema"
        value={t.theme}
        options={[
          { value: 'light', label: 'Claro' },
          { value: 'dark', label: 'Oscuro' },
        ]}
        onChange={(v) => setTweak('theme', v)}
      />

      <TweakSection label="Color de marca" />
      <TweakColor
        label="Primario"
        value={t.accent}
        options={['#6E3FD9', '#2A6FDB', '#0E8F73', '#C2410C', '#1F1F1F']}
        onChange={(v) => setTweak('accent', v)}
      />
      <TweakColor
        label="Acento"
        value={t.highlight}
        options={['#1CB8A6', '#F5B935', '#EF7E3B', '#5B6BE2', '#E04C8B']}
        onChange={(v) => setTweak('highlight', v)}
      />

      <TweakSection label="Forma" />
      <TweakSlider
        label="Radios de tarjeta"
        min={4}
        max={32}
        step={2}
        value={t.radius}
        unit="px"
        onChange={(v) => setTweak('radius', v)}
      />
    </TweaksPanel>
  );
}

function lighten(hex, amt) {
  const h = hex.replace('#','');
  const num = parseInt(h, 16);
  let r = (num >> 16) + Math.round(255 * amt);
  let g = ((num >> 8) & 0xff) + Math.round(255 * amt);
  let b = (num & 0xff) + Math.round(255 * amt);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return '#' + ((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<ShelfieTweaks />);
