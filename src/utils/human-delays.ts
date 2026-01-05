/**
 * Generate random delay between min and max seconds
 */
export function getRandomDelay(minSeconds: number, maxSeconds: number): number {
  const min = minSeconds * 1000;
  const max = maxSeconds * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Initial message delay: 30-90 seconds
 */
export function getInitialMessageDelay(): number {
  return getRandomDelay(30, 90);
}

/**
 * Follow-up delay: 6-18 hours
 */
export function getFollowUpDelay(): number {
  const minHours = 6;
  const maxHours = 18;
  return getRandomDelay(minHours * 3600, maxHours * 3600);
}

/**
 * Day-based delays for the 7-day cycle
 */
export function getDayDelay(day: number): number {
  switch (day) {
    case 1:
      return 24 * 3600 * 1000; // 24 hours
    case 2:
      return 48 * 3600 * 1000; // 48 hours
    case 4:
      return 96 * 3600 * 1000; // 96 hours (4 days)
    case 7:
      return 168 * 3600 * 1000; // 168 hours (7 days)
    default:
      return getFollowUpDelay();
  }
}

/**
 * Sleep for specified milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sleep with human-like randomization
 */
export async function humanSleep(minSeconds: number, maxSeconds: number): Promise<void> {
  const delay = getRandomDelay(minSeconds, maxSeconds);
  console.log(`⏳ Waiting ${Math.round(delay / 1000)}s (human-like delay)...`);
  await sleep(delay);
}
