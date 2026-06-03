export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning. What's the occasion?";
  if (h < 17) return "Good afternoon. How can I help?";
  return "Good evening. What are you dressing for?";
}
