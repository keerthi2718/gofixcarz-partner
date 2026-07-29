/**
 * Drop-in replacement for `<Feather name="..." />` from @expo/vector-icons.
 * Uses lucide-react-native (SVG-based) so no font loading is required —
 * fixes the Android Expo Go / New Architecture font-registry issue where
 * font-based icons (PUA glyphs) show as tofu boxes on Android Fabric.
 *
 * Icon name mapping: Feather → lucide-react-native v1.27.0
 * Some icons were renamed in lucide (e.g. home→House, pie-chart→ChartPie).
 */

import React from 'react';
import {
  AlertCircle,   // kept as alias below
  ArrowLeft,
  ArrowRight,
  Bell,
  Briefcase,
  Calendar,
  Camera,
  ChartBar,
  Circle,
  CircleHelp,
  ClipboardList,
  CreditCard,
  ChartPie,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  DollarSign,
  Download,
  Droplet,
  Eye,
  EyeOff,
  File,
  FileText,
  Flag,
  GitBranch,
  Globe,
  Grid2x2,
  Hash,
  House,
  Image,
  Info,
  LogOut,
  Mail,
  MapPin,
  MoreHorizontal,
  Minus,
  Moon,
  Navigation,
  Package,
  Pencil,
  Percent,
  Phone,
  Plus,
  Search,
  Settings,
  Share2,
  Shield,
  SlidersHorizontal,
  Star,
  Sun,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  Upload,
  User,
  UserCheck,
  Users,
  WifiOff,
  Wrench,
  X,
  Zap,
  LucideProps,
} from 'lucide-react-native';

/** Feather icon name → lucide-react-native component */
const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  'alert-circle':   CircleAlert,
  'arrow-left':     ArrowLeft,
  'arrow-right':    ArrowRight,
  'bar-chart-2':    ChartBar,
  bell:             Bell,
  briefcase:        Briefcase,
  calendar:         Calendar,
  camera:           Camera,
  check:            Check,
  'check-circle':   CircleCheck,
  'chevron-down':   ChevronDown,
  circle:           Circle,
  'chevron-right':  ChevronRight,
  clock:            Clock,
  'credit-card':    CreditCard,
  'dollar-sign':    DollarSign,
  download:         Download,
  droplet:          Droplet,
  'edit-2':         Pencil,
  eye:              Eye,
  'eye-off':        EyeOff,
  clipboard:        ClipboardList,
  file:             File,
  'file-text':      FileText,
  flag:             Flag,
  'git-branch':     GitBranch,
  globe:            Globe,
  grid:             Grid2x2,
  'help-circle':    CircleHelp,
  hash:             Hash,
  home:             House,
  image:            Image,
  info:             Info,
  'log-out':        LogOut,
  'map-pin':        MapPin,
  'more-horizontal': MoreHorizontal,
  minus:            Minus,
  moon:             Moon,
  navigation:       Navigation,
  package:          Package,
  percent:          Percent,
  'pie-chart':      ChartPie,
  plus:             Plus,
  search:           Search,
  settings:         Settings,
  'share-2':        Share2,
  shield:           Shield,
  sliders:          SlidersHorizontal,
  star:             Star,
  sun:              Sun,
  tag:              Tag,
  tool:             Wrench,
  'trash-2':        Trash2,
  'trending-up':    TrendingUp,
  truck:            Truck,
  upload:           Upload,
  user:             User,
  'user-check':     UserCheck,
  users:            Users,
  mail:             Mail,
  phone:            Phone,
  'wifi-off':       WifiOff,
  x:                X,
  'x-circle':       CircleX,
  zap:              Zap,
};

export interface FeatherProps {
  name: string;
  size?: number;
  color?: string;
  style?: LucideProps['style'];
}

/**
 * SVG-based replacement for `@expo/vector-icons` Feather.
 * Accepts the same `name`, `size`, `color` props.
 */
export function Feather({ name, size = 24, color, style }: FeatherProps) {
  const Icon = ICON_MAP[name];
  if (!Icon) {
    if (__DEV__) console.warn(`[FeatherIcon] Unknown icon name: "${name}"`);
    return null;
  }
  return <Icon size={size} color={color} style={style} />;
}

// Named export so callers can do: import { Feather } from '…/FeatherIcon'
export default Feather;
