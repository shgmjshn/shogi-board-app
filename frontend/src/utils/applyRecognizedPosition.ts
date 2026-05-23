import { OcrCapturedPieces, OcrPieceType, RecognizedPosition } from './boardOcrTypes';

const CAPTURED_PIECE_TYPES: Array<keyof OcrCapturedPieces> = [
  'pawn',
  'lance',
  'knight',
  'silver',
  'gold',
  'bishop',
  'rook',
  'king',
];

const PIECE_TO_WASM: Record<OcrPieceType, string> = {
  pawn: 'Pawn',
  lance: 'Lance',
  knight: 'Knight',
  silver: 'Silver',
  gold: 'Gold',
  bishop: 'Bishop',
  rook: 'Rook',
  king: 'King',
  promoted_pawn: 'PromotedPawn',
  promoted_lance: 'PromotedLance',
  promoted_knight: 'PromotedKnight',
  promoted_silver: 'PromotedSilver',
  promoted_bishop: 'PromotedBishop',
  promoted_rook: 'PromotedRook',
};

function getWasmPiece(wasm: NonNullable<typeof window.wasmModule>, pieceType: OcrPieceType) {
  const pieceName = PIECE_TO_WASM[pieceType];
  return wasm.Piece[pieceName as keyof typeof wasm.Piece];
}

export function applyRecognizedPosition(board: any, position: RecognizedPosition) {
  const wasm = window.wasmModule;
  if (!wasm) {
    throw new Error('WASMモジュールが初期化されていません');
  }

  const newBoard = board.clone();
  newBoard.clear_board();
  newBoard.clear_captured_pieces(wasm.Player.Black);
  newBoard.clear_captured_pieces(wasm.Player.White);

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const cell = position.board[row]?.[col];
      if (!cell) {
        continue;
      }

      const piece = getWasmPiece(wasm, cell.piece);
      const player = cell.side === 'black' ? wasm.Player.Black : wasm.Player.White;
      newBoard.set_piece_by_coords(row, col, piece, player);
    }
  }

  for (const pieceType of CAPTURED_PIECE_TYPES) {
    const wasmPiece = getWasmPiece(wasm, pieceType);
    newBoard.set_captured_piece_count(
      wasm.Player.Black,
      wasmPiece,
      position.captured.black[pieceType] ?? 0,
    );
    newBoard.set_captured_piece_count(
      wasm.Player.White,
      wasmPiece,
      position.captured.white[pieceType] ?? 0,
    );
  }

  newBoard.set_current_player(
    position.turn === 'black' ? wasm.Player.Black : wasm.Player.White,
  );

  return newBoard;
}
