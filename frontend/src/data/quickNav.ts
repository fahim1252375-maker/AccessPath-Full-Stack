/**
 * Localized greeting helper used by the student dashboard.
 */
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
