import styles from './ui.module.css';

export default function Page({ side = 'left', children, className = '' }) {
  const sideClass = side === 'right' ? styles.pageRight : styles.pageLeft;
  return <div className={`${styles.page} ${sideClass} ${className}`}>{children}</div>;
}
