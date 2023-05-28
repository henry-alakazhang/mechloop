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

export function rotateVector(
  { x, y }: Coordinates,
  angle: number
): Coordinates {
  return {
    // copilot wrote this bad boy. nice.
    // and after all the trouble i went to to google it.
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle),
  };
}
