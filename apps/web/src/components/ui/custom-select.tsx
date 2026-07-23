'use client';

interface CustomSelectProps {
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

export function CustomSelect({
  name = '',
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  error = false,
}: CustomSelectProps) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={{
        width: '100%',
        height: 38,
        padding: '0 32px 0 12px',
        borderRadius: 8,
        border: `1px solid ${error ? '#DC2626' : 'var(--border)'}`,
        background: disabled
          ? 'var(--surface2)'
          : error
          ? 'rgba(220,38,38,0.04)'
          : 'var(--card)',
        color: value ? 'var(--text-primary)' : 'var(--text-faint)',
        fontSize: 13,
        fontFamily: 'var(--font-sans)',
        fontWeight: 400,
        outline: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        appearance: 'none',
        WebkitAppearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%236B8070' d='M1 0l5 6 5-6z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        backgroundSize: '10px',
        transition: 'border-color 150ms, box-shadow 150ms',
      }}
      onFocus={e => {
        if (!disabled) {
          e.currentTarget.style.borderColor = 'var(--primary)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,123,69,0.10)';
        }
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = error ? '#DC2626' : 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <option value="" style={{ color: 'var(--text-faint)' }}>{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value} style={{ color: 'var(--text-primary)' }}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
