/* tslint:disable */
/* eslint-disable */
export function hello_shogi(): string;
export enum Piece {
  Empty = 0,
  Pawn = 1,
  Lance = 2,
  Knight = 3,
  Silver = 4,
  Gold = 5,
  Bishop = 6,
  Rook = 7,
  King = 8,
  PromotedPawn = 9,
  PromotedLance = 10,
  PromotedKnight = 11,
  PromotedSilver = 12,
  PromotedBishop = 13,
  PromotedRook = 14,
}
export enum Player {
  Black = 0,
  White = 1,
}
export class Board {
  free(): void;
  constructor();
  get_piece(position: Position): PieceInfo;
  is_valid_move(from: Position, to: Position): boolean;
  make_move(from: Position, to: Position): boolean;
  make_move_with_promotion(from: Position, to: Position, promote: boolean): boolean;
  get_current_player(): Player;
  get_valid_moves(from: Position): Position[];
  get_valid_moves_by_coords(from_row: number, from_col: number): Position[];
  get_piece_by_coords(row: number, col: number): PieceInfo;
  make_move_by_coords(from_row: number, from_col: number, to_row: number, to_col: number): boolean;
  make_move_by_coords_with_promotion(from_row: number, from_col: number, to_row: number, to_col: number, promote: boolean): boolean;
  can_promote(from_row: number, from_col: number, to_row: number, to_col: number): boolean;
  clone(): Board;
  set_piece(position: Position, piece: Piece, player: Player): boolean;
  get_captured_piece_count(player: Player, piece: Piece): number;
  add_captured_piece(player: Player, piece: Piece): void;
  use_captured_piece(player: Player, piece: Piece): boolean;
  can_drop_piece(piece: Piece, to_row: number, to_col: number): boolean;
  debug_can_drop_piece(piece: Piece, to_row: number, to_col: number): string;
  drop_piece(piece: Piece, to_row: number, to_col: number): boolean;
  debug_board_state(): string;
  debug_has_pawn_in_column(col: number, player: Player, except_row: number): string;
  debug_captured_pieces(): string;
}
export class PieceInfo {
  private constructor();
  free(): void;
  piece: Piece;
  player: Player;
}
export class Position {
  free(): void;
  constructor(row: number, column: number);
  debug_info(): string;
  get_row(): number;
  get_column(): number;
  row: number;
  column: number;
}
