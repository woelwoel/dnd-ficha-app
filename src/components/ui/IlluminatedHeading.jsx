import styles from './ui.module.css';

const levelClass = { 1: styles.headingL1, 2: styles.headingL2, 3: styles.headingL3 };

export default function IlluminatedHeading({ level = 2, children, className = '' }) {
  const Tag = `h${level}`;
  return (
    <div className={`${styles.headingWrap} ${className}`}>
      <div className={styles.headingRule}>
        <span className={styles.headingLine} />
        <Tag className={`${styles.headingText} ${levelClass[level]}`}>{children}</Tag>
        <span className={styles.headingLine} />
      </div>
    </div>
  );
}
