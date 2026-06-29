export const ORBIT_RADIUS = 5.4;

export const CARD_ORBIT_POSITIONS: [number, number, number][] = (() => {
  const positions: [number, number, number][] = [];
  const count = 6;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const y = Math.sin((i / count) * Math.PI * 2) * 1.6;
    positions.push([Math.cos(angle) * ORBIT_RADIUS, y, Math.sin(angle) * ORBIT_RADIUS]);
  }
  return positions;
})();
