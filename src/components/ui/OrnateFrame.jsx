import styles from './ui.module.css';
import { CornerVignette } from './ornaments/index.js';

export default function OrnateFrame({ variant = 'full', children, className = '' }) {
  if (variant === 'simple') {
    return <div className={`${styles.frameSimple} ${className}`}>{children}</div>;
  }
  if (variant === 'cartouche') {
    return <div className={`${styles.frameCartouche} ${className}`}>{children}</div>;
  }
  return (
    <div className={`${styles.frame} ${className}`}>
      <CornerVignette size={48} className={`${styles.frameCorner} ${styles.frameCornerTL}`} rotate={0} />
      <CornerVignette size={48} className={`${styles.frameCorner} ${styles.frameCornerTR}`} rotate={90} />
      <CornerVignette size={48} className={`${styles.frameCorner} ${styles.frameCornerBR}`} rotate={180} />
      <CornerVignette size={48} className={`${styles.frameCorner} ${styles.frameCornerBL}`} rotate={270} />
      {children}
    </div>
  );
}
