interface DotSpinnerProps {
  size?: number;
  className?: string;
}

export function DotSpinner({ size = 32, className = '' }: DotSpinnerProps) {
  return (
    <div className={`dot-spinner ${className}`} style={{ width: size, height: size }} aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="dot-spinner-dot" />
      ))}
    </div>
  );
}
