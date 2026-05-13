import { DropCapFrame } from './ornaments/index.js';

export default function DropCap({ children, className = '' }) {
  const letter = typeof children === 'string' ? children.charAt(0).toUpperCase() : children;
  return <DropCapFrame className={className}>{letter}</DropCapFrame>;
}
