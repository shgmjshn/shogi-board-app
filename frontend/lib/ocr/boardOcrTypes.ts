export type OcrPieceType =
  | 'pawn'
  | 'lance'
  | 'knight'
  | 'silver'
  | 'gold'
  | 'bishop'
  | 'rook'
  | 'king'
  | 'promoted_pawn'
  | 'promoted_lance'
  | 'promoted_knight'
  | 'promoted_silver'
  | 'promoted_bishop'
  | 'promoted_rook';

export type OcrSide = 'black' | 'white';

export interface OcrCell {
  piece: OcrPieceType;
  side: OcrSide;
}

export interface OcrCapturedPieces {
  pawn: number;
  lance: number;
  knight: number;
  silver: number;
  gold: number;
  bishop: number;
  rook: number;
  king: number;
}

export interface RecognizedPosition {
  turn: OcrSide;
  board: (OcrCell | null)[][];
  captured: {
    black: OcrCapturedPieces;
    white: OcrCapturedPieces;
  };
}

export const EMPTY_CAPTURED: OcrCapturedPieces = {
  pawn: 0,
  lance: 0,
  knight: 0,
  silver: 0,
  gold: 0,
  bishop: 0,
  rook: 0,
  king: 0,
};
