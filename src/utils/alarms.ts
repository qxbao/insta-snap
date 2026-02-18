function getJitter(base: number, maxJitter: number): number {
  return base + Math.floor(Math.random() * maxJitter);
}

export { getJitter };
