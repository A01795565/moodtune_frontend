import React from 'react';
import './AppButton.css';

type ButtonProps = {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'md' | 'sm';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
  ariaPressed?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export default function AppButton({
  children,
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  size = 'md',
  onClick,
  ariaLabel,
  ariaPressed,
  className,
  style,
}: ButtonProps) {
  const classes = [
    'btn',
    variant === 'primary' ? 'btn--primary' : 'btn--ghost',
    fullWidth ? 'btn--full' : '',
    size === 'sm' ? 'btn--sm' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      style={style}
    >
      {children}
    </button>
  );
}
