import { useEffect, useState, useCallback } from 'react';
import { Board, Position, Piece, Player } from 'shogi_core';
import { ErrorBoundary } from './ErrorBoundary';
import './ShogiBoard.css';

interface SquareProps {
  position: Position;
  piece: Piece;
  player: Player;
  isSelected: boolean;
  isValidMove: boolean;
  onClick: (position: Position) => void;
}

const Square: React.FC<SquareProps> = ({ position, piece, player, isSelected, isValidMove, onClick }) => {
  const getPieceText = (piece: Piece, player: Player) => {
    const pieceMap: Record<Piece, { black: string; white: string }> = {
      [Piece.Empty]: { black: '', white: '' },
      [Piece.Pawn]: { black: '歩', white: '歩' },
      [Piece.Lance]: { black: '香', white: '香' },
      [Piece.Knight]: { black: '桂', white: '桂' },
      [Piece.Silver]: { black: '銀', white: '銀' },
      [Piece.Gold]: { black: '金', white: '金' },
      [Piece.Bishop]: { black: '角', white: '角' },
      [Piece.Rook]: { black: '飛', white: '飛' },
      [Piece.King]: { black: '玉', white: '玉' },
      [Piece.PromotedPawn]: { black: 'と', white: 'と' },
      [Piece.PromotedLance]: { black: '成香', white: '成香' },
      [Piece.PromotedKnight]: { black: '成桂', white: '成桂' },
      [Piece.PromotedSilver]: { black: '成銀', white: '成銀' },
      [Piece.PromotedBishop]: { black: '馬', white: '馬' },
      [Piece.PromotedRook]: { black: '龍', white: '龍' },
    };

    return pieceMap[piece][player === Player.Black ? 'black' : 'white'];
  };

  const className = `square ${isSelected ? 'selected' : ''} ${isValidMove ? 'valid-move' : ''} ${
    player === Player.White ? 'white' : ''
  }`;

  return (
    <div className={className} onClick={() => onClick(position)}>
      {getPieceText(piece, player)}
    </div>
  );
};

const renderBoard = (
  board: Board,
  selectedPosition: Position | null,
  validMoves: Position[],
  handleSquareClick: (position: Position) => void,
  setError: (error: Error | null) => void
) => {
  try {
    const rows = [];
    for (let row = 0; row < 9; row++) {
      const cols = [];
      for (let col = 0; col < 9; col++) {
        const position = new Position(row, col);
        const [piece, player] = board.get_piece(position);
        const isSelected = selectedPosition !== null &&
          selectedPosition.row === row && selectedPosition.column === col;
        const isValidMove = validMoves.some(move =>
          move.row === row && move.column === col
        );

        cols.push(
          <Square
            key={`${row}-${col}`}
            position={position}
            piece={piece}
            player={player}
            isSelected={isSelected}
            isValidMove={isValidMove}
            onClick={handleSquareClick}
          />
        );
      }
      rows.push(
        <div key={row} className="board-row">
          {cols}
        </div>
      );
    }
    return rows;
  } catch (err) {
    console.error('盤面の描画中にエラーが発生しました:', err);
    setError(err instanceof Error ? err : new Error('盤面の描画中にエラーが発生しました'));
    return null;
  }
};

export const ShogiBoard: React.FC = () => {
  const [board, setBoard] = useState<Board | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // WebAssemblyモジュールの初期化を一度だけ行う
  useEffect(() => {
    let isMounted = true;
    let wasmModule: any = null;

    const initWasm = async () => {
      try {
        // WebAssemblyモジュールの読み込み
        const module = await import('shogi_core');
        wasmModule = module;
        
        // モジュールが正しく読み込まれたことを確認
        if (!module.default || typeof module.default !== 'function') {
          throw new Error('WebAssemblyモジュールの読み込みに失敗しました');
        }

        // WebAssemblyモジュールの初期化
        const wasmUrl = new URL('../shogi-core/pkg/shogi_core_bg.wasm', import.meta.url);
        console.log('WebAssemblyモジュールの初期化を開始:', wasmUrl.toString());
        
        await module.default({
          url: wasmUrl
        });
        console.log('WebAssemblyモジュールの初期化が完了しました');

        // モジュールのクラスが利用可能か確認
        if (!module.Board || !module.Position) {
          throw new Error('必要なクラスが見つかりません');
        }

        if (isMounted) {
          setIsInitialized(true);
          setError(null);
        }
      } catch (err) {
        console.error('WebAssemblyモジュールの初期化に失敗:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('WebAssemblyモジュールの初期化に失敗しました'));
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
    if (!isInitialized) return;

    const initBoard = async () => {
      try {
        // モジュールを再インポートせず、既存のインスタンスを使用
        const module = await import('shogi_core');
        if (!module.Board || !module.Position) {
          throw new Error('WebAssemblyモジュールが正しく初期化されていません');
        }

        console.log('新しい盤面を作成します');
        const newBoard = new module.Board();
        
        if (!newBoard) {
          throw new Error('盤面の作成に失敗しました');
        }

        // 盤面が正しく初期化されたことを確認
        try {
          console.log('盤面の初期化を確認します');
          const testPos = new module.Position(0, 0);
          if (!testPos) {
            throw new Error('Positionオブジェクトの作成に失敗しました');
          }
          const [piece] = newBoard.get_piece(testPos);
          console.log('初期盤面の確認:', { piece });
        } catch (err) {
          console.error('盤面の初期化確認中にエラー:', err);
          throw new Error('盤面の初期化が不完全です: ' + (err instanceof Error ? err.message : String(err)));
        }

        console.log('盤面の初期化が完了しました');
        setBoard(newBoard);
        setError(null);
      } catch (err) {
        console.error('盤面の初期化に失敗しました:', err);
        setError(err instanceof Error ? err : new Error('盤面の初期化に失敗しました'));
      } finally {
        setIsLoading(false);
      }
    };

    initBoard();
  }, [isInitialized]);

  const handleSquareClick = useCallback((position: Position) => {
    if (!board) return;

    const handleMove = async () => {
      try {
        // 新しい盤面を作成
        const module = await import('shogi_core');
        const newBoard = new module.Board();
        if (!newBoard) {
          throw new Error('新しい盤面の作成に失敗しました');
        }

        // 現在の盤面の状態をコピー
        // 一時的な位置を使用して駒を移動
        const tempPositions: [Position, Position][] = [];
        for (let row = 0; row < 9; row++) {
          for (let col = 0; col < 9; col++) {
            const pos = new module.Position(row, col);
            const [piece] = board.get_piece(pos);
            if (piece !== Piece.Empty) {
              // 一時的な位置を生成（盤面外）
              const tempFrom = new module.Position(row + 9, col);
              const tempTo = new module.Position(row, col);
              tempPositions.push([tempFrom, tempTo]);
            }
          }
        }

        // 駒を一時的な位置から実際の位置に移動
        for (const [from, to] of tempPositions) {
          if (!newBoard.make_move(from, to)) {
            console.warn('駒の配置に失敗しました:', from.row, from.column);
          }
        }

        // 新しい移動を実行
        if (selectedPosition && !newBoard.make_move(selectedPosition, position)) {
          throw new Error('移動の実行に失敗しました');
        }

        // 盤面の状態を更新
        setBoard(newBoard);
        setSelectedPosition(null);
        setValidMoves([]);
      } catch (err) {
        console.error('盤面の更新中にエラーが発生しました:', err);
        setError(new Error('盤面の更新に失敗しました: ' + (err instanceof Error ? err.message : String(err))));
      }
    };

    try {
      // 既に選択されているマスをクリックした場合
      if (selectedPosition && position.row === selectedPosition.row && position.column === selectedPosition.column) {
        setSelectedPosition(null);
        setValidMoves([]);
        return;
      }

      // 有効な移動先をクリックした場合
      if (selectedPosition && validMoves.some(move => 
        move.row === position.row && move.column === position.column
      )) {
        handleMove();
        return;
      }

      // 新しいマスを選択した場合
      const [piece] = board.get_piece(position);
      if (piece !== Piece.Empty && board.get_current_player() === Player.Black) {
        setSelectedPosition(position);
        const moves = board.get_valid_moves(position);
        setValidMoves(moves);
      }
    } catch (err) {
      console.error('駒の移動中にエラーが発生しました:', err);
      setError(err instanceof Error ? err : new Error('駒の移動中にエラーが発生しました'));
    }
  }, [board, selectedPosition, validMoves]);

  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;
  if (!board) return <div>盤面の初期化に失敗しました</div>;

  return (
    <ErrorBoundary>
      <div className="shogi-board">
        {renderBoard(board, selectedPosition, validMoves, handleSquareClick, setError)}
        <div className="current-player">
          現在の手番: {board.get_current_player() === Player.Black ? '先手' : '後手'}
        </div>
      </div>
    </ErrorBoundary>
  );
}; 