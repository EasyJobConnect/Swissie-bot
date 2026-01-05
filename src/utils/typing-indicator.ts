/**
 * Simulate typing indicator for chat interfaces
 */
export async function showTypingIndicator(durationSeconds: number = 5): Promise<void> {
  const minDuration = 3;
  const maxDuration = 8;
  const randomDuration = Math.floor(Math.random() * (maxDuration - minDuration + 1)) + minDuration;
  
  const actualDuration = durationSeconds || randomDuration;
  
  console.log(`💬 Typing indicator shown for ${actualDuration}s...`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('💬 Typing indicator stopped');
      resolve();
    }, actualDuration * 1000);
  });
}

/**
 * Calculate typing duration based on message length
 * Simulates ~40-60 words per minute typing speed
 */
export function calculateTypingDuration(messageLength: number): number {
  const wordsPerMinute = 50; // Average typing speed
  const charactersPerWord = 5;
  const words = messageLength / charactersPerWord;
  const minutes = words / wordsPerMinute;
  const seconds = Math.ceil(minutes * 60);
  
  // Cap between 3-8 seconds
  return Math.min(Math.max(seconds, 3), 8);
}

/**
 * Show typing indicator based on message content
 */
export async function showSmartTypingIndicator(message: string): Promise<void> {
  const duration = calculateTypingDuration(message.length);
  await showTypingIndicator(duration);
}
