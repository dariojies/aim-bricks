import { useState, useEffect } from 'react';

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

interface Star { id: number; animKey: number; left: string; top: string; }

const STAR_PATH = 'M512 255.1c0 11.34-7.406 20.86-18.44 23.64l-171.3 42.78l-42.78 171.1C276.7 504.6 267.2 512 255.9 512s-20.84-7.406-23.62-18.44l-42.66-171.2L18.47 279.6C7.406 276.8 0 267.3 0 255.1c0-11.34 7.406-20.83 18.44-23.61l171.2-42.78l42.78-171.1C235.1 7.406 244.7 0 256 0s20.84 7.406 23.62 18.44l42.78 171.2l171.2 42.78C504.6 235.2 512 244.6 512 255.1z';

export function MagicText({ children }: { children: React.ReactNode }) {
  const [stars, setStars] = useState<Star[]>([
    { id: 0, animKey: 0, left: `${rand(0, 80)}%`, top: `${rand(-30, 70)}%` },
    { id: 1, animKey: 0, left: `${rand(0, 80)}%`, top: `${rand(-30, 70)}%` },
    { id: 2, animKey: 0, left: `${rand(0, 80)}%`, top: `${rand(-30, 70)}%` },
  ]);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      const i = idx % 3;
      idx++;
      setStars(prev => prev.map(s =>
        s.id === i
          ? { ...s, animKey: s.animKey + 1, left: `${rand(0, 80)}%`, top: `${rand(-30, 70)}%` }
          : s
      ));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="magic">
      {stars.map(star => (
        <span
          key={`${star.id}-${star.animKey}`}
          className="magic-star"
          style={{ '--star-left': star.left, '--star-top': star.top } as React.CSSProperties}
        >
          <svg viewBox="0 0 512 512">
            <path d={STAR_PATH} />
          </svg>
        </span>
      ))}
      <span className="magic-text">{children}</span>
    </span>
  );
}
