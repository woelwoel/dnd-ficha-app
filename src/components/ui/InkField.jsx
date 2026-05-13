import { forwardRef, useId } from 'react';
import styles from './ui.module.css';

const InkField = forwardRef(function InkField(
  { label, type = 'text', className = '', id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={`${styles.inkField} ${className}`}>
      {label && <label className={styles.inkLabel} htmlFor={inputId}>{label}</label>}
      <input ref={ref} id={inputId} type={type} className={styles.inkInput} {...rest} />
    </div>
  );
});

export default InkField;
