import React, { useRef, useState } from 'react';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}

export const Card = ({ children, className = '', interactive = false, ...props }: CardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPosition({ x, y });

    if (interactive) {
      // Calculate 3D tilt
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -5; // max tilt 5 deg
      const rotateY = ((x - centerX) / centerX) * 5;
      setRotation({ x: rotateX, y: rotateY });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (interactive) setRotation({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`${styles.card} ${interactive ? styles.interactive : ''} ${className}`}
      style={{
        ...props.style,
        '--mouse-x': `${position.x}px`,
        '--mouse-y': `${position.y}px`,
        '--rotate-x': `${rotation.x}deg`,
        '--rotate-y': `${rotation.y}deg`,
      } as React.CSSProperties}
      {...props}
    >
      <div className={styles.spotlight} style={{ opacity: isHovered ? 1 : 0 }} />
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }: CardProps) => (
  <div className={`${styles.header} ${className}`} {...props}>{children}</div>
);

export const CardTitle = ({ children, className = '', ...props }: CardProps) => (
  <h3 className={`${styles.title} ${className}`} {...props}>{children}</h3>
);

export const CardSubtitle = ({ children, className = '', ...props }: CardProps) => (
  <p className={`${styles.subtitle} ${className}`} {...props}>{children}</p>
);

export const CardBody = ({ children, className = '', ...props }: CardProps) => (
  <div className={`${styles.body} ${className}`} {...props}>{children}</div>
);

export const CardFooter = ({ children, className = '', ...props }: CardProps) => (
  <div className={`${styles.footer} ${className}`} {...props}>{children}</div>
);
