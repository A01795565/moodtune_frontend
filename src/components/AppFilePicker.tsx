import React, { useId, useRef, useState } from 'react';
import AppButton from './AppButton';
import './AppFilePicker.css';

type Props = {
  file: File | null;
  previewUrl?: string | null;
  onChange: (file: File | null) => void;
  onClear?: () => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  description?: string;
  errorText?: string | null;
  useDropzone?: boolean;
  disabled?: boolean;
};

export default function AppFilePicker({
  file,
  previewUrl,
  onChange,
  onClear,
  accept = 'image/*',
  maxSizeMB = 8,
  label = 'Seleccionar imagen',
  description,
  errorText,
  useDropzone = false,
  disabled = false,
}: Props) {
  const inputId = useId();
  const inputEl = useRef<HTMLInputElement | null>(null); // <- NUEVO
  const [drag, setDrag] = useState(false);

  const handleInput = (f: File | null) => onChange(f || null);

  const handleDrop: React.DragEventHandler<HTMLLabelElement> = (e) => {
    e.preventDefault();
    if (disabled) return;
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    handleInput(f || null);
  };

  const prettySize = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;

  return (
    <div className="picker">
      <div className="picker__row">
        {/* input real (oculto pero EN EL DOM) */}
        <input
          id={inputId}
          ref={inputEl}                              // <- NUEVO
          className="picker__input"
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(e) => handleInput(e.target.files?.[0] || null)}
        />

        {/* BOTÓN que abre el file picker */}
        <AppButton
          variant="ghost"
          disabled={disabled}
          onClick={() => inputEl.current?.click()}
        >
          {label}
        </AppButton>

        {onClear && (
          <AppButton variant="ghost" onClick={onClear} disabled={disabled || !file}>
            Limpiar
          </AppButton>
        )}

        {previewUrl && (
          <div className="picker__thumb" aria-hidden>
            <img src={previewUrl} alt="" />
          </div>
        )}
      </div>

      <div className="picker__filename">
        {file ? (
          <>Archivo: <strong>{file.name}</strong> — {prettySize(file.size)}</>
        ) : (
          <>Ningún archivo seleccionado</>
        )}
      </div>

      {useDropzone && file === null && (
            <label
            htmlFor={inputId}
            className={`drop ${drag ? 'is-dragging' : ''} ${errorText ? 'is-invalid' : ''}`}
            onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
        >
            <div className="drop__icon" aria-hidden>⬆︎</div>
            <div className="drop__title">Arrastra una imagen aquí</div>
            <div className="drop__hint">o haz clic para seleccionar</div>
        </label>
      )}

      <div className="picker__restrictions">
        {description
          ? description
          : <>Formatos permitidos: <strong>{accept}</strong> • Límite: <strong>{maxSizeMB} MB</strong></>}
      </div>
      {errorText && <div className="error" style={{ fontSize: 13 }}>{errorText}</div>}
    </div>
  );
}
