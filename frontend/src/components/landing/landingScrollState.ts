export interface CardProjection {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  visible: boolean;
  depth: number;
  zIndex: number;
  tiltDeg: number;
  featured: number;
}

export const landingScrollState: {
  offset: number;
  carouselAngle: number;
  cards: CardProjection[];
} = {
  offset: 0,
  carouselAngle: 0,
  cards: [],
};
