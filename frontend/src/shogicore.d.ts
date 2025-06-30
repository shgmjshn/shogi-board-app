declare module 'shogi_core' {
  interface InitOptions {
    url: string | URL;
  }
  function init(options?: InitOptions): Promise<void>;
  export function init(input: string | URL | Request | ArrayBuffer): Promise<void>;
  export default init;
  
  export enum Piece {
    Empty,
    Pawn,
    Lance,
    Knight,
    Silver,
    Gold,
    Bishop,
    Rook,
    King,
    PromotedPawn,
    PromotedLance,
    PromotedKnight,
    PromotedSilver,
    PromotedBishop,
    PromotedRook,
  }

  export enum Player {
    Black,
    White,
  }

  export class Position {
    constructor(row: number, column: number);
    row: number;
    column: number;
    debug_info(): string;
    get_row(): number;
    get_column(): number;
  }

  export interface PieceInfo {
    piece: Piece;
    player: Player;
  }

  export class Board {
    constructor();
    get_piece(position: Position): PieceInfo;
    get_piece_by_coords(row: number, col: number): PieceInfo;
    is_valid_move(from: Position, to: Position): boolean;
    make_move(from: Position, to: Position): boolean;
    make_move_by_coords(from_row: number, from_col: number, to_row: number, to_col: number): boolean;
    make_move_with_promotion(from: Position, to: Position, promote: boolean): boolean;
    make_move_by_coords_with_promotion(from_row: number, from_col: number, to_row: number, to_col: number, promote: boolean): boolean;
    can_promote(from_row: number, from_col: number, to_row: number, to_col: number): boolean;
    get_current_player(): Player;
    get_valid_moves(from: Position): Position[];
    get_valid_moves_by_coords(from_row: number, from_col: number): Position[];
    clone(): Board;
    set_piece(position: Position, piece: Piece, player: Player): boolean;
    set_piece_by_coords(row: number, col: number, piece: Piece, player: Player): boolean;
    clear_square(position: Position): boolean;
    clear_square_by_coords(row: number, col: number): boolean;
    clear_board(): void;
    set_current_player(player: Player): void;
    reset_to_initial_position(): void;
    get_captured_piece_count(player: Player, piece: Piece): number;
    set_captured_piece_count(player: Player, piece: Piece, count: number): boolean;
    add_captured_piece(player: Player, piece: Piece): void;
    clear_captured_pieces(player: Player): void;
    get_all_captured_pieces(): number[];
    use_captured_piece(player: Player, piece: Piece): boolean;
    can_drop_piece(piece: Piece, to_row: number, to_col: number): boolean;
    drop_piece(piece: Piece, to_row: number, to_col: number): boolean;
    debug_board_state(): string;
    debug_can_drop_piece(piece: Piece, to_row: number, to_col: number): string;
    debug_has_pawn_in_column(col: number, player: Player, except_row: number): string;
    debug_captured_pieces(): string;
  }

  export function hello_shogi(): string;
} 