import React, { useMemo } from 'react';
import './CapturedPieces.css';

interface CapturedPiecesProps {
  board: any;
  onPieceClick: (piece: any, player: any) => void;
  selectedPiece: any;
  player: any;
  playerName: string;
  isEditMode?: boolean;
  onDragStart?: (piece: any, player: any, event: React.DragEvent) => void;
  onDrop?: (player: any, piece: any, event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
}

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ 
  board, 
  onPieceClick, 
  selectedPiece, 
  player, 
  playerName,
  isEditMode = false,
  onDragStart,
  onDrop,
  onDragOver
}) => {
  const wasm = (window as any).wasmModule;
  if (!wasm || !board) return null;

  const getPieceName = (pieceType: number): string => {
    console.log('getPieceName呼び出し:', pieceType);
    const pieceNames = [
      { piece: wasm.Piece.Pawn, name: '歩' },
      { piece: wasm.Piece.Lance, name: '香' },
      { piece: wasm.Piece.Knight, name: '桂' },
      { piece: wasm.Piece.Silver, name: '銀' },
      { piece: wasm.Piece.Gold, name: '金' },
      { piece: wasm.Piece.Bishop, name: '角' },
      { piece: wasm.Piece.Rook, name: '飛' },
      { piece: wasm.Piece.King, name: '玉' },
    ];
    
    // pieceTypeは配列のインデックスなので、直接アクセス
    if (pieceType >= 0 && pieceType < pieceNames.length) {
      const name = pieceNames[pieceType].name;
      console.log('getPieceName結果:', pieceType, '->', name);
      return name;
    }
    console.log('getPieceName結果: 範囲外 -> ?');
    return '?';
  };

  // 特定のプレイヤーの持ち駒を取得
  const capturedPieces = useMemo(() => {
    if (!board || !wasm) return [];
    
    const pieces = [];
    const pieceTypes = [
      wasm.Piece.Pawn,
      wasm.Piece.Lance,
      wasm.Piece.Knight,
      wasm.Piece.Silver,
      wasm.Piece.Gold,
      wasm.Piece.Bishop,
      wasm.Piece.Rook,
      wasm.Piece.King
    ];
    
    for (let i = 0; i < pieceTypes.length; i++) {
      const pieceType = pieceTypes[i];
      const count = board.get_captured_piece_count(player, pieceType);
      if (count > 0) {
        pieces.push({
          pieceType: i,
          count: count,
          name: getPieceName(i)
        });
      }
    }
    return pieces;
  }, [board, wasm, player]);

  return (
    <div className="captured-pieces-container">
      <h3>{playerName}の持ち駒</h3>
      <div 
        className="captured-pieces-list"
        onDrop={onDrop ? (e) => onDrop(player, null, e) : undefined}
        onDragOver={onDragOver}
      >
        {capturedPieces.map((piece, index) => (
          <div
            key={index}
            className={`captured-piece ${selectedPiece?.pieceType === piece.pieceType ? 'selected' : ''}`}
            onClick={() => onPieceClick(piece, player)}
            draggable={isEditMode}
            onDragStart={onDragStart ? (e) => onDragStart(piece, player, e) : undefined}
          >
            <span className="piece-name">{piece.name}</span>
            <span className="piece-count">×{piece.count}</span>
          </div>
        ))}
        {capturedPieces.length === 0 && (
          <div className="no-pieces">持ち駒なし</div>
        )}
      </div>
    </div>
  );
}; 