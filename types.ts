export interface SignatureAnalysisResult {
  identifiedName: string;
  legibilityScore: number;
  personalityTraits: string[];
  professionalism: string;
  graphologySummary: string;
}

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export enum PenColor {
  BLACK = '#000000',
  BLUE = '#0000FF',
  RED = '#FF0000',
  GREEN = '#008000',
  ERASER = 'eraser',
}

export interface DrawingOptions {
  color: string;
  width: number;
}