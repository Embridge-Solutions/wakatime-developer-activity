import { InputComponentInterface } from '@/utils/types';
import { cn } from '@/lib/utils';

/** Standard labelled text input — look comes from `.ui-field/.ui-label/.ui-input` in globals.css. */
const InputComponent = ({
  label,
  type,
  readOnly,
  required,
  name,
  value,
  className,
  handleChange,
  onChange,
  placeholder,
}: InputComponentInterface) => {
  return (
    <div className='ui-field'>
      <label htmlFor={name} className='ui-label'>
        <span className={cn(required && 'ui-label-required')}>{label}</span>
      </label>
      <input
        id={name}
        type={type}
        readOnly={readOnly || false}
        required={required}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={onChange || handleChange}
        className={cn('ui-input', className)}
      />
    </div>
  );
};

export default InputComponent;
