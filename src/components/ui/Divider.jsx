import styles from './ui.module.css';
import { Flourish } from './ornaments/index.js';

export default function Divider({ variant = 'line', className = '' }) {
  if (variant === 'flourish' || variant === 'icon') {
    return (
      <div className={`${styles.dividerFlourish} ${className}`}>
        <Flourish width={220} />
      </div>
    );
  }
  return <hr className={`${styles.dividerLine} ${className}`} />;
}
