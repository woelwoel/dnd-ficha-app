import styles from './ui.module.css';

export default function BookSpread({ children, className = '' }) {
  return <div className={`${styles.spread} ${className}`}>{children}</div>;
}
