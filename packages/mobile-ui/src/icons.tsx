import type { ComponentType } from "react";
import {
  Archive,
  ArrowLeft,
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Clapperboard,
  Compass,
  EyeOff,
  Film,
  Folder,
  Globe,
  Heart,
  Home,
  Image,
  Lock,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  PenLine,
  Play,
  Plus,
  RefreshCw,
  Repeat2,
  Reply,
  Search,
  Settings,
  Share2,
  ShieldAlert,
  Smile,
  SquarePen,
  Star,
  Trash2,
  User,
  WifiOff,
  X,
  type LucideProps,
} from "lucide-react-native";
import { size as sizeTokens } from "@35mm/design-tokens";
import { useMobileUI } from "./theme";

export type AppIconName =
  | "archive"
  | "back"
  | "bell"
  | "bookmark"
  | "calendar"
  | "check"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "chevron-up"
  | "clapperboard"
  | "close"
  | "compose"
  | "discover"
  | "eye-off"
  | "film"
  | "folder"
  | "globe"
  | "heart"
  | "home"
  | "image"
  | "lock"
  | "menu"
  | "message"
  | "more"
  | "paperclip"
  | "play"
  | "plus"
  | "quote"
  | "refresh"
  | "reply"
  | "repost"
  | "search"
  | "settings"
  | "share"
  | "shield-alert"
  | "smile"
  | "star"
  | "trash"
  | "user"
  | "warning"
  | "wifi-off";

const ICONS = {
  archive: Archive,
  back: ArrowLeft,
  bell: Bell,
  bookmark: Bookmark,
  calendar: CalendarDays,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "chevron-up": ChevronUp,
  clapperboard: Clapperboard,
  close: X,
  compose: SquarePen,
  discover: Compass,
  "eye-off": EyeOff,
  film: Film,
  folder: Folder,
  globe: Globe,
  heart: Heart,
  home: Home,
  image: Image,
  lock: Lock,
  menu: Menu,
  message: MessageCircle,
  more: MoreHorizontal,
  paperclip: Paperclip,
  play: Play,
  plus: Plus,
  quote: PenLine,
  refresh: RefreshCw,
  reply: Reply,
  repost: Repeat2,
  search: Search,
  settings: Settings,
  share: Share2,
  "shield-alert": ShieldAlert,
  smile: Smile,
  star: Star,
  trash: Trash2,
  user: User,
  warning: CircleAlert,
  "wifi-off": WifiOff,
} as const satisfies Record<AppIconName, ComponentType<LucideProps>>;

export type AppIconSize = keyof typeof sizeTokens.icon;

export interface AppIconProps {
  readonly name: AppIconName;
  readonly size?: AppIconSize | number;
  readonly color?: string;
  readonly strokeWidth?: number;
  readonly filled?: boolean;
  readonly accessibilityLabel?: string;
  readonly testID?: string;
}

function resolveIconSize(iconSize: AppIconSize | number): number {
  return typeof iconSize === "number" ? iconSize : sizeTokens.icon[iconSize];
}

export function AppIcon({
  name,
  size = "medium",
  color,
  strokeWidth = 1.8,
  filled = false,
  accessibilityLabel,
  testID,
}: AppIconProps) {
  const { theme } = useMobileUI();
  const IconComponent = ICONS[name];
  const resolvedColor = color ?? theme.colors.text;

  return (
    <IconComponent
      testID={testID}
      size={resolveIconSize(size)}
      color={resolvedColor}
      strokeWidth={strokeWidth}
      fill={filled ? resolvedColor : "none"}
      accessibilityLabel={accessibilityLabel}
      accessible={accessibilityLabel !== undefined}
    />
  );
}
