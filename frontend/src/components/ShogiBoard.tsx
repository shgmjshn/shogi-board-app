import { useEffect, useState, useCallback } from 'react';
import * as wasm from "shogi-core";
import { ErrorBoundary } from './ErrorBoundary';
import './ShogiBoard.css';

interface SquareProps {
  row: number;
  col: number;
  piece: wasm.Piece;
  player: wasm.Player;
  isSelected: boolean;
  isValidMove: boolean;
  onClick: (row: number, col: number) => void;
}

const Square: React.FC<SquareProps> = ({ row, col, piece, player, isSelected, isValidMove, onClick }) => {
  const getPieceText = (piece: wasm.Piece, player: wasm.Player) => {
    const pieceMap: Record<wasm.Piece, string> = {
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
    return pieceMap[piece];
  };

  const className = `square ${isSelected ? 'selected' : ''} ${isValidMove ? 'valid-move' : ''} ${
    player === wasm.Player.White ? 'white' : ''
  }`;

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
  board: wasm.Board,
  selectedPosition: wasm.Position | null,
  validMoves: wasm.Position[],
  handleSquareClick: (row: number, col: number) => void
) => {
  const rows = [];
  for (let row = 8; row >= 0; row--) {
    const cols = [];
    for (let col = 0; col < 9; col++) {
      try {
        // 新しい座標ベースのメソッドを使用
        let piece = wasm.Piece.Empty;
        let player = wasm.Player.Black;
        
        try {
          const pieceInfo = board.get_piece_by_coords(row, col);
          piece = pieceInfo.piece;
          player = pieceInfo.player;
        } catch (err) {
          console.error(`get_piece_by_coordsエラー at (${row}, ${col}):`, err);
          // エラーが発生した場合は空のマスとして扱う
          piece = wasm.Piece.Empty;
          player = wasm.Player.Black;
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
          />
        );
      } catch (err) {
        console.error(`renderBoardエラー at (${row}, ${col}):`, err);
        cols.push(
          <Square
            key={`${row}-${col}`}
            row={row}
            col={col}
            piece={wasm.Piece.Empty}
            player={wasm.Player.Black}
            isSelected={false}
            isValidMove={false}
            onClick={handleSquareClick}
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
  const [board, setBoard] = useState<wasm.Board | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<wasm.Position | null>(null);
  const [validMoves, setValidMoves] = useState<wasm.Position[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [pendingMove, setPendingMove] = useState<{fromRow: number, fromCol: number, toRow: number, toCol: number} | null>(null);

  // WebAssemblyモジュールの初期化を一度だけ行う
  useEffect(() => {
    let isMounted = true;

    const initWasm = async () => {
      try {
        console.log('WASM初期化開始');
        
        // 既存のWASMモジュールをクリア
        if ((window as any).wasmModule) {
          console.log('既存のWASMモジュールをクリア');
          delete (window as any).wasmModule;
        }

        // WebAssemblyモジュールの読み込みと初期化
        console.log('WASMモジュールを読み込み中...');
        const wasmModule = await import('shogi_core');
        console.log('WASMモジュール読み込み完了:', wasmModule);
        
        // 初期化関数を呼び出し
        if (wasmModule.default && typeof wasmModule.default === 'function') {
          console.log('WASMモジュールのdefault関数を呼び出し中...');
          await wasmModule.default();
        } else if ((wasmModule as any).init && typeof (wasmModule as any).init === 'function') {
          console.log('WASMモジュールのinit関数を呼び出し中...');
          await (wasmModule as any).init();
        }
        
        // 少し待機してWASMモジュールが完全に初期化されるのを待つ
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
          
          // プロパティアクセステスト
          const row = testPosition.row;
          const column = testPosition.column;
          console.log('Positionプロパティアクセス成功:', { row, column });
          
          const debugInfo = testPosition.debug_info();
          console.log('Positionクラステスト成功:', debugInfo);
        } catch (err) {
          console.error('Positionクラステスト失敗:', err);
          throw new Error('Positionクラスの初期化に失敗しました');
        }
        
        console.log('WASMモジュールのクラス確認完了');
        console.log('Boardクラス:', wasmModule.Board);
        console.log('Positionクラス:', wasmModule.Position);

        // window.wasmModuleを設定
        (window as any).wasmModule = wasmModule;
        console.log('window.wasmModule設定完了');

        if (isMounted) {
          setIsInitialized(true);
          console.log('WASM初期化完了');
        }
      } catch (err) {
        console.error('WebAssemblyモジュールの初期化に失敗:', err);
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
    
    const createPosition = (r: number, c: number): wasm.Position | null => {
      try {
        return new window.wasmModule.Position(r, c);
      } catch (err) {
        console.error(`Position作成エラー: (${r}, ${c})`, err);
        return null;
      }
    };

    try {
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
        if (piece !== wasm.Piece.Empty && player === currentPlayer) {
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
  }, [board, selectedPosition, validMoves, handleMove]);

  return (
    <ErrorBoundary>
      <div className="shogi-board">
        {board && renderBoard(board, selectedPosition, validMoves, handleSquareClick)}
        <div className="current-player">
          現在の手番: {board?.get_current_player() === wasm.Player.Black ? '先手（黒）' : '後手（白）'}
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