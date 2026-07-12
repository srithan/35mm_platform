import type { LucideIcon } from "lucide-react";
import {
  Ban,
  Copyright,
  Eye,
  HeartPulse,
  Megaphone,
  MessageSquareWarning,
  MoreHorizontal,
  ShieldAlert,
  UserRoundX,
} from "lucide-react";
import type { ModerationReportReason } from "@35mm/types";

export interface ReportReasonOption {
  value: ModerationReportReason;
  label: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Reason rows shown in the report flow. Order is deliberate: everyday reasons
 * first, gravest reasons grouped, "Something else" last. Copy is human-facing;
 * `value` maps 1:1 to `moderationReportReasonSchema` in @35mm/validators.
 */
export var REPORT_REASONS: ReportReasonOption[] = [
  {
    value: "spam",
    label: "Spam",
    description: "Repetitive, misleading, or unwanted promotion",
    icon: Megaphone,
  },
  {
    value: "harassment",
    label: "Harassment or bullying",
    description: "Targeted abuse, threats, or intimidation",
    icon: MessageSquareWarning,
  },
  {
    value: "hate_speech",
    label: "Hate speech",
    description: "Attacks based on identity or protected traits",
    icon: ShieldAlert,
  },
  {
    value: "violence",
    label: "Violence or threats",
    description: "Threats or glorification of violence",
    icon: Ban,
  },
  {
    value: "nudity_sexual_content",
    label: "Nudity or sexual content",
    description: "Explicit or non-consensual sexual material",
    icon: Eye,
  },
  {
    value: "misinformation",
    label: "Misinformation",
    description: "False claims that could cause harm",
    icon: MessageSquareWarning,
  },
  {
    value: "self_harm",
    label: "Self-harm or suicide",
    description: "Content encouraging self-injury",
    icon: HeartPulse,
  },
  {
    value: "impersonation",
    label: "Impersonation",
    description: "Pretending to be someone else",
    icon: UserRoundX,
  },
  {
    value: "intellectual_property",
    label: "Intellectual property",
    description: "Copyright or trademark infringement",
    icon: Copyright,
  },
  {
    value: "other",
    label: "Something else",
    description: "A concern that doesn't fit the categories above",
    icon: MoreHorizontal,
  },
];

/** Max length enforced by `createReportSchema.details` in @35mm/validators. */
export var REPORT_DETAILS_MAX = 2000;

export function reasonLabel(reason: ModerationReportReason): string {
  for (var i = 0; i < REPORT_REASONS.length; i++) {
    if (REPORT_REASONS[i].value === reason) return REPORT_REASONS[i].label;
  }
  return "Report";
}
