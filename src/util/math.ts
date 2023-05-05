interface Coordinates {
  x: number;
  y: number;
}

export function normalizeVector(
  { x, y }: Coordinates,
  speed: number
): Coordinates {
  if (x === 0 && y === 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: (x / (Math.abs(x) + Math.abs(y))) * speed,
    y: (y / (Math.abs(x) + Math.abs(y))) * speed,
  };
}
