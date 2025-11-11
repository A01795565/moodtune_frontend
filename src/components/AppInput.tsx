import React, { InputHTMLAttributes, useId, useState } from 'react';
import Button from './AppButton';
import './AppInput.css';

type BaseProps = {
  label: string;
  error?: string | null;
  hint?: string;
  rightAddon?: React.ReactNode;
};

type Props = BaseProps & InputHTMLAttributes<HTMLInputElement>;

export function AppInput({ label, error, hint, id, rightAddon, ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = hint ? `${inputId}-hint` : undefined;

  return (
    <div className="field">
      <label className="label" htmlFor={inputId}>{label}</label>
      <div className="input-row">
        <input
          id={inputId}
          className="input"
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {rightAddon}
      </div>
      {hint && <div id={describedBy} className="hint">{hint}</div>}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

export function PasswordInput({
  label,
  error,
  hint,
  id,
  ...rest
}: Props) {
  const [show, setShow] = useState(false);
  return (
    <AppInput
      label={label}
      error={error}
      hint={hint}
      id={id}
      type={show ? 'text' : 'password'}
      rightAddon={
        <Button
          type="button"
          variant="ghost"
          ariaLabel={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          onClick={() => setShow(v => !v)}
        >
          {show ? 'Ocultar' : 'Mostrar'}
        </Button>
      }
      {...rest}
    />
  );
}
