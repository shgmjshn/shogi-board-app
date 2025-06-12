declare module 'shogi_core' {
  interface InitOptions {
    url: string | URL;
  }
  function init(options?: InitOptions): Promise<void>;
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
  }

  export class Board {
    constructor();
    get_piece(position: Position): [Piece, Player];
    is_valid_move(from: Position, to: Position): boolean;
    make_move(from: Position, to: Position): boolean;
    get_current_player(): Player;
    get_valid_moves(from: Position): Position[];
  }

  export function hello_shogi(): string;
} 