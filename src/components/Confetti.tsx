import React from 'react';

interface ConfettiProps {
  show: boolean;
  onDone?: () => void;
  durationMs?: number;
}

// Minimal CSS confetti (no deps)
export const Confetti: React.FC<ConfettiProps> = ({ show, onDone, durationMs = 1500 }) => {
  React.useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onDone?.(), durationMs + 200);
    return () => clearTimeout(t);
  }, [show, onDone, durationMs]);

  if (!show) return null;

  const pieces = Array.from({ length: 60 }).map((_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 200,
    rotate: Math.random() * 360,
    color: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'][i % 5],
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1000 }} aria-hidden>
      {pieces.map((p, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            top: -20,
            left: `${p.left}%`,
            width: 8,
            height: 14,
            background: p.color,
            opacity: 0.9,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${durationMs}ms ease-in forwards`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.95; }
          50% { opacity: 0.9; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default Confetti;

