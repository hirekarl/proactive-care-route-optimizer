export interface CardProjection {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  visible: boolean;
  depth: number;
  zIndex: number;
}

export const landingScrollState: {
  offset: number;
  dragRotation: number;
  cards: CardProjection[];
} = {
  offset: 0,
  dragRotation: 0,
  cards: [],
};
