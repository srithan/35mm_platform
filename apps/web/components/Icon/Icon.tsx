import {
  Search,
  Users,
  Film,
  Ticket,
  Bell,
  User,
  Coins,
  Settings,
  Plus,
  Check,
  Heart,
  Bookmark,
  Repeat,
  Reply,
  BadgeCheck,
  VolumeX,
  Volume2,
  Play,
  ChevronUp,
  ChevronDown,
  Smile,
  MoreHorizontal,
  Paperclip,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  Globe,
  AlignLeft,
  Clapperboard,
  Image as ImageIcon,
  Star,
  Trash,
  Trash2,
  X,
  PenLine,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "home"
  | "search"
  | "discover"
  | "communities"
  | "frames"
  | "ticket"
  | "chat"
  | "bell"
  | "user"
  | "credits"
  | "settings"
  | "plus"
  | "check"
  | "heart"
  | "bookmark"
  | "repost"
  | "reply"
  | "badge-check"
  | "volume-x"
  | "volume-2"
  | "play"
  | "share-2"
  | "chevron-up"
  | "chevron-down"
  | "smile"
  | "more-horizontal"
  | "paperclip"
  | "chevrons-left"
  | "chevrons-right"
  | "arrow-left"
  | "globe"
  | "align-left"
  | "clapperboard"
  | "image"
  | "star"
  | "trash"
  | "trash-2"
  | "x"
  | "poll"
  | "quote";

const ICON_MAP: Record<Exclude<IconName, "home" | "chat" | "discover" | "share-2">, LucideIcon> = {
  search: Search,
  communities: Users,
  frames: Film,
  ticket: Ticket,
  bell: Bell,
  user: User,
  credits: Coins,
  settings: Settings,
  plus: Plus,
  check: Check,
  heart: Heart,
  bookmark: Bookmark,
  repost: Repeat,
  reply: Reply,
  "badge-check": BadgeCheck,
  "volume-x": VolumeX,
  "volume-2": Volume2,
  play: Play,
  "chevron-up": ChevronUp,
  "chevron-down": ChevronDown,
  smile: Smile,
  "more-horizontal": MoreHorizontal,
  paperclip: Paperclip,
  "chevrons-left": ChevronsLeft,
  "chevrons-right": ChevronsRight,
  "arrow-left": ArrowLeft,
  globe: Globe,
  "align-left": AlignLeft,
  clapperboard: Clapperboard,
  image: ImageIcon,
  star: Star,
  trash: Trash,
  "trash-2": Trash2,
  x: X,
  poll: BarChart3,
  quote: PenLine,
};

function IconHomeGlyph({
  className,
  filled,
  ...rest
}: React.ComponentProps<"svg"> & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...rest}
    >
      {filled ? (
        <path
          d="M9.0327 1.77305C10.7675 0.385221 13.2325 0.38522 14.9673 1.77305L21.2796 6.82293C22.525 7.81923 23.25 9.32762 23.25 10.9225V18C23.25 20.8995 20.8995 23.25 18 23.25H6C3.1005 23.25 0.75 20.8995 0.75 18V10.9225C0.75 9.32763 1.47497 7.81923 2.72035 6.82293L9.0327 1.77305Z"
          fill="currentColor"
        />
      ) : (
        <path
          clipRule="evenodd"
          fillRule="evenodd"
          d="M13.4056 3.72522C12.5838 3.06783 11.4162 3.06783 10.5944 3.72522L4.28209 8.7751C3.62975 9.29697 3.25 10.0871 3.25 10.9225V18C3.25 19.5188 4.48122 20.75 6 20.75H18C19.5188 20.75 20.75 19.5188 20.75 18V10.9225C20.75 10.0871 20.3703 9.29697 19.7179 8.7751L13.4056 3.72522ZM9.0327 1.77305C10.7675 0.385221 13.2325 0.38522 14.9673 1.77305L21.2796 6.82293C22.525 7.81923 23.25 9.32762 23.25 10.9225V18C23.25 20.8995 20.8995 23.25 18 23.25H6C3.1005 23.25 0.75 20.8995 0.75 18V10.9225C0.75 9.32763 1.47497 7.81923 2.72035 6.82293L9.0327 1.77305Z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

function IconChatGlyph({
  className,
  strokeW,
  filled,
  ...props
}: React.ComponentProps<"svg"> & { strokeW: number; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 22 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        d="M15.7405 19.6443L15.4875 19.4743H15.1828H5.83333C3.40097 19.4743 1.5 17.592 1.5 15.3557V5.11858C1.5 2.88229 3.40097 1 5.83333 1H16.5C18.9324 1 20.8333 2.88229 20.8333 5.11858V20.4743V22.9732C20.8324 22.9745 20.8309 22.9764 20.8285 22.9787C20.8184 22.9884 20.7986 23 20.7667 23C20.7436 23 20.7247 22.993 20.7126 22.9849L15.7405 19.6443Z"
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth={filled ? 0 : strokeW}
      />
    </svg>
  );
}

function IconDiscoverGlyph(props: React.ComponentProps<"svg">) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...rest}
    >
      <circle cx="12.5" cy="12" r="11" stroke="currentColor" strokeWidth={2} fill="none" />
      <path
        d="M9.64585 18.4148C9.31179 18.4148 9.1377 18.2158 9.03889 17.9197C8.74091 17.0157 8.41939 16.1117 8.13395 15.2077C8.04769 14.9226 7.91125 14.7738 7.62581 14.6751C6.73341 14.4025 5.84101 14.0813 4.94862 13.7961C4.63809 13.6974 4.40283 13.5486 4.40283 13.1898C4.40283 12.831 4.65063 12.6822 4.94862 12.5835C5.84101 12.2984 6.73341 11.9897 7.62581 11.7046C7.8987 11.6184 8.03515 11.4946 8.12141 11.2095C8.40685 10.3055 8.72836 9.40152 9.02635 8.49752C9.12515 8.18732 9.29924 7.96484 9.64585 7.96484C9.96893 7.97738 10.1289 8.19985 10.2293 8.48499C10.5147 9.36392 10.8237 10.2303 11.0966 11.1233C11.1954 11.457 11.382 11.6184 11.7035 11.7171C12.5708 11.9897 13.4397 12.2874 14.307 12.571C14.6175 12.6697 14.8528 12.831 14.8528 13.1773C14.8528 13.5235 14.6175 13.6849 14.307 13.7836C13.4021 14.0938 12.5097 14.4025 11.6173 14.6876C11.3318 14.7738 11.1954 14.9226 11.0966 15.2077C10.8237 16.0992 10.5022 16.9907 10.2167 17.8821C10.1305 18.1673 9.96893 18.3897 9.64585 18.4148Z"
        fill="currentColor"
        fillOpacity={0.45}
      />
      <path
        d="M15.4459 11.4491C15.2234 11.4491 15.108 11.3174 15.0404 11.1198C14.8427 10.5173 14.6268 9.91482 14.4372 9.31232C14.3795 9.12301 14.2889 9.02424 14.0994 8.95674C13.5044 8.77566 12.9094 8.56001 12.3144 8.3707C12.1084 8.30486 11.9502 8.20608 11.9502 7.96574C11.9502 7.72705 12.115 7.62828 12.3144 7.56078C12.9094 7.37147 13.5044 7.16405 14.0994 6.97474C14.2806 6.91712 14.3713 6.83482 14.429 6.6455C14.6185 6.043 14.8344 5.4405 15.0322 4.838C15.0981 4.63222 15.2135 4.48242 15.4459 4.48242C15.6601 4.49065 15.7689 4.63881 15.8348 4.82812C16.0244 5.41416 16.232 5.99197 16.4133 6.58624C16.4793 6.80848 16.6029 6.91548 16.8188 6.98297C17.3973 7.16405 17.9758 7.36324 18.5526 7.55255C18.7586 7.6184 18.9168 7.7254 18.9168 7.95751C18.9168 8.18798 18.7603 8.29498 18.5526 8.36247C17.9494 8.56824 17.3544 8.77566 16.7594 8.96497C16.5699 9.02259 16.4793 9.12136 16.4117 9.31067C16.2304 9.90494 16.0145 10.4992 15.8249 11.0935C15.7673 11.2844 15.6601 11.4326 15.4459 11.4491Z"
        fill="currentColor"
        fillOpacity={0.45}
      />
      <path
        d="M16.6013 18.4159C16.4532 18.4159 16.3762 18.3271 16.3317 18.1954C16.1999 17.7943 16.0562 17.3917 15.9302 16.9906C15.8917 16.8633 15.831 16.7982 15.705 16.7538C15.308 16.6324 14.9125 16.4904 14.5154 16.3631C14.3776 16.3187 14.2725 16.2535 14.2725 16.0937C14.2725 15.9339 14.3821 15.8687 14.5154 15.8243C14.9125 15.697 15.308 15.5609 15.705 15.4336C15.8265 15.3951 15.8873 15.3403 15.9258 15.2131C16.0532 14.812 16.1954 14.4094 16.3273 14.0083C16.3717 13.8706 16.4488 13.7715 16.6028 13.7715C16.7465 13.7774 16.8176 13.8766 16.8621 14.0024C16.9895 14.3931 17.1258 14.7779 17.2473 15.1746C17.2917 15.3226 17.3747 15.3951 17.5169 15.438C17.9021 15.5594 18.2887 15.6911 18.6739 15.8184C18.8117 15.8628 18.9169 15.9339 18.9169 16.0878C18.9169 16.2417 18.8117 16.3127 18.6739 16.3571C18.2724 16.4948 17.8754 16.6324 17.4784 16.7582C17.351 16.7967 17.2917 16.8633 17.2473 16.9891C17.1258 17.3858 16.9836 17.781 16.8562 18.1776C16.8162 18.3064 16.7436 18.4056 16.6013 18.4159Z"
        fill="currentColor"
        fillOpacity={0.45}
      />
    </svg>
  );
}

function IconShareGlyph(props: React.ComponentProps<"svg">) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 12 12"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...rest}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.55157 10.9001C5.68143 10.96 5.81628 10.99 5.95113 10.99V11C6.1659 11 6.37566 10.9251 6.55047 10.7802L11.0006 7.06854C11.3202 6.80378 11.5 6.41413 11.5 5.9995C11.5 5.58488 11.3202 5.19523 11.0006 4.93047L6.55047 1.21881C6.26579 0.984022 5.8862 0.934067 5.55157 1.08893C5.22194 1.24379 5.01217 1.5685 5.01217 1.93816V4.0113C3.63369 4.10621 2.5399 4.58578 1.76076 5.45C0.287392 7.07354 0.507149 9.4414 0.517138 9.54131C0.537116 9.74613 0.681956 9.91598 0.881735 9.97093C1.08151 10.0309 1.29128 9.95594 1.41614 9.79109C2.55489 8.27246 4.00828 8.03767 5.01217 8.0027V10.0509C5.01217 10.4155 5.21694 10.7452 5.55157 10.9001ZM6.00607 7.49316C6.00607 7.21841 5.78132 6.99361 5.50662 6.99361C4.64757 6.99361 3.03935 6.9986 1.58096 8.18254C1.68585 7.52813 1.94056 6.73884 2.50494 6.1144C3.1792 5.37007 4.18808 4.99541 5.50662 4.99541C5.78132 4.99541 6.00607 4.77061 6.00607 4.49586V2.06805L10.3613 5.69478C10.4811 5.79469 10.5011 5.92457 10.5011 5.99451C10.5011 6.06445 10.4811 6.19433 10.3613 6.29424L6.00607 9.92097V7.49316Z"
      />
    </svg>
  );
}

export interface IconProps extends React.ComponentProps<"svg"> {
  name: IconName;
  className?: string;
  strokeWidth?: number;
  /** When `name` is `home` or `chat`, render the solid/filled glyph (e.g. active nav). */
  filled?: boolean;
}

export function Icon({ name, className, strokeWidth = 1.6, filled, ...props }: IconProps) {
  if (name === "home") {
    return <IconHomeGlyph filled={filled} className={className} {...props} />;
  }
  if (name === "chat") {
    return (
      <IconChatGlyph
        className={className}
        strokeW={strokeWidth}
        filled={filled}
        {...props}
      />
    );
  }
  if (name === "discover") {
    return <IconDiscoverGlyph className={className} {...props} />;
  }
  if (name === "share-2") {
    return <IconShareGlyph className={className} {...props} />;
  }

  const Comp = ICON_MAP[name];
  if (!Comp) return null;

  return <Comp className={className} strokeWidth={strokeWidth} {...props} />;
}
