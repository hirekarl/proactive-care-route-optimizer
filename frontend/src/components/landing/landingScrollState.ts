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
  scrollElement: HTMLElement | null;
  doorsOpenProgress: number;
} = {
  offset: 0,
  dragRotation: 0,
  cards: [],
  scrollElement: null,
  doorsOpenProgress: 0,
};
