import styles from './ui.module.css';

export default function Cartouche({ shape = 'oval', children, className = '' }) {
  const cls = shape === 'shield' ? styles.cartoucheShield : styles.cartoucheOval;
  return <div className={`${cls} ${className}`}>{children}</div>;
}
