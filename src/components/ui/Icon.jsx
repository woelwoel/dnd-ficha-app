import {
  Dices, Shield, Sword, Swords, Heart, Skull, Footprints, Lock, Info,
  Flame, Check, X, AlertTriangle, Sparkles, Music, ArrowUp, ArrowDown,
  Wand2, Lightbulb, Backpack, ScrollText, BookOpen, Leaf, Target,
  PawPrint, Eye, Zap, Download, Upload, Printer,
} from 'lucide-react'

/**
 * Registry semântico — UI usa nomes ("dice", "shield"), não nomes do Lucide.
 *
 * Desacopla a app da biblioteca de ícones (se um dia substituir Lucide
 * por Tabler, Heroicons, SVGs próprios — basta editar este arquivo).
 *
 * Convenção: nome em kebab-case, semântico (ação/conceito), não estético.
 *   - dice (não "d20"): qualquer rolagem
 *   - magic (não "purple-orb"): conjuração / efeito mágico
 *   - move (não "footprints"): velocidade / movimento
 *
 * Glifos tipográficos (★ ❦ ❧ ⁂ ◆ ◇ ✦ etc) NÃO devem vir pra cá — são
 * decoração de pergaminho e renderizam consistente entre OSs porque
 * são caracteres puros (sem variation selector emoji).
 */
const REGISTRY = {
  dice:         Dices,
  shield:       Shield,
  sword:        Sword,
  swords:       Swords,
  heart:        Heart,
  skull:        Skull,
  move:         Footprints,
  lock:         Lock,
  info:         Info,
  fire:         Flame,
  check:        Check,
  close:        X,
  warning:      AlertTriangle,
  sparkle:      Sparkles,
  music:        Music,
  'arrow-up':   ArrowUp,
  'arrow-down': ArrowDown,
  magic:        Wand2,
  idea:         Lightbulb,
  backpack:     Backpack,
  scroll:       ScrollText,
  book:         BookOpen,
  leaf:         Leaf,
  target:       Target,
  paw:          PawPrint,
  eye:          Eye,
  bolt:         Zap,
  download:     Download,
  upload:       Upload,
  print:        Printer,
}

const SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
}

/**
 * Ícone consistente entre OSs (substitui emojis com renderização variável).
 *
 * Props:
 *  - name        : chave do REGISTRY acima (obrigatório)
 *  - size        : preset ("xs"|"sm"|"md"|"lg"|"xl"|"2xl") ou número em px
 *  - className   : passada pro SVG (use pra cor via text-*: stroke = currentColor)
 *  - strokeWidth : padrão 2 (Lucide). 1.5 fica mais delicado.
 *  - decorative  : se false, ícone vira aria-hidden=false (usar com label próprio
 *                  ou aria-label no parent). Padrão true (decorativo).
 *
 * Cor: herda do parent via `currentColor`. Pra mudar use `text-amber-700` etc.
 */
export function Icon({
  name,
  size = 'md',
  className = '',
  strokeWidth = 2,
  decorative = true,
  ...rest
}) {
  const Cmp = REGISTRY[name]
  if (!Cmp) {
    if (import.meta.env?.DEV) {
      console.warn(`[Icon] nome desconhecido: "${name}". Adicione em ui/Icon.jsx.`)
    }
    return null
  }
  const px = typeof size === 'number' ? size : (SIZES[size] ?? SIZES.md)
  return (
    <Cmp
      size={px}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={decorative ? 'true' : undefined}
      {...rest}
    />
  )
}
