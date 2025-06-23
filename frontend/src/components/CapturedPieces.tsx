import React, { useMemo } from 'react';
import './CapturedPieces.css';

interface CapturedPiecesProps {
  board: any;
  onPieceClick: (piece: any) => void;
  selectedPiece: any;
  player: any;
  playerName: string;
}

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ 
  board, 
  onPieceClick, 
  selectedPiece, 
  player, 
  playerName 
}) => {
  const wasm = (window as any).wasmModule;
  if (!wasm || !board) return null;

  const getPieceName = (pieceType: number): string => {
    const pieceNames = [
      { piece: wasm.Piece.Pawn, name: '歩' },
      { piece: wasm.Piece.Lance, name: '香' },
      { piece: wasm.Piece.Knight, name: '桂' },
      { piece: wasm.Piece.Silver, name: '銀' },
      { piece: wasm.Piece.Gold, name: '金' },
      { piece: wasm.Piece.Bishop, name: '角' },
      { piece: wasm.Piece.Rook, name: '飛' },
    ];
    
    const piece = pieceNames.find(p => p.piece === pieceType);
    return piece ? piece.name : '?';
  };

  // 特定のプレイヤーの持ち駒を取得
  const capturedPieces = useMemo(() => {
    if (!board || !wasm) return [];
    
    const pieces = [];
    for (let i = 0; i < 8; i++) {
      const count = board.get_captured_piece_count(player, i);
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
      <div className="captured-pieces-list">
        {capturedPieces.map((piece, index) => (
          <div
            key={index}
            className={`captured-piece ${selectedPiece?.pieceType === piece.pieceType ? 'selected' : ''}`}
            onClick={() => onPieceClick(piece)}
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