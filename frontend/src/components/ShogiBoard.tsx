import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { CapturedPieces } from './CapturedPieces';
import './ShogiBoard.css';

// WASMモジュールの型定義
// interface WasmModule {
//   Board: any;
//   Position: any;
//   Piece: any;
//   Player: any;
//   PieceInfo: any;
// }

interface SquareProps {
  row: number;
  col: number;
  piece: any;
  player: any;
  isSelected: boolean;
  isValidMove: boolean;
  onClick: (row: number, col: number) => void;
  isDroppingMode: boolean;
  isEditMode?: boolean;
  onDrop?: (row: number, col: number, event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDragStart?: (piece: any, player: any, event: React.DragEvent) => void;
  onDragEnd?: (event: React.DragEvent) => void;
  onDragLeave?: (event: React.DragEvent) => void;
}

const Square: React.FC<SquareProps> = ({ row, col, piece, player, isSelected, isValidMove, onClick, isDroppingMode, isEditMode, onDrop, onDragOver, onDragStart, onDragEnd, onDragLeave }) => {
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

  const handleDrop = useCallback((event: React.DragEvent) => {
    if (onDrop) {
      onDrop(row, col, event);
    }
  }, [onDrop, row, col]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (onDragOver) {
      onDragOver(event);
    }
  }, [onDragOver]);

  const handleDragStart = useCallback((event: React.DragEvent) => {
    if (onDragStart && piece !== (window as any).wasmModule?.Piece?.Empty) {
      onDragStart(piece, player, event);
    }
  }, [onDragStart, piece, player]);

  const handleDragEnd = useCallback((event: React.DragEvent) => {
    if (onDragEnd) {
      onDragEnd(event);
    }
  }, [onDragEnd]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    if (onDragLeave) {
      onDragLeave(event);
    }
  }, [onDragLeave]);

  const pieceText = getPieceText(piece, player);

  return (
    <div 
      className={className} 
      onClick={handleClick}
      draggable={isEditMode && piece !== (window as any).wasmModule?.Piece?.Empty}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragLeave={handleDragLeave}
      data-piece={pieceText}
      data-row={row}
      data-col={col}
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
  isDroppingMode: boolean = false,
  isEditMode: boolean = false,
  onDrop?: (row: number, col: number, event: React.DragEvent) => void,
  onDragOver?: (event: React.DragEvent) => void,
  onDragStart?: (piece: any, player: any, event: React.DragEvent) => void,
  onDragEnd?: (event: React.DragEvent) => void,
  onDragLeave?: (event: React.DragEvent) => void
) => {
  const squares = [];
  for (let row = 8; row >= 0; row--) {
    for (let col = 0; col < 9; col++) {
      try {
        // 新しい座標ベースのメソッドを使用
        let piece = (window as any).wasmModule?.Piece?.Empty;
        let player = (window as any).wasmModule?.Player?.Black;
        
        try {
          const pieceInfo = board.get_piece_by_coords(row, col);
          piece = pieceInfo.piece;
          player = pieceInfo.player;
          
          // 成り駒のデバッグログ（成り駒の場合のみ）
          const wasm = (window as any).wasmModule;
          if (wasm && (piece === wasm.Piece.PromotedPawn || 
                      piece === wasm.Piece.PromotedLance || 
                      piece === wasm.Piece.PromotedKnight || 
                      piece === wasm.Piece.PromotedSilver || 
                      piece === wasm.Piece.PromotedBishop || 
                      piece === wasm.Piece.PromotedRook)) {
            console.log(`成り駒検出: 位置(${row}, ${col}), 駒: ${piece}`);
          }
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

        squares.push(
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
            isEditMode={isEditMode}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragLeave={onDragLeave}
          />
        );
      } catch (err) {
        console.error(`renderBoardエラー at (${row}, ${col}):`, err);
        squares.push(
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
            isEditMode={isEditMode}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragLeave={onDragLeave}
          />
        );
      }
    }
  }
  return squares;
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
  const [selectedCapturedPiecePlayer, setSelectedCapturedPiecePlayer] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEditPiece, setSelectedEditPiece] = useState<any>(null);
  const [selectedEditPlayer, setSelectedEditPlayer] = useState<any>(null);
  const [draggedPiece, setDraggedPiece] = useState<any>(null);
  const [draggedPlayer, setDraggedPlayer] = useState<any>(null);
  const [isBoardFlipped, setIsBoardFlipped] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState<{row: number, col: number} | null>(null);

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

  const handleMove = useCallback(async (toRow: number, toCol: number, promote?: boolean) => {
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
        console.log(`移動実行: (${selectedRow}, ${selectedCol}) → (${toRow}, ${toCol}), 成り: ${promote}`);
        
        // 成り判定が必要かチェック
        const canPromote = newBoard.can_promote(selectedRow, selectedCol, toRow, toCol);
        console.log('成り可能:', canPromote);
        console.log('promoteパラメータ:', promote);
        console.log('promote === undefined:', promote === undefined);
        console.log('promoteの型:', typeof promote);
        
        // promoteパラメータが明示的に指定されていない場合のみダイアログを表示
        if (canPromote && promote === undefined) {
          console.log('成り選択ダイアログを表示します');
          // 成り判定が必要だが選択されていない場合、ダイアログを表示
          setPendingMove({fromRow: selectedRow, fromCol: selectedCol, toRow: toRow, toCol: toCol});
          setShowPromotionDialog(true);
          return;
        } else {
          console.log('ダイアログ表示条件を満たしていません:', {
            canPromote,
            promote,
            promoteIsUndefined: promote === undefined
          });
        }
        
        // 成り判定付きの移動を実行
        console.log('make_move_by_coords_with_promotion呼び出し:', selectedRow, selectedCol, toRow, toCol, promote);
        if (!newBoard.make_move_by_coords_with_promotion(selectedRow, selectedCol, toRow, toCol, promote)) {
          console.warn('移動の実行に失敗しました');
          return; // 移動に失敗した場合は現在の盤面を維持
        }
        console.log('移動が成功しました');
        
        // 成り処理後の盤面状態を確認
        if (promote) {
          console.log('=== 成り処理後の盤面状態確認 ===');
          const movedPieceInfo = newBoard.get_piece_by_coords(toRow, toCol);
          console.log('移動先の駒:', movedPieceInfo);
          console.log('移動先の駒の種類:', movedPieceInfo.piece);
          console.log('WASMの成り駒値:', {
            PromotedPawn: (window as any).wasmModule?.Piece?.PromotedPawn,
            PromotedLance: (window as any).wasmModule?.Piece?.PromotedLance,
            PromotedKnight: (window as any).wasmModule?.Piece?.PromotedKnight,
            PromotedSilver: (window as any).wasmModule?.Piece?.PromotedSilver,
            PromotedBishop: (window as any).wasmModule?.Piece?.PromotedBishop,
            PromotedRook: (window as any).wasmModule?.Piece?.PromotedRook,
          });
          
          // 盤面全体の状態も確認
          const boardState = newBoard.debug_board_state();
          console.log('盤面全体の状態:', boardState);
        }
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
    
    // 編集モードの場合は編集用のハンドラーを使用
    if (isEditMode) {
      handleEditSquareClick(row, col);
      return;
    }
    
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
      console.log('持ち駒ドロップ条件チェック:', {
        isDroppingMode,
        selectedCapturedPiece: !!selectedCapturedPiece,
        selectedCapturedPiecePlayer: !!selectedCapturedPiecePlayer
      });
      
      if (isDroppingMode && selectedCapturedPiece) {
        console.log('=== 持ち駒ドロップ処理開始 ===');
        console.log('持ち駒ドロップモード:', selectedCapturedPiece);
        
        // selectedCapturedPieceからプレイヤー情報を取得
        // CapturedPiecesコンポーネントでは、playerはWASMのプレイヤー値（0または1）として渡される
        const currentPlayer = board.get_current_player();
        console.log('現在の手番:', currentPlayer);
        
        // 現在の手番の持ち駒かチェック
        if (selectedCapturedPiecePlayer !== currentPlayer) {
          console.log('現在の手番の持ち駒ではありません');
          return;
        }
        
        console.log('プレイヤー詳細:', {
          selectedPlayer: selectedCapturedPiecePlayer,
          currentPlayer: currentPlayer,
          isEqual: selectedCapturedPiecePlayer === currentPlayer
        });
        console.log('WASMプレイヤー値:', {
          Black: (window as any).wasmModule?.Player?.Black,
          White: (window as any).wasmModule?.Player?.White
        });
        
        const newBoard = board.clone();
        // selectedCapturedPieceから正しいPiece列挙型を取得
        const pieceType = selectedCapturedPiece.pieceType;
        const wasmPiece = (window as any).wasmModule?.Piece;
        console.log('pieceType:', pieceType, 'wasmPiece:', wasmPiece);
        console.log('wasmPieceの構造:', Object.keys(wasmPiece), Object.values(wasmPiece));
        if (wasmPiece && pieceType >= 0 && pieceType <= 7) {
          // pieceTypeをPiece列挙型に変換
          const pieceNames = ['Pawn', 'Lance', 'Knight', 'Silver', 'Gold', 'Bishop', 'Rook', 'King'];
          const pieceName = pieceNames[pieceType];
          const pieceEnum = wasmPiece[pieceName];
          console.log('変換されたpieceEnum:', pieceEnum, 'pieceName:', pieceName);
          console.log('drop_piece呼び出し:', pieceEnum, row, col);
          
          // ドロップ可能かチェック
          const canDrop = newBoard.can_drop_piece(pieceEnum, row, col);
          console.log('can_drop_piece結果:', canDrop);
          
          // 詳細な理由を取得
          const debugReason = newBoard.debug_can_drop_piece(pieceEnum, row, col);
          console.log('ドロップ失敗理由:', debugReason);
          
          // 歩の場合は二歩の判定の詳細も表示
          if (pieceEnum === (window as any).wasmModule?.Piece?.Pawn) {
            const pawnDebug = newBoard.debug_has_pawn_in_column(col, currentPlayer, -1);
            console.log('二歩の判定詳細:', pawnDebug);
          }
          
          // 角の場合は特別なデバッグ情報を表示
          if (pieceEnum === (window as any).wasmModule?.Piece?.Bishop) {
            console.log('角のドロップ判定:');
            console.log('- 現在の手番:', newBoard.get_current_player());
            console.log('- ドロップ位置:', row, col);
            console.log('- 持ち駒数:', newBoard.get_captured_piece_count(newBoard.get_current_player(), pieceEnum));
          }
          
          // 盤面の状態も表示
          const boardState = newBoard.debug_board_state();
          console.log('盤面の状態:', boardState);
          
          // 持ち駒の状態も表示
          const capturedPiecesState = newBoard.debug_captured_pieces();
          console.log('持ち駒の状態:', capturedPiecesState);
          
          if (newBoard.drop_piece(pieceEnum, row, col)) {
            console.log('持ち駒ドロップ成功');
            setBoard(newBoard);
            setSelectedCapturedPiece(null);
            setSelectedCapturedPiecePlayer(null);
            setIsDroppingMode(false);
            setValidMoves([]);
          } else {
            console.log('持ち駒ドロップ失敗');
          }
        } else {
          console.log('pieceTypeまたはwasmPieceが無効:', pieceType, wasmPiece);
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
  }, [board, selectedPosition, validMoves, handleMove, isDroppingMode, selectedCapturedPiece, selectedCapturedPiecePlayer, isEditMode]);

  const handleCapturedPieceClick = useCallback((piece: any, player: any) => {
    console.log('=== 持ち駒クリック詳細デバッグ ===');
    console.log('piece:', piece);
    console.log('player:', player);
    console.log('playerの型:', typeof player);
    console.log('player === null:', player === null);
    console.log('player === undefined:', player === undefined);
    console.log('player === false:', player === false);
    console.log('player === 0:', player === 0);
    console.log('player === 1:', player === 1);
    console.log('WASMプレイヤー値:', {
      Black: (window as any).wasmModule?.Player?.Black,
      White: (window as any).wasmModule?.Player?.White
    });
    console.log('player === WASM.Black:', player === (window as any).wasmModule?.Player?.Black);
    console.log('player === WASM.White:', player === (window as any).wasmModule?.Player?.White);
    console.log('現在のselectedCapturedPiece:', selectedCapturedPiece);
    console.log('現在の手番:', board?.get_current_player());
    console.log('プレイヤー比較:', player === board?.get_current_player());
    console.log('プレイヤー詳細:', {
      selectedPlayer: player,
      currentPlayer: board?.get_current_player(),
      isEqual: player === board?.get_current_player()
    });
    
    // 現在の手番の持ち駒のみ選択可能
    const currentPlayer = board?.get_current_player();
    if (player !== currentPlayer) {
      console.log('現在の手番の持ち駒ではありません');
      return;
    }
    
    if (selectedCapturedPiece === piece && selectedCapturedPiecePlayer === player) {
      console.log('持ち駒選択解除');
      setSelectedCapturedPiece(null);
      setSelectedCapturedPiecePlayer(null);
      setIsDroppingMode(false);
    } else {
      console.log('持ち駒選択:', piece, 'プレイヤー:', player);
      console.log('setSelectedCapturedPiecePlayerに設定する値:', player);
      setSelectedCapturedPiece(piece);
      setSelectedCapturedPiecePlayer(player);
      setIsDroppingMode(true);
      setSelectedPosition(null);
      setValidMoves([]);
    }
  }, [selectedCapturedPiece, selectedCapturedPiecePlayer, board]);

  // 局面編集用のハンドラー
  const handleEditModeToggle = useCallback(() => {
    setIsEditMode(!isEditMode);
    setSelectedPosition(null);
    setValidMoves([]);
    setSelectedCapturedPiece(null);
    setSelectedCapturedPiecePlayer(null);
    setIsDroppingMode(false);
    setSelectedEditPiece(null);
    setSelectedEditPlayer(null);
  }, [isEditMode]);

  const handleResetToInitial = useCallback(() => {
    if (!board) return;
    const newBoard = board.clone();
    newBoard.reset_to_initial_position();
    setIsBoardFlipped(false);
    setBoard(newBoard);
  }, [board]);

  const handleResetToMatePosition = useCallback(() => {
    if (!board) return;
    const newBoard = board.clone();
    
    // 盤面をクリア
    newBoard.clear_board();
    
    // 後手玉を初期位置に配置
    newBoard.set_piece_by_coords(8, 4, window.wasmModule.Piece.King, window.wasmModule.Player.White);
    
    // 先手の駒をすべて後手の持ち駒に
    const pieces = [
      { piece: window.wasmModule.Piece.Pawn, count: 9 },
      { piece: window.wasmModule.Piece.Lance, count: 2 },
      { piece: window.wasmModule.Piece.Knight, count: 2 },
      { piece: window.wasmModule.Piece.Silver, count: 2 },
      { piece: window.wasmModule.Piece.Gold, count: 2 },
      { piece: window.wasmModule.Piece.Bishop, count: 1 },
      { piece: window.wasmModule.Piece.Rook, count: 1 },
      { piece: window.wasmModule.Piece.King, count: 1 }
    ];
    
    for (const { piece, count } of pieces) {
      newBoard.set_captured_piece_count(window.wasmModule.Player.White, piece, count);
    }
    
    // 手番を先手に設定
    newBoard.set_current_player(window.wasmModule.Player.Black);
    
    // 反転状態をリセット
    setIsBoardFlipped(false);
    
    setBoard(newBoard);
  }, [board]);

  const handleChangeTurn = useCallback(() => {
    if (!board) return;
    const newBoard = board.clone();
    const currentPlayer = newBoard.get_current_player();
    const newPlayer = currentPlayer === window.wasmModule.Player.Black 
      ? window.wasmModule.Player.White 
      : window.wasmModule.Player.Black;
    newBoard.set_current_player(newPlayer);
    setBoard(newBoard);
  }, [board]);

  const handleFlipBoard = useCallback(() => {
    if (!board) return;
    const newBoard = board.clone();
    
    // 盤面を一時的に保存
    const tempBoard = Array(9).fill(null).map(() => Array(9).fill(null));
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const pieceInfo = newBoard.get_piece_by_coords(row, col);
        tempBoard[row][col] = { piece: pieceInfo.piece, player: pieceInfo.player };
      }
    }
    
    // 盤面をクリア
    newBoard.clear_board();
    
    // 盤面を反転して配置
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const flippedRow = 8 - row;
        const flippedCol = 8 - col;
        const pieceInfo = tempBoard[row][col];
        if (pieceInfo.piece !== window.wasmModule.Piece.Empty) {
          newBoard.set_piece_by_coords(flippedRow, flippedCol, pieceInfo.piece, pieceInfo.player);
        }
      }
    }
    
    // 持ち駒を交換
    const blackCaptured = [];
    const whiteCaptured = [];
    
    const pieceTypes = [
      window.wasmModule.Piece.Pawn,
      window.wasmModule.Piece.Lance,
      window.wasmModule.Piece.Knight,
      window.wasmModule.Piece.Silver,
      window.wasmModule.Piece.Gold,
      window.wasmModule.Piece.Bishop,
      window.wasmModule.Piece.Rook,
      window.wasmModule.Piece.King
    ];
    
    // 現在の持ち駒を保存
    for (const piece of pieceTypes) {
      const blackCount = newBoard.get_captured_piece_count(window.wasmModule.Player.Black, piece);
      const whiteCount = newBoard.get_captured_piece_count(window.wasmModule.Player.White, piece);
      blackCaptured.push({ piece, count: blackCount });
      whiteCaptured.push({ piece, count: whiteCount });
    }
    
    // 持ち駒をクリア
    newBoard.clear_captured_pieces(window.wasmModule.Player.Black);
    newBoard.clear_captured_pieces(window.wasmModule.Player.White);
    
    // 持ち駒を交換
    for (const { piece, count } of blackCaptured) {
      newBoard.set_captured_piece_count(window.wasmModule.Player.White, piece, count);
    }
    for (const { piece, count } of whiteCaptured) {
      newBoard.set_captured_piece_count(window.wasmModule.Player.Black, piece, count);
    }
    
    // 表示位置を入れ替える
    setIsBoardFlipped(!isBoardFlipped);
    
    setBoard(newBoard);
  }, [board, isBoardFlipped]);

  const handleEditSquareClick = useCallback((row: number, col: number) => {
    if (!board || !isEditMode) return;
    
    if (selectedEditPiece) {
      const newBoard = board.clone();
      newBoard.set_piece_by_coords(row, col, selectedEditPiece, selectedEditPlayer);
      setBoard(newBoard);
    } else {
      // 駒が選択されていない場合は削除
      const newBoard = board.clone();
      newBoard.clear_square_by_coords(row, col);
      setBoard(newBoard);
    }
  }, [board, isEditMode, selectedEditPiece, selectedEditPlayer]);

  // ドラッグ&ドロップ用のハンドラー
  const handlePieceDragStart = useCallback((piece: any, player: any, event: React.DragEvent) => {
    if (!isEditMode) return;
    
    // 持ち駒の場合はpieceTypeプロパティがある
    if (piece.pieceType !== undefined) {
      // 持ち駒からドラッグ
      const pieceTypes = [
        window.wasmModule.Piece.Pawn,
        window.wasmModule.Piece.Lance,
        window.wasmModule.Piece.Knight,
        window.wasmModule.Piece.Silver,
        window.wasmModule.Piece.Gold,
        window.wasmModule.Piece.Bishop,
        window.wasmModule.Piece.Rook,
        window.wasmModule.Piece.King
      ];
      setDraggedPiece(pieceTypes[piece.pieceType]);
      setDraggedPlayer(player);
      setDragStartPosition(null); // 持ち駒からドラッグの場合は位置なし
    } else {
      // 盤面の駒からドラッグ
      setDraggedPiece(piece);
      setDraggedPlayer(player);
      
      // ドラッグ開始位置を記録（イベントから位置を取得）
      const target = event.target as HTMLElement;
      const squareElement = target.closest('.square');
      if (squareElement) {
        const row = parseInt(squareElement.getAttribute('data-row') || '0');
        const col = parseInt(squareElement.getAttribute('data-col') || '0');
        setDragStartPosition({ row, col });
        
        // 元の位置の駒を削除
        const newBoard = board.clone();
        newBoard.clear_square_by_coords(row, col);
        setBoard(newBoard);
      }
    }
    
    event.dataTransfer.effectAllowed = 'move';
  }, [isEditMode, board]);

  const handleSquareDrop = useCallback((row: number, col: number, event: React.DragEvent) => {
    if (!board || !isEditMode || !draggedPiece) return;
    
    event.preventDefault();
    const newBoard = board.clone();
    
    // 新しい駒を配置
    newBoard.set_piece_by_coords(row, col, draggedPiece, draggedPlayer);
    setBoard(newBoard);
    setDraggedPiece(null);
    setDraggedPlayer(null);
    setDragStartPosition(null);
  }, [board, isEditMode, draggedPiece, draggedPlayer]);

  const handleSquareDragOver = useCallback((event: React.DragEvent) => {
    if (isEditMode) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  }, [isEditMode]);

  const handleCapturedPieceDrop = useCallback((player: any, _piece: any, event: React.DragEvent) => {
    if (!board || !isEditMode || !draggedPiece) return;
    
    event.preventDefault();
    const newBoard = board.clone();
    
    // ドラッグされた駒を指定プレイヤーの持ち駒に追加
    newBoard.add_captured_piece(player, draggedPiece);
    
    setBoard(newBoard);
    setDraggedPiece(null);
    setDraggedPlayer(null);
    setDragStartPosition(null);
  }, [board, isEditMode, draggedPiece]);

  const handleDragEnd = useCallback((event: React.DragEvent) => {
    if (!isEditMode || !draggedPiece || !dragStartPosition) return;
    
    // ドラッグがキャンセルされた場合、元の位置に駒を戻す
    if (event.dataTransfer.dropEffect === 'none') {
      const newBoard = board.clone();
      newBoard.set_piece_by_coords(dragStartPosition.row, dragStartPosition.col, draggedPiece, draggedPlayer);
      setBoard(newBoard);
    }
    
    setDraggedPiece(null);
    setDraggedPlayer(null);
    setDragStartPosition(null);
  }, [isEditMode, draggedPiece, draggedPlayer, dragStartPosition, board]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    if (isEditMode) {
      // ドラッグリーブ時に視覚的フィードバックをクリア
      const target = event.target as HTMLElement;
      const squareElement = target.closest('.square');
      if (squareElement) {
        squareElement.classList.remove('drag-over');
      }
    }
  }, [isEditMode]);

  return (
    <ErrorBoundary>
      <div className={`shogi-board ${isEditMode ? 'edit-mode' : ''}`}>
        {/* 局面編集ボタン */}
        <div className="edit-mode-controls">
          <button 
            onClick={handleEditModeToggle}
            className={`edit-mode-button ${isEditMode ? 'active' : ''}`}
          >
            {isEditMode ? '局面編集終了' : '局面編集'}
          </button>
        </div>

        {/* 局面編集モード時のコントロール */}
        {isEditMode && (
          <div className="edit-controls">
            <button onClick={handleResetToInitial} className="edit-control-button">
              平手初期状態にする
            </button>
            <button onClick={handleResetToMatePosition} className="edit-control-button">
              詰め将棋初期状態にする
            </button>
            <button onClick={handleChangeTurn} className="edit-control-button">
              手番変更
            </button>
            <button onClick={handleFlipBoard} className="edit-control-button">
              盤面反転
            </button>
          </div>
        )}

        <div className="board-layout">
          {/* 後手の持ち駒（左側） */}
          {board && (
            <div className={`captured-pieces-${isBoardFlipped ? 'right' : 'left'}`}>
              <CapturedPieces
                board={board}
                onPieceClick={handleCapturedPieceClick}
                selectedPiece={selectedCapturedPiece}
                player={window.wasmModule?.Player?.White}
                playerName="後手（白）"
                isEditMode={isEditMode}
                onDragStart={handlePieceDragStart}
                onDrop={handleCapturedPieceDrop}
                onDragOver={handleSquareDragOver}
              />
            </div>
          )}
          
          {/* 盤面と現在の手番 */}
          <div className="board-center">
            {board && (
              <div className="board">
                {renderBoard(board, selectedPosition, validMoves, handleSquareClick, isDroppingMode, isEditMode, handleSquareDrop, handleSquareDragOver, handlePieceDragStart, handleDragEnd, handleDragLeave)}
              </div>
            )}
            
            <div className="current-player">
              現在の手番: {board?.get_current_player() === (window as any).wasmModule?.Player?.Black ? '先手（黒）' : '後手（白）'}
            </div>
          </div>
          
          {/* 先手の持ち駒（右側） */}
          {board && (
            <div className={`captured-pieces-${isBoardFlipped ? 'left' : 'right'}`}>
              <CapturedPieces
                board={board}
                onPieceClick={handleCapturedPieceClick}
                selectedPiece={selectedCapturedPiece}
                player={window.wasmModule?.Player?.Black}
                playerName="先手（黒）"
                isEditMode={isEditMode}
                onDragStart={handlePieceDragStart}
                onDrop={handleCapturedPieceDrop}
                onDragOver={handleSquareDragOver}
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