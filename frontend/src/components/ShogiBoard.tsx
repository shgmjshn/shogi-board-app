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

      return pieceMap[piece] || '';
    } catch (err) {
      console.error('駒の文字取得中にエラーが発生しました:', err);
      return '';
    }
  };

  const className = `square ${isSelected ? 'selected' : ''} ${isValidMove ? 'valid-move' : ''} ${
    player === wasm.Player.White ? 'white' : ''
  }`;

  return (
    <div className={className} onClick={handleClick}>
      <div>{getPieceText(piece, player)}</div>
    </div>
  );
};

// Positionオブジェクトを作成する関数
const createPosition = (row: number, col: number): wasm.Position | null => {
  console.group('Positionオブジェクトの作成を開始');
  console.log('作成パラメータ:', { row, col });

  if (!isWasmModuleAvailable()) {
    console.error('❌ WASMモジュールが初期化されていません');
    console.groupEnd();
    return null;
  }

  try {
    // 入力値の検証
    if (typeof row !== 'number' || typeof col !== 'number' ||
        isNaN(row) || isNaN(col) ||
        row < 0 || row >= 9 || col < 0 || col >= 9) {
      console.warn('❌ 無効な位置のパラメータです:', { row, col });
      console.groupEnd();
      return null;
    }

    // 新しいPositionオブジェクトを作成
    const WasmPosition = window.wasmModule.Position as typeof wasm.Position;
    if (!WasmPosition) {
      console.error('❌ WASMモジュールのPositionクラスが見つかりません');
      console.groupEnd();
      return null;
    }

    const pos = new WasmPosition(row, col);
    console.log('Positionオブジェクトを作成しました:', {
      position: pos,
      positionType: typeof pos,
      isInstance: pos instanceof WasmPosition
    });
    
    // 作成したオブジェクトの検証
    const validation = validatePosition(pos);
    if (!validation.isValid) {
      console.error('❌ 作成したPositionオブジェクトが無効です');
      console.groupEnd();
      return null;
    }

    console.log('✅ Positionオブジェクトの作成に成功:', { row: validation.row, col: validation.col });
    console.groupEnd();
    return pos;
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

  // 駒の移動を処理する関数
  const handleMove = useCallback(async (from: wasm.Position, to: wasm.Position) => {
    if (!board) return;

    try {
      const newBoard = new wasm.Board();
      if (!newBoard) {
        throw new Error('新しい盤面の作成に失敗しました');
      }

      // 現在の盤面の状態をコピー
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          const fromPos = createPosition(row + 9, col);
          const toPos = createPosition(row, col);
          if (!fromPos || !toPos) continue;

          const pieceInfo = board.get_piece(toPos);
          if (pieceInfo.piece !== wasm.Piece.Empty) {
            if (!newBoard.make_move(fromPos, toPos)) {
              console.warn('駒の配置に失敗しました:', { row, col });
            }
          }
        }
      }

      // 新しい移動を実行
      if (!newBoard.make_move(from, to)) {
        throw new Error('移動の実行に失敗しました');
      }

      setBoard(newBoard);
      setSelectedPosition(null);
      setValidMoves([]);
    } catch (err) {
      console.error('盤面の更新中にエラーが発生しました:', err);
      setError(new Error('盤面の更新に失敗しました: ' + (err instanceof Error ? err.message : String(err))));
    }
  }, [board, createPosition]);

  const handleSquareClick = useCallback((position: wasm.Position) => {
    if (!board) {
      console.warn('盤面が初期化されていません');
      return;
    }

    const validation = validatePosition(position);
    if (!validation.isValid) {
      console.warn('無効な位置がクリックされました');
      return;
    }

    try {
      // 同じマスをクリックした場合は選択を解除
      if (selectedPosition) {
        const selectedValidation = validatePosition(selectedPosition);
        if (selectedValidation.isValid && 
            selectedValidation.row === validation.row && 
            selectedValidation.col === validation.col) {
          setSelectedPosition(null);
          setValidMoves([]);
          return;
        }
      }

      // 有効な移動先をクリックした場合は移動を実行
      if (selectedPosition) {
        const selectedValidation = validatePosition(selectedPosition);
        if (selectedValidation.isValid) {
          const isValidMove = validMoves.some(move => {
            const moveValidation = validatePosition(move);
            return moveValidation.isValid && 
                   moveValidation.row === validation.row && 
                   moveValidation.col === validation.col;
          });

          if (isValidMove) {
            handleMove(selectedPosition, position);
            return;
          }
        }
      }

      // 新しい駒を選択
      const pieceInfo = board.get_piece(position);
      if (pieceInfo && pieceInfo.piece !== wasm.Piece.Empty && 
          board.get_current_player() === wasm.Player.Black) {
        setSelectedPosition(position);
        const moves = board.get_valid_moves(position);
        setValidMoves(moves.filter(move => validatePosition(move).isValid));
      }
    } catch (err) {
      console.error('駒の移動中にエラーが発生しました:', err);
      setError(err instanceof Error ? err : new Error('駒の移動中にエラーが発生しました'));
    }
  }, [board, selectedPosition, validMoves, handleMove]);

  // WebAssemblyモジュールの初期化状態を確認
  useEffect(() => {
    const checkWasmModule = () => {
      if (isWasmModuleAvailable()) {
        console.log("WASMモジュールが利用可能です");
        setIsInitialized(true);
      } else {
        console.log("WASMモジュールの初期化を待機中...");
        setTimeout(checkWasmModule, 100);
      }
    };
    checkWasmModule();
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
          const testPos = createPosition(0, 0);
          if (!testPos) {
            throw new Error('Positionオブジェクトの作成に失敗しました');
          }
          const pieceInfo = newBoard.get_piece(testPos);
          console.log('初期盤面の確認:', { piece: pieceInfo.piece });
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

  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;
  if (!board) return <div>盤面の初期化に失敗しました</div>;

  const renderBoard = (
    board: wasm.Board,
    selectedPosition: wasm.Position | null,
    validMoves: wasm.Position[],
    handleSquareClick: (position: wasm.Position) => void,
    setError: (error: Error | null) => void
  ) => {
    try {
      const rows = [];
      for (let row = 8; row >= 0; row--) {
        const cols = [];
        for (let col = 0; col < 9; col++) {
          // 各マスで新しいPositionオブジェクトを作成
          const position = createPosition(row, col);
          if (!position) {
            console.warn('無効な位置が作成されました:', { row, col });
            continue;
          }

          try {
            const pieceInfo = board.get_piece(position);
            if (!pieceInfo) {
              console.warn('駒の情報を取得できませんでした:', { row, col });
              continue;
            }

            // 選択状態と有効な移動先の確認用に新しいPositionオブジェクトを作成
            const isSelected = selectedPosition !== null &&
              createPosition(selectedPosition.row, selectedPosition.column) !== null &&
              selectedPosition.row === row && 
              selectedPosition.column === col;

            const isValidMove = validMoves.some(move => {
              const movePos = createPosition(move.row, move.column);
              return movePos !== null && movePos.row === row && movePos.column === col;
            });

            cols.push(
              <Square
                key={`${row}-${col}`}
                position={position}
                piece={pieceInfo.piece}
                player={pieceInfo.player}
                isSelected={isSelected}
                isValidMove={isValidMove}
                onClick={handleSquareClick}
              />
            );
          } catch (err) {
            console.error('マスの描画中にエラーが発生しました:', { row, col, err });
            continue;
          }
        }
        if (cols.length > 0) {
          rows.push(
            <div key={row} className="board-row">
              {cols}
            </div>
          );
        }
      }
      return rows;
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