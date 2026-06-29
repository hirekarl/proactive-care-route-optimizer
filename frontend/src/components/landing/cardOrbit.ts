export const ORBIT_RADIUS = 5.2;
export const HELIX_TOP = 3.0;
export const HELIX_BOTTOM = -3.0;
export const HELIX_TURNS = 1.15;

export const CARD_ORBIT_POSITIONS: [number, number, number][] = (() => {
  const positions: [number, number, number][] = [];
  const count = 6;
  for (let i = 0; i < count; i += 1) {
    const u = i / (count - 1);
    const angle = u * Math.PI * 2 * HELIX_TURNS;
    const y = HELIX_TOP + (HELIX_BOTTOM - HELIX_TOP) * u;
    positions.push([Math.cos(angle) * ORBIT_RADIUS, y, Math.sin(angle) * ORBIT_RADIUS]);
  }
  return positions;
})();
