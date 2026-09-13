import {
  BarChart2,
  BookOpen,
  CheckCircle,
  Code2,
  FileText,
  Flag,
  GraduationCap,
  Heart,
  MessageSquare,
  Minus,
  Palette,
  Tag,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import type { FormatEnum } from "@/types";

export const WRITING_STYLES = [
  "Technical",
  "Storytelling",
  "Opinion/Controversial",
  "Educational",
  "Career/Soft Skills",
  "Humor/Technology",
  "Minimalist",
  "Case Study",
  "Trends/News",
  "Personal/Autobiographical",
] as const;

export const TARGET_AUDIENCES = [
  "Junior Developers",
  "Mid Developers",
  "Senior Developers",
  "Tech Leads / Architects",
  "Managers / CTOs",
  "Full Stack",
  "Backend",
  "Frontend",
  "DevOps / SRE",
  "Data / AI",
  "Mobile",
  "General / All",
] as const;

export const EXPERIENCE_LEVELS = [
  "Beginner (0-2 years)",
  "Intermediate (2-5 years)",
  "Advanced (5-10 years)",
  "Expert (10+ years)",
] as const;

export const CONTENT_GOALS = [
  "Engagement / Comments",
  "Authority / Personal Branding",
  "Lead Generation / Sales",
  "Networking / Connections",
  "Educate / Share Knowledge",
  "Attract Opportunities / Hiring",
] as const;

export const FORMATS: FormatEnum[] = [
  "Listicle (5 tips, 3 mistakes...)",
  "Storytelling (Personal story)",
  "Before/After (Transformation)",
  "Open Question (Engagement)",
  "Strong Opinion (Controversial)",
  "Mini Tutorial (Step by step)",
];

export const FORMAT_DESCRIPTIONS: Record<FormatEnum, string> = {
  "Listicle (5 tips, 3 mistakes...)":
    "Numbered list with practical tips.",

  "Storytelling (Personal story)":
    "Engaging personal narrative.",

  "Before/After (Transformation)":
    "Before and after comparison.",

  "Open Question (Engagement)":
    "Question designed to generate comments.",

  "Strong Opinion (Controversial)":
    "Controversial opinion designed for debate.",

  "Mini Tutorial (Step by step)":
    "Clear step-by-step tutorial.",
};

export const STYLE_ICONS = {
  Technical: Code2,
  Storytelling: BookOpen,
  "Opinion/Controversial": MessageSquare,
  Educational: GraduationCap,
  "Career/Soft Skills": Users,
  "Humor/Technology": Zap,
  Minimalist: Minus,
  "Case Study": BarChart2,
  "Trends/News": TrendingUp,
  "Personal/Autobiographical": Heart,
};

export const STATUS_LABELS = {
  completed: {
    label: "Concluído",
    variant: "success",
  },
  processing: {
    label: "Processando",
    variant: "warning",
  },
  pending: {
    label: "Pendente",
    variant: "neutral",
  },
  failed: {
    label: "Erro",
    variant: "danger",
  },
  cancelled: {
    label: "Cancelado",
    variant: "neutral",
  },
} as const;

export const RESULT_TABS = [
  {
    key: "posts",
    label: "Posts",
    icon: FileText,
    description: "Post variations",
  },
  {
    key: "code",
    label: "Code",
    icon: Code2,
    description: "Code examples",
  },
  {
    key: "hashtags",
    label: "Hashtags",
    icon: Tag,
    description: "Suggested tags",
  },
  {
    key: "hooks",
    label: "Hooks",
    icon: Flag,
    description: "Opening hooks",
  },
  {
    key: "review",
    label: "Review",
    icon: CheckCircle,
    description: "Quality analysis",
  },
  {
    key: "visual",
    label: "Visual",
    icon: Palette,
    description: "Visual identity",
  },
] as const;

export const STYLE_OPTIONS = WRITING_STYLES.map((style) => ({
  value: style,
  label: style,
}));

export const AUDIENCE_OPTIONS = TARGET_AUDIENCES.map((audience) => ({
  value: audience,
  label: audience,
}));

export const EXPERIENCE_OPTIONS = EXPERIENCE_LEVELS.map((level) => ({
  value: level,
  label: level,
}));

export const OBJECTIVE_OPTIONS = CONTENT_GOALS.map((goal) => ({
  value: goal,
  label: goal,
}));

export const FORMAT_OPTIONS = FORMATS.map((format) => ({
  value: format,
  label: format,
}));

export const QUANTITY_OPTIONS = Array.from({ length: 10 }, (_, index) => {
  const quantity = index + 1;

  return {
    value: String(quantity),
    label: `${quantity} ${quantity === 1 ? "post" : "posts"}`,
  };
});

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "pt", label: "Portuguese" },
  { value: "es", label: "Spanish" },
] ;
