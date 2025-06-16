import { useEffect, useState, useCallback } from 'react';
import * as wasm from "shogi-core";
import { ErrorBoundary } from './ErrorBoundary';
import './ShogiBoard.css';

// WASMモジュールが利用可能かチェックする関数
const isWasmModuleAvailable = (): boolean => {
  const available = typeof window !== 'undefined' && 
                   window.wasmModule !== undefined && 
                   window.wasmModule.Position !== undefined;
  console.log('WASMモジュールの状態:', {
    windowDefined: typeof window !== 'undefined',
    wasmModuleDefined: window?.wasmModule !== undefined,
    positionDefined: window?.wasmModule?.Position !== undefined,
    available
  });
  return available;
};

// Positionオブジェクトの検証を行う関数
const validatePosition = (position: wasm.Position | null): { isValid: boolean; row?: number; col?: number } => {
  console.group('位置の検証を開始');
  console.log('検証対象の位置:', {
    position,
    positionType: typeof position,
    isNull: position === null,
    isUndefined: position === undefined,
    isWasmAvailable: isWasmModuleAvailable()
  });

  // 最初のチェック：WASMモジュール
  if (!isWasmModuleAvailable()) {
    console.error('❌ WASMモジュールが初期化されていません');
    console.groupEnd();
    return { isValid: false };
  }

  // 二番目のチェック：null/undefined
  if (position === null || position === undefined) {
    console.warn('❌ 位置がnullまたはundefinedです');
    console.groupEnd();
    return { isValid: false };
  }

  // 三番目のチェック：オブジェクトの型とWASMモジュールの参照
  try {
    // WASMモジュールのPositionクラスを取得
    const WasmPosition = window.wasmModule.Position as typeof wasm.Position;
    if (!WasmPosition) {
      console.error('❌ WASMモジュールのPositionクラスが見つかりません');
      console.groupEnd();
      return { isValid: false };
    }

    // インスタンスチェック
    const isPositionInstance = position instanceof WasmPosition;
    console.log('Positionオブジェクトの型チェック:', {
      positionType: typeof position,
      expectedType: 'Position',
      isInstance: isPositionInstance
    });

    if (!isPositionInstance) {
      console.warn('❌ 無効なPositionオブジェクトです');
      console.groupEnd();
      return { isValid: false };
    }

    // 四番目のチェック：プロパティの存在と型
    try {
      // プロパティの存在確認を先に行う
      if (!('row' in position) || !('column' in position)) {
        console.warn('❌ 必要なプロパティが存在しません');
        console.groupEnd();
        return { isValid: false };
      }

      // プロパティの型と値の確認
      const row = Number(position.row);
      const col = Number(position.column);

      if (isNaN(row) || isNaN(col)) {
        console.warn('❌ 位置のプロパティが数値に変換できません:', { row, col });
        console.groupEnd();
        return { isValid: false };
      }

      if (row < 0 || row >= 9 || col < 0 || col >= 9) {
        console.warn('❌ 位置が盤面の範囲外です:', { row, col });
        console.groupEnd();
        return { isValid: false };
      }

      console.log('✅ 位置の検証が成功しました:', { row, col });
      console.groupEnd();
      return { isValid: true, row, col };
    } catch (err) {
      console.error('❌ 位置のプロパティにアクセス中にエラーが発生しました:', err);
      console.groupEnd();
      return { isValid: false };
    }
  } catch (err) {
    console.error('❌ 位置の検証中にエラーが発生しました:', err);
    console.groupEnd();
    return { isValid: false };
  }
};

interface SquareProps {
  position: wasm.Position;
  piece: wasm.Piece;
  player: wasm.Player;
  isSelected: boolean;
  isValidMove: boolean;
  onClick: (position: wasm.Position) => void;
}

const Square: React.FC<SquareProps> = ({ position, piece, player, isSelected, isValidMove, onClick }) => {
  const handleClick = useCallback(() => {
    console.group('マスのクリックイベント');
    console.log('クリックされた位置:', {
      positionExists: position !== null && position !== undefined,
      isWasmAvailable: isWasmModuleAvailable(),
      positionType: typeof position
    });

    if (!isWasmModuleAvailable()) {
      console.error('❌ WASMモジュールが初期化されていません');
      console.groupEnd();
      return;
    }

    const validation = validatePosition(position);
    if (validation.isValid && validation.row !== undefined && validation.col !== undefined) {
      console.log('✅ 有効な位置がクリックされました:', {
        row: validation.row,
        column: validation.col
      });
      // 新しいPositionオブジェクトを作成して渡す
      const newPosition = createPosition(validation.row, validation.col);
      if (newPosition) {
        console.log('✅ 新しいPositionオブジェクトを作成して移動を実行');
        onClick(newPosition);
      } else {
        console.error('❌ 新しいPositionオブジェクトの作成に失敗');
      }
    } else {
      console.warn('❌ 無効な位置がクリックされました');
    }
    console.groupEnd();
  }, [position, onClick]);

  const getPieceText = (piece: wasm.Piece, player: wasm.Player) => {
    try {
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

    return pieceMap[piece][player === Player.Black ? 'black' : 'white'];
  };

  const className = `square ${isSelected ? 'selected' : ''} ${isValidMove ? 'valid-move' : ''} ${
    player === Player.White ? 'white' : ''
  }`;

  const pieceText = getPieceText(piece, player);

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
    console.error('❌ Positionオブジェクトの作成中にエラーが発生しました:', err);
    console.groupEnd();
    return null;
  }
};

export const ShogiBoard: React.FC = () => {
  const [board, setBoard] = useState<wasm.Board | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<wasm.Position | null>(null);
  const [validMoves, setValidMoves] = useState<wasm.Position[]>([]);
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
    if (!isInitialized || !window.wasmModule) return;

    const initBoard = async () => {
      try {
        console.log('新しい盤面を作成します');
        const newBoard = new window.wasmModule.Board();
        
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
      console.error('盤面の描画中にエラーが発生しました:', err);
      setError(err instanceof Error ? err : new Error('盤面の描画中にエラーが発生しました'));
      return null;
    }
  };

  return (
    <ErrorBoundary>
      <div className="shogi-board">
        {renderBoard(board, selectedPosition, validMoves, handleSquareClick, setError)}
        <div className="current-player">
          現在の手番: {board.get_current_player() === wasm.Player.Black ? '先手' : '後手'}
        </div>
      </div>
    </ErrorBoundary>
  );
}; 