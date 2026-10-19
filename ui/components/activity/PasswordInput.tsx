'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  help?: React.ReactNode;
  autoComplete?: string;
};

/** Labelled password box with a show / hide button. */
export default function PasswordInput({ id, label, value, onChange, required, placeholder, help, autoComplete = 'off' }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="ui-field">
      <label htmlFor={id} className="ui-label">
        <span className={required ? 'ui-label-required' : undefined}>{label}</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className="ui-input pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {help && <span className="mt-1 block text-[12px] text-slate-500">{help}</span>}
    </div>
  );
}
