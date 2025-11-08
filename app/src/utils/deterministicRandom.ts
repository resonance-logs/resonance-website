/**
 * Deterministic pseudo-random number generator for SSR compatibility
 * Uses a simple seed-based algorithm to ensure consistent values between server and client
 */

class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    // Create a numeric hash from the string seed
    this.seed = this.hashString(seed);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Returns a value between 0 and 1
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Returns a value between min and max
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Create deterministic values for animated elements
 * Uses the index as a seed to ensure consistency
 */
export function createDeterministicParticle(index: number, total: number) {
  const random = new SeededRandom(`particle-${index}-${total}`);
  
  return {
    width: random.range(1, 5), // 1-5px
    height: random.range(1, 5), // 1-5px
    left: random.range(0, 100), // 0-100%
    top: random.range(0, 100), // 0-100%
    animationDelay: random.range(0, 5), // 0-5s
    animationDuration: random.range(2, 5), // 2-5s
  };
}

/**
 * Create deterministic values for hero particles
 */
export function createDeterministicHeroParticle(index: number, total: number) {
  const random = new SeededRandom(`hero-particle-${index}-${total}`);
  
  return {
    left: random.range(0, 100), // 0-100%
    top: random.range(0, 100), // 0-100%
    animationDelay: random.range(0, 3), // 0-3s
    animationDuration: random.range(1, 3), // 1-3s
  };
}