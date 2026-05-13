import styles from './ui.module.css';

const variantClass = {
  primary: styles.tomeBtnPrimary,
  secondary: '',
  danger: styles.tomeBtnDanger,
};

export default function TomeButton({
  variant = 'secondary',
  type = 'button',
  children,
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`${styles.tomeBtn} ${variantClass[variant] || ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
