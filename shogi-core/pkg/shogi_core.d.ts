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
  drop_piece(piece: Piece, to_row: number, to_col: number): boolean;
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

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_position_free: (a: number, b: number) => void;
  readonly __wbg_get_position_row: (a: number) => number;
  readonly __wbg_set_position_row: (a: number, b: number) => void;
  readonly __wbg_get_position_column: (a: number) => number;
  readonly __wbg_set_position_column: (a: number, b: number) => void;
  readonly position_new: (a: number, b: number) => number;
  readonly position_debug_info: (a: number) => [number, number];
  readonly position_get_row: (a: number) => number;
  readonly position_get_column: (a: number) => number;
  readonly __wbg_pieceinfo_free: (a: number, b: number) => void;
  readonly __wbg_get_pieceinfo_piece: (a: number) => number;
  readonly __wbg_set_pieceinfo_piece: (a: number, b: number) => void;
  readonly __wbg_get_pieceinfo_player: (a: number) => number;
  readonly __wbg_set_pieceinfo_player: (a: number, b: number) => void;
  readonly __wbg_board_free: (a: number, b: number) => void;
  readonly board_new: () => number;
  readonly board_get_piece: (a: number, b: number) => number;
  readonly board_is_valid_move: (a: number, b: number, c: number) => number;
  readonly board_make_move: (a: number, b: number, c: number) => number;
  readonly board_make_move_with_promotion: (a: number, b: number, c: number, d: number) => number;
  readonly board_get_current_player: (a: number) => number;
  readonly board_get_valid_moves: (a: number, b: number) => [number, number];
  readonly board_get_valid_moves_by_coords: (a: number, b: number, c: number) => [number, number];
  readonly board_get_piece_by_coords: (a: number, b: number, c: number) => number;
  readonly board_make_move_by_coords: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly board_make_move_by_coords_with_promotion: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly board_can_promote: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly board_clone: (a: number) => number;
  readonly board_set_piece: (a: number, b: number, c: number, d: number) => number;
  readonly board_get_captured_piece_count: (a: number, b: number, c: number) => number;
  readonly board_add_captured_piece: (a: number, b: number, c: number) => void;
  readonly board_use_captured_piece: (a: number, b: number, c: number) => number;
  readonly board_can_drop_piece: (a: number, b: number, c: number, d: number) => number;
  readonly board_drop_piece: (a: number, b: number, c: number, d: number) => number;
  readonly hello_shogi: () => [number, number];
  readonly __wbindgen_export_0: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __externref_drop_slice: (a: number, b: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
