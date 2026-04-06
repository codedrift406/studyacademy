import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', icon, ...props }, ref) => {
    const fallbackId = React.useId();
    const inputId = props.id || fallbackId;

    return (
      <div className={`${styles.container} ${className}`}>
        {label && <label className={styles.label} htmlFor={inputId}>{label}</label>}
        <div className={styles.inputWrapper}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`glass-input ${styles.input} ${icon ? styles.hasIcon : ''}`}
            {...props}
          />
        </div>
        {error && <span className={styles.errorInfo}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
