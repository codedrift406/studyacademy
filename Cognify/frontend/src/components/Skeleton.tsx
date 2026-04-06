import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  lines?: number;
  width?: string;
  height?: string;
  style?: CSSProperties;
  className?: string;
}

export const Skeleton = ({
  lines = 1,
  width = '100%',
  height = '1rem',
  style,
  className = '',
}: SkeletonProps) => {
  return (
    <div className={`${styles.skeletonWrapper} ${className}`} style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={styles.skeletonLine}
          style={{
            width: index === lines - 1 ? width : '100%',
            height,
          }}
        />
      ))}
    </div>
  );
};
