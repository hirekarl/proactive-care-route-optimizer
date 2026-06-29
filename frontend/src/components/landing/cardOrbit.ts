export const ORBIT_RADIUS = 5.2;
export const ORBIT_HEIGHT = 0.2;

export const CARD_ORBIT_POSITIONS: [number, number, number][] = (() => {
  const positions: [number, number, number][] = [];
  const count = 6;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    positions.push([Math.cos(angle) * ORBIT_RADIUS, ORBIT_HEIGHT, Math.sin(angle) * ORBIT_RADIUS]);
  }
  return positions;
})();
