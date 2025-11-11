import React from 'react';
import './AppButton.css';

type ButtonProps = {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
};

export default function AppButton({
  children,
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  ariaLabel,
}: ButtonProps) {
  const className = [
    'btn',
    variant === 'primary' ? 'btn--primary' : 'btn--ghost',
    fullWidth ? 'btn--full' : '',
  ].join(' ');

  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
