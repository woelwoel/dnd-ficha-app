import styles from './ui.module.css';
import * as Icons from './ornaments/index.js';

const map = {
  sword: Icons.SwordIcon,
  shield: Icons.ShieldIcon,
  spell: Icons.SpellIcon,
  die: Icons.DieIcon,
  chalice: Icons.ChaliceIcon,
  scroll: Icons.ScrollIcon,
  rune: Icons.RuneIcon,
  crown: Icons.CrownIcon,
};

export default function MarginalIcon({ icon = 'sword', side = 'left', top = '1rem', size = 32 }) {
  const Cmp = map[icon] || Icons.SwordIcon;
  const sideCls = side === 'right' ? styles.marginalRight : styles.marginalLeft;
  return (
    <div className={`${styles.marginalIcon} ${sideCls}`} style={{ top }}>
      <Cmp width={size} height={size} />
    </div>
  );
}
