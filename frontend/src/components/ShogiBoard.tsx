import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { CapturedPieces } from './CapturedPieces';
import './ShogiBoard.css';

// WASMモジュールの型定義
interface WasmModule {
  Board: any;
  Position: any;
  Piece: any;
  Player: any;
  PieceInfo: any;
}

interface SquareProps {
  row: number;
  col: number;
  piece: any;
  player: any;
  isSelected: boolean;
  isValidMove: boolean;
  onClick: (row: number, col: number) => void;
  isDroppingMode: boolean;
}

const Square: React.FC<SquareProps> = ({ row, col, piece, player, isSelected, isValidMove, onClick, isDroppingMode }) => {
  const getPieceText = (piece: any, player: any) => {
    const wasm = (window as any).wasmModule;
    if (!wasm) return '';
    
    const pieceMap: Record<any, string> = {
      [wasm.Piece.Empty]: '',
      [wasm.Piece.Pawn]: '歩',
      [wasm.Piece.Lance]: '香',
      [wasm.Piece.Knight]: '桂',
      [wasm.Piece.Silver]: '銀',
      [wasm.Piece.Gold]: '金',
      [wasm.Piece.Bishop]: '角',
      [wasm.Piece.Rook]: '飛',
      [wasm.Piece.King]: player === wasm.Player.Black ? '玉' : '王',
      [wasm.Piece.PromotedPawn]: 'と',
      [wasm.Piece.PromotedLance]: '成香',
      [wasm.Piece.PromotedKnight]: '成桂',
      [wasm.Piece.PromotedSilver]: '成銀',
      [wasm.Piece.PromotedBishop]: '馬',
      [wasm.Piece.PromotedRook]: '龍',
    };
    return pieceMap[piece] || '';
  };

  const className = `square ${isSelected ? 'selected' : ''} ${isValidMove ? 'valid-move' : ''} ${
    player === (window as any).wasmModule?.Player?.White ? 'white' : ''
  } ${isDroppingMode ? 'dropping-mode' : ''}`;

  const handleClick = useCallback(() => {
    // 入力値の範囲チェック
    if (row < 0 || row > 8 || col < 0 || col > 8) {
      console.error(`無効な位置: (${row}, ${col})`);
      return;
    }
    
    console.log(`クリックされた位置: (${row}, ${col})`);
    onClick(row, col);
  }, [row, col, onClick]);

  const pieceText = getPieceText(piece, player);

  return (
    <div 
      className={className} 
      onClick={handleClick}
      data-piece={pieceText}
    >
      {pieceText}
    </div>
  );
};

const renderBoard = (
  board: any,
  selectedPosition: any | null,
  validMoves: any[],
  handleSquareClick: (row: number, col: number) => void,
  isDroppingMode: boolean = false
) => {
  const rows = [];
  for (let row = 8; row >= 0; row--) {
    const cols = [];
    for (let col = 0; col < 9; col++) {
      try {
        // 新しい座標ベースのメソッドを使用
        let piece = (window as any).wasmModule?.Piece?.Empty;
        let player = (window as any).wasmModule?.Player?.Black;
        
        try {
          const pieceInfo = board.get_piece_by_coords(row, col);
          piece = pieceInfo.piece;
          player = pieceInfo.player;
        } catch (err) {
          console.error(`get_piece_by_coordsエラー at (${row}, ${col}):`, err);
          // エラーが発生した場合は空のマスとして扱う
          piece = (window as any).wasmModule?.Piece?.Empty;
          player = (window as any).wasmModule?.Player?.Black;
        }
        
        // 選択状態と有効な移動先の判定（座標を直接比較）
        let isSelected = false;
        let isValidMove = false;
        
        try {
          if (selectedPosition) {
            const selectedRow = selectedPosition.get_row();
            const selectedCol = selectedPosition.get_column();
            isSelected = selectedRow === row && selectedCol === col;
          }
        } catch (err) {
          console.warn('選択状態の判定中にエラー:', err);
        }
        
        try {
          isValidMove = validMoves.some(move => {
            try {
              const moveRow = move.get_row();
              const moveCol = move.get_column();
              return moveRow === row && moveCol === col;
            } catch (err) {
              console.warn('有効な移動の判定中にエラー:', err);
              return false;
            }
          });
        } catch (err) {
          console.warn('有効な移動の判定中にエラー:', err);
        }

        cols.push(
          <Square
            key={`${row}-${col}`}
            row={row}
            col={col}
            piece={piece}
            player={player}
            isSelected={isSelected}
            isValidMove={isValidMove}
            onClick={handleSquareClick}
            isDroppingMode={isDroppingMode}
          />
        );
      } catch (err) {
        console.error(`renderBoardエラー at (${row}, ${col}):`, err);
        cols.push(
          <Square
            key={`${row}-${col}`}
            row={row}
            col={col}
            piece={(window as any).wasmModule?.Piece?.Empty}
            player={(window as any).wasmModule?.Player?.Black}
            isSelected={false}
            isValidMove={false}
            onClick={handleSquareClick}
            isDroppingMode={isDroppingMode}
          />
        );
      }
    }
    rows.push(
      <div key={row} className="board-row">
        {cols}
      </div>
    );
  }
  return rows;
};

export const ShogiBoard: React.FC = () => {
  const [board, setBoard] = useState<any>(null);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [validMoves, setValidMoves] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [pendingMove, setPendingMove] = useState<{fromRow: number, fromCol: number, toRow: number, toCol: number} | null>(null);
  const [selectedCapturedPiece, setSelectedCapturedPiece] = useState<any>(null);
  const [isDroppingMode, setIsDroppingMode] = useState(false);

  // WebAssemblyモジュールの初期化を一度だけ行う
  useEffect(() => {
    let isMounted = true;

    const initWasm = async () => {
      try {
        console.log('ShogiBoard: WASM初期化確認');
        
        // main.tsxで初期化されたモジュールを確認
        if (!(window as any).wasmModule) {
          throw new Error('WASMモジュールが初期化されていません');
        }
        
        const wasmModule = (window as any).wasmModule;
        
        // モジュールのクラスが利用可能か確認
        console.log('WASMモジュールのクラス確認中...');
        if (!wasmModule.Board) {
          throw new Error('Boardクラスが見つかりません');
        }
        if (!wasmModule.Position) {
          throw new Error('Positionクラスが見つかりません');
        }
        
        // Positionクラスのテスト
        try {
          console.log('Positionクラステスト開始');
          const testPosition = new wasmModule.Position(0, 0);
          console.log('Positionオブジェクト作成成功:', testPosition);
          
          const debugInfo = testPosition.debug_info();
          console.log('Positionクラステスト成功:', debugInfo);
        } catch (err) {
          console.error('Positionクラステスト失敗:', err);
          throw new Error('Positionクラスの初期化に失敗しました');
        }
        
        console.log('WASMモジュールのクラス確認完了');

        if (isMounted) {
          setIsInitialized(true);
          console.log('ShogiBoard: WASM初期化完了');
        }
      } catch (err) {
        console.error('ShogiBoard: WebAssemblyモジュールの初期化に失敗:', err);
        if (isMounted) {
          setIsInitialized(false);
        }
      }
    };

    initWasm();

    return () => {
      isMounted = false;
    };
  }, []);

  // 盤面の初期化はWebAssemblyモジュールの初期化後に実行
  useEffect(() => {
    if (!isInitialized || !window.wasmModule) return;

    const initBoard = async () => {
      try {
        // WASMモジュールの状態を確認
        if (!window.wasmModule.Board) {
          throw new Error('WASMモジュールのBoardクラスが見つかりません');
        }
        
        // Boardオブジェクトの作成
        const newBoard = new window.wasmModule.Board();
        if (!newBoard) {
          throw new Error('盤面の作成に失敗しました');
        }
        
        // Boardオブジェクトの検証
        if (typeof newBoard.get_piece !== 'function') {
          throw new Error('Boardオブジェクトのget_pieceメソッドが見つかりません');
        }
        
        setBoard(newBoard);
      } catch (err) {
        console.error('盤面の初期化に失敗しました:', err);
      }
    };

    initBoard();
  }, [isInitialized]);

  const handleMove = useCallback(async (toRow: number, toCol: number, promote: boolean = false) => {
    if (!board || !selectedPosition) return;
    
    try {
      // 現在の盤面をクローン
      const newBoard = board.clone();
      if (!newBoard) {
        throw new Error('新しい盤面の作成に失敗しました');
      }

      try {
        const selectedRow = selectedPosition.get_row();
        const selectedCol = selectedPosition.get_column();
        console.log(`移動実行: (${selectedRow}, ${selectedCol}) → (${toRow}, ${toCol})`);
        
        // 成り判定が必要かチェック
        const canPromote = newBoard.can_promote(selectedRow, selectedCol, toRow, toCol);
        
        if (canPromote && !promote) {
          // 成り判定が必要だが選択されていない場合、ダイアログを表示
          setPendingMove({fromRow: selectedRow, fromCol: selectedCol, toRow: toRow, toCol: toCol});
          setShowPromotionDialog(true);
          return;
        }
        
        // 成り判定付きの移動を実行
        if (!newBoard.make_move_by_coords_with_promotion(selectedRow, selectedCol, toRow, toCol, promote)) {
          console.warn('移動の実行に失敗しました');
          return; // 移動に失敗した場合は現在の盤面を維持
        }
        console.log('移動が成功しました');
      } catch (err) {
        console.error('移動の実行中にエラー:', err);
        return;
      }

      // 新しい盤面を設定
      setBoard(newBoard);
      setSelectedPosition(null);
      setValidMoves([]);
      setShowPromotionDialog(false);
      setPendingMove(null);
    } catch (err) {
      console.error('盤面の更新中にエラーが発生しました:', err);
    }
  }, [board, selectedPosition]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (!board || !window.wasmModule) return;
    
    const createPosition = (r: number, c: number): any | null => {
      try {
        return new window.wasmModule.Position(r, c);
      } catch (err) {
        console.error(`Position作成エラー: (${r}, ${c})`, err);
        return null;
      }
    };

    try {
      // 持ち駒ドロップモードの場合
      if (isDroppingMode && selectedCapturedPiece) {
        const newBoard = board.clone();
        if (newBoard.drop_piece(selectedCapturedPiece, row, col)) {
          setBoard(newBoard);
          setSelectedCapturedPiece(null);
          setIsDroppingMode(false);
          setValidMoves([]);
        }
        return;
      }

      // 既に選択されているマスをクリックした場合
      if (selectedPosition) {
        try {
          const selectedRow = selectedPosition.get_row();
          const selectedCol = selectedPosition.get_column();
          if (row === selectedRow && col === selectedCol) {
            setSelectedPosition(null);
            setValidMoves([]);
            return;
          }
        } catch (err) {
          console.warn('選択位置の取得中にエラー:', err);
        }
      }

      // 有効な移動先をクリックした場合
      if (selectedPosition) {
        try {
          const isValidMove = validMoves.some(move => {
            try {
              const moveRow = move.get_row();
              const moveCol = move.get_column();
              return moveRow === row && moveCol === col;
            } catch (err) {
              console.warn('有効な移動の判定中にエラー:', err);
              return false;
            }
          });
          
          if (isValidMove) {
            handleMove(row, col);
            return;
          }
        } catch (err) {
          console.warn('有効な移動の判定中にエラー:', err);
        }
      }

      // 新しいマスを選択した場合
      try {
        const pieceInfo = board.get_piece_by_coords(row, col);
        const piece = pieceInfo.piece;
        const player = pieceInfo.player;
        const currentPlayer = board.get_current_player();
        
        // 現在の手番の駒のみ選択可能
        if (piece !== (window as any).wasmModule?.Piece?.Empty && player === currentPlayer) {
          const position = createPosition(row, col);
          if (position) {
            setSelectedPosition(position);
            try {
              const moves = board.get_valid_moves_by_coords(row, col);
              setValidMoves(moves);
            } catch (err) {
              console.error('有効な移動の取得に失敗:', err);
              setValidMoves([]);
            }
          }
        }
      } catch (err) {
        console.error(`get_piece_by_coordsエラー in handleSquareClick at (${row}, ${col}):`, err);
      }
    } catch (err) {
      console.error('盤面の描画中にエラーが発生しました:', err);
    }
  }, [board, selectedPosition, validMoves, handleMove, isDroppingMode, selectedCapturedPiece]);

  const handleCapturedPieceClick = useCallback((piece: any) => {
    if (selectedCapturedPiece === piece) {
      setSelectedCapturedPiece(null);
      setIsDroppingMode(false);
    } else {
      setSelectedCapturedPiece(piece);
      setIsDroppingMode(true);
      setSelectedPosition(null);
      setValidMoves([]);
    }
  }, [selectedCapturedPiece]);

  return (
    <ErrorBoundary>
      <div className="shogi-board">
        <div className="board-layout">
          {/* 後手の持ち駒（左側） */}
          {board && (
            <div className="captured-pieces-left">
              <CapturedPieces
                board={board}
                onPieceClick={handleCapturedPieceClick}
                selectedPiece={selectedCapturedPiece}
                player={window.wasmModule?.Player?.White}
                playerName="後手（白）"
              />
            </div>
          )}
          
          {/* 盤面と現在の手番 */}
          <div className="board-center">
            {board && renderBoard(board, selectedPosition, validMoves, handleSquareClick, isDroppingMode)}
            
            <div className="current-player">
              現在の手番: {board?.get_current_player() === (window as any).wasmModule?.Player?.Black ? '先手（黒）' : '後手（白）'}
            </div>
          </div>
          
          {/* 先手の持ち駒（右側） */}
          {board && (
            <div className="captured-pieces-right">
              <CapturedPieces
                board={board}
                onPieceClick={handleCapturedPieceClick}
                selectedPiece={selectedCapturedPiece}
                player={window.wasmModule?.Player?.Black}
                playerName="先手（黒）"
              />
            </div>
          )}
        </div>
        
        {/* 成り選択ダイアログ */}
        {showPromotionDialog && pendingMove && (
          <div className="promotion-dialog">
            <div className="promotion-content">
              <h3>成りますか？</h3>
              <div className="promotion-buttons">
                <button 
                  onClick={() => handleMove(pendingMove.toRow, pendingMove.toCol, true)}
                  className="promote-button"
                >
                  成る
                </button>
                <button 
                  onClick={() => handleMove(pendingMove.toRow, pendingMove.toCol, false)}
                  className="not-promote-button"
                >
                  成らない
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}; 