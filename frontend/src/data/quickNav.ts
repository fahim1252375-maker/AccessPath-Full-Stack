import type { UserRole } from "../../../shared/types.ts";

/**
 * Search and navigation helpers shared by the command palette and route tracker.
 * Navigation destinations mirror the routes and role gates in AppRouter.tsx.
 */

export type NavGroup = "Navigate" | "Report & Community" | "Operations" | "Help & Info";

export interface QuickNavDestination {
  id: string;
  to: string;
  label: string;
  labelBn: string;
  group: NavGroup;
  keywords: string[];
  roles?: UserRole[];
}

export interface SearchableQuickNavItem {
  label: string;
  labelBn?: string;
  keywords?: readonly string[];
}

const STUDENT_DESTINATIONS: QuickNavDestination[] = [
  { id: "dashboard", to: "/app", label: "Dashboard", labelBn: "ড্যাশবোর্ড", group: "Navigate", keywords: ["home", "overview", "start"] },
  { id: "explorer", to: "/app/explorer", label: "3D Campus Explorer", labelBn: "৩ডি ক্যাম্পাস এক্সপ্লোরার", group: "Navigate", keywords: ["campus", "building", "explore", "three dimensional"] },
  { id: "map", to: "/app/map", label: "Interactive Map", labelBn: "ইন্টার‌্যাক্টিভ মানচিত্র", group: "Navigate", keywords: ["map", "location", "campus", "ম্যাপ", "মানচিত্র"] },
  { id: "planner", to: "/app/planner", label: "Smart Route Planner", labelBn: "স্মার্ট রুট প্ল্যানার", group: "Navigate", keywords: ["route", "directions", "wheelchair", "step free", "navigation", "পথ", "রুট"] },
  { id: "indoor", to: "/app/indoor", label: "3D Indoor Floor Maps", labelBn: "৩ডি ইনডোর ফ্লোর ম্যাপ", group: "Navigate", keywords: ["indoor", "floor", "building", "ম্যাপ"] },
  { id: "live-status", to: "/app/live-status", label: "Live Facility Status", labelBn: "লাইভ সুবিধার অবস্থা", group: "Navigate", keywords: ["elevator", "lift", "facility", "outage", "status", "live"] },
  { id: "schedule", to: "/app/schedule", label: "Class Schedule Plan", labelBn: "ক্লাসের সময়সূচি", group: "Navigate", keywords: ["class", "timetable", "schedule", "routine"] },
  { id: "emergency", to: "/app/emergency", label: "Emergency Evacuation", labelBn: "জরুরি স্থানত্যাগ", group: "Navigate", keywords: ["emergency", "evacuation", "exit", "safety"] },
  { id: "accessibility-profile", to: "/app/accessibility-profile", label: "Accessibility Profile", labelBn: "অ্যাক্সেসিবিলিটি প্রোফাইল", group: "Navigate", keywords: ["wheelchair", "mobility", "preferences", "step free"] },
  { id: "saved", to: "/app/saved", label: "Saved & History", labelBn: "সংরক্ষিত ও ইতিহাস", group: "Navigate", keywords: ["bookmarks", "favourites", "recent", "history"] },
  { id: "report-new", to: "/app/report/new", label: "Report Barrier", labelBn: "বাধার রিপোর্ট দিন", group: "Report & Community", keywords: ["report", "barrier", "obstacle", "submit", "problem", "complaint", "obhijog", "ovijog", "অভিযোগ", "বাধা"] },
  { id: "my-reports", to: "/app/my-reports", label: "My Reports", labelBn: "আমার রিপোর্ট", group: "Report & Community", keywords: ["submitted", "tracking", "reports"] },
  { id: "community-reports", to: "/app/community-reports", label: "Community Reports", labelBn: "কমিউনিটি রিপোর্ট", group: "Report & Community", keywords: ["community", "reports", "barriers"] },
  { id: "advanced", to: "/app/advanced", label: "QR, BLE & AR Hub", labelBn: "QR, BLE ও AR হাব", group: "Navigate", keywords: ["qr", "bluetooth", "beacon", "augmented reality", "hardware"] },
  { id: "notifications", to: "/app/notifications", label: "Notifications", labelBn: "নোটিফিকেশন", group: "Help & Info", keywords: ["alerts", "messages", "updates"] },
  { id: "settings", to: "/app/settings", label: "Personal Settings", labelBn: "ব্যক্তিগত সেটিংস", group: "Help & Info", keywords: ["preferences", "account", "profile", "settings"] },
];

const PUBLIC_DESTINATIONS: QuickNavDestination[] = [
  { id: "public-explore", to: "/explore", label: "Explore Demo", labelBn: "ডেমো দেখুন", group: "Help & Info", keywords: ["demo", "campus", "map", "preview"] },
  { id: "features", to: "/features", label: "Feature Directory", labelBn: "ফিচার ডিরেক্টরি", group: "Help & Info", keywords: ["features", "capabilities", "documentation"] },
  { id: "how-it-works", to: "/how-it-works", label: "How It Works", labelBn: "যেভাবে কাজ করে", group: "Help & Info", keywords: ["guide", "workflow", "steps"] },
  { id: "help", to: "/help", label: "Help Center", labelBn: "সহায়তা কেন্দ্র", group: "Help & Info", keywords: ["help", "faq", "support"] },
  { id: "about", to: "/about", label: "About AccessPath", labelBn: "AccessPath সম্পর্কে", group: "Help & Info", keywords: ["about", "mission", "project"] },
  { id: "accessibility", to: "/accessibility", label: "Accessibility Statement", labelBn: "অ্যাক্সেসিবিলিটি বিবৃতি", group: "Help & Info", keywords: ["accessibility", "wcag", "inclusive"] },
];

const VOLUNTEER_DESTINATIONS: QuickNavDestination[] = [
  { id: "volunteer", to: "/app/volunteer", label: "Volunteer Queue", labelBn: "ভলান্টিয়ার কিউ", group: "Operations", keywords: ["verify", "verification", "queue", "volunteer"], roles: ["volunteer", "moderator", "campus_admin", "super_admin"] },
];

const MODERATOR_DESTINATIONS: QuickNavDestination[] = [
  { id: "admin", to: "/app/admin", label: "Admin Dashboard", labelBn: "অ্যাডমিন ড্যাশবোর্ড", group: "Operations", keywords: ["admin", "moderation", "operations"], roles: ["moderator", "campus_admin", "super_admin"] },
  { id: "admin-reports", to: "/app/admin/reports", label: "Manage Reports", labelBn: "রিপোর্ট পরিচালনা", group: "Operations", keywords: ["moderate", "reports", "review"], roles: ["moderator", "campus_admin", "super_admin"] },
];

const ADMIN_DESTINATIONS: QuickNavDestination[] = [
  { id: "campus-editor", to: "/app/admin/campus-editor", label: "Map & Graph Editor", labelBn: "ম্যাপ ও গ্রাফ এডিটর", group: "Operations", keywords: ["map", "graph", "editor"], roles: ["campus_admin", "super_admin"] },
  { id: "maintenance", to: "/app/admin/maintenance", label: "Maintenance & Closures", labelBn: "রক্ষণাবেক্ষণ ও বন্ধ", group: "Operations", keywords: ["maintenance", "closure", "equipment"], roles: ["campus_admin", "super_admin"] },
  { id: "digital-twin", to: "/app/admin/accessibility-twin", label: "Accessibility Digital Twin", labelBn: "অ্যাক্সেসিবিলিটি ডিজিটাল টুইন", group: "Operations", keywords: ["simulation", "digital twin", "graph"], roles: ["campus_admin", "super_admin"] },
  { id: "analytics", to: "/app/admin/analytics", label: "Analytics & Impact", labelBn: "অ্যানালিটিক্স ও প্রভাব", group: "Operations", keywords: ["analytics", "impact", "metrics"], roles: ["campus_admin", "super_admin"] },
  { id: "users", to: "/app/admin/users", label: "Users & Volunteers", labelBn: "ব্যবহারকারী ও ভলান্টিয়ার", group: "Operations", keywords: ["users", "accounts", "volunteers"], roles: ["campus_admin", "super_admin"] },
  { id: "integrations", to: "/app/admin/integrations", label: "Integrations & Alerts", labelBn: "ইন্টিগ্রেশন ও সতর্কতা", group: "Operations", keywords: ["integrations", "email", "alerts"], roles: ["campus_admin", "super_admin"] },
  { id: "audit", to: "/app/admin/audit-logs", label: "Audit Logs", labelBn: "অডিট লগ", group: "Operations", keywords: ["audit", "logs", "security"], roles: ["campus_admin", "super_admin"] },
];

const SUPER_ADMIN_DESTINATIONS: QuickNavDestination[] = [
  { id: "super-admin", to: "/app/super-admin", label: "Global Platform", labelBn: "গ্লোবাল প্ল্যাটফর্ম", group: "Operations", keywords: ["global", "super admin", "governance"], roles: ["super_admin"] },
];

/** All known destinations, including routes restricted to operational roles. */
export const NAV_DESTINATIONS: QuickNavDestination[] = [
  ...STUDENT_DESTINATIONS,
  ...VOLUNTEER_DESTINATIONS,
  ...MODERATOR_DESTINATIONS,
  ...ADMIN_DESTINATIONS,
  ...SUPER_ADMIN_DESTINATIONS,
  ...PUBLIC_DESTINATIONS,
];

export function destinationsForRole(role?: UserRole | null): QuickNavDestination[] {
  return NAV_DESTINATIONS.filter((item) => !item.roles || (role ? item.roles.includes(role) : false));
}

/** Unicode-aware text normalization shared by command-palette search. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

/** Higher scores indicate stronger title matches than keyword-only matches. */
export function scoreItem(item: SearchableQuickNavItem, query: string): number {
  const terms = normalizeText(query).split(/\\s+/).filter(Boolean);
  if (terms.length === 0) return 0;

  const title = normalizeText(item.label);
  const titleBn = normalizeText(item.labelBn ?? "");
  const keywords = (item.keywords ?? []).map(normalizeText);

  return terms.reduce((total, term) => {
    const titleWords = title.split(/\\s+/);
    const banglaWords = titleBn.split(/\\s+/);
    const hasTitleExact = title === term;
    const hasTitlePrefix = title.startsWith(term);
    const hasTitleWordPrefix = titleWords.some((word) => word.startsWith(term));
    const hasTitlePartial = title.includes(term);
    const hasBnExact = titleBn === term;
    const hasBnPrefix = titleBn.startsWith(term);
    const hasBnWordPrefix = banglaWords.some((word) => word.startsWith(term));
    const hasBnPartial = titleBn.includes(term);
    const hasKeywordExact = keywords.some((keyword) => keyword === term);
    const hasKeywordPrefix = keywords.some((keyword) => keyword.startsWith(term));
    const hasKeywordWordPrefix = keywords.some((keyword) =>
      keyword.split(/\\s+/).some((word) => word.startsWith(term))
    );
    const hasKeywordPartial = keywords.some((keyword) => keyword.includes(term));

    const score = hasTitleExact ? 120
      : hasTitlePrefix ? 110
      : hasTitleWordPrefix ? 100
      : hasTitlePartial ? 85
      : hasBnExact ? 80
      : hasBnPrefix ? 75
      : hasBnWordPrefix ? 70
      : hasBnPartial ? 65
      : hasKeywordExact ? 55
      : hasKeywordPrefix ? 50
      : hasKeywordWordPrefix ? 45
      : hasKeywordPartial ? 35
      : 0;

    return total + score;
  }, 0);
}

export function searchItems<T extends SearchableQuickNavItem>(
  items: readonly T[],
  query: string
): T[] {
  const terms = normalizeText(query).split(/\\s+/).filter(Boolean);
  if (terms.length === 0) return [...items];

  return items
    .map((item, index) => ({ item, index, score: scoreItem(item, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}

/** Resolve the best matching navigation entry for a browser route. */
export function findDestinationByPath(pathname: string): QuickNavDestination | undefined {
  const normalizedPath = pathname.replace(/\\/+$/, "") || "/";
  const all = destinationsForRole("super_admin");
  return all
    .filter((item) =>
      normalizedPath === item.to ||
      (item.to !== "/app" && normalizedPath.startsWith(item.to + "/"))
    )
    .sort((a, b) => b.to.length - a.to.length)[0];
}

/** Localized time-of-day greeting used by the student dashboard. */
export function greetingFor(date: Date, language: string = "en"): string {
  const hour = date.getHours();
  const isBangla = language.toLowerCase().startsWith("bn");

  if (isBangla) {
    if (hour < 12) return "শুভ সকাল";
    if (hour < 17) return "শুভ বিকেল";
    return "শুভ সন্ধ্যা";
  }

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
