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
  pieceState?: number; // 駒の状態 (0: 通常, 1: 成り, 2: 反転, 3: 成り+反転)
  isBoardFlipped?: boolean; // 盤面反転フラグ
  onDrop?: (row: number, col: number, event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDragStart?: (piece: any, player: any, event: React.DragEvent) => void;
  onDragEnd?: (event: React.DragEvent) => void;
  onDragLeave?: (event: React.DragEvent) => void;
}

const Square: React.FC<SquareProps> = ({ row, col, piece, player, isSelected, isValidMove, onClick, isDroppingMode, isEditMode, pieceState = 0, isBoardFlipped = false, onDrop, onDragOver, onDragStart, onDragEnd, onDragLeave }) => {
  const wasm = (window as any).wasmModule;
  
  // 駒の状態に応じて表示を変更
  let displayPiece = piece;
  let displayPlayer = player;
  
  if (wasm) {
    // 状態2または3の場合（反転状態）
    if (pieceState === 2 || pieceState === 3) {
      displayPlayer = player === wasm.Player.Black ? wasm.Player.White : wasm.Player.Black;
    }
    
    // 盤面反転時の駒の方向調整
    if (isBoardFlipped) {
      displayPlayer = player === wasm.Player.Black ? wasm.Player.White : wasm.Player.Black;
    }
    
    // 状態1または3の場合（成り状態）
    if (pieceState === 1 || pieceState === 3) {
      // 成り駒に変換
      if (piece === wasm.Piece.Pawn) displayPiece = wasm.Piece.PromotedPawn;
      else if (piece === wasm.Piece.Lance) displayPiece = wasm.Piece.PromotedLance;
      else if (piece === wasm.Piece.Knight) displayPiece = wasm.Piece.PromotedKnight;
      else if (piece === wasm.Piece.Silver) displayPiece = wasm.Piece.PromotedSilver;
      else if (piece === wasm.Piece.Bishop) displayPiece = wasm.Piece.PromotedBishop;
      else if (piece === wasm.Piece.Rook) displayPiece = wasm.Piece.PromotedRook;
      // 王・玉、金、成り駒はそのまま
    }
  }
  

  
  const getPieceText = (piece: any, player: any) => {
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
      [wasm.Piece.King]: displayPlayer === wasm.Player.Black ? '玉' : '王',
      [wasm.Piece.PromotedPawn]: 'と',
      [wasm.Piece.PromotedLance]: '成香',
      [wasm.Piece.PromotedKnight]: '成桂',
      [wasm.Piece.PromotedSilver]: '成銀',
      [wasm.Piece.PromotedBishop]: '馬',
      [wasm.Piece.PromotedRook]: '龍',
    };
    return pieceMap[displayPiece] || '';
  };

  const className = `square ${isSelected ? 'selected' : ''} ${isValidMove ? 'valid-move' : ''} ${
    displayPlayer === (window as any).wasmModule?.Player?.White ? 'white' : ''
  } ${isDroppingMode ? 'dropping-mode' : ''}`;
  
  console.log(`className計算: 位置(${row}, ${col}), displayPlayer: ${displayPlayer}, className: ${className}`);

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
  getPieceState?: (row: number, col: number) => number,
  isBoardFlipped: boolean = false,
  onDrop?: (row: number, col: number, event: React.DragEvent) => void,
  onDragOver?: (event: React.DragEvent) => void,
  onDragStart?: (piece: any, player: any, event: React.DragEvent) => void,
  onDragEnd?: (event: React.DragEvent) => void,
  onDragLeave?: (event: React.DragEvent) => void
) => {
  const squares = [];
  
  // 盤面反転に応じて表示順序を変更
  const rowOrder = isBoardFlipped ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1, 0];
  const colOrder = isBoardFlipped ? [8, 7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
  
  // 漢数字の配列（上が一、下が九）
  const kanjiNumbers = ['九', '八', '七', '六', '五', '四', '三', '二', '一'];
  
  for (const row of rowOrder) {
    for (const col of colOrder) {
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
            pieceState={getPieceState ? getPieceState(row, col) : 0}
            isBoardFlipped={isBoardFlipped}
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
            isBoardFlipped={isBoardFlipped}
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
  
  // 座標表示を含む盤面を構築
  const boardWithCoordinates = [];
  
  // 上部の算用数字（1-9）
  const topCoordinates = [];
  for (const col of colOrder) {
    topCoordinates.push(
      <div key={`top-${col}`} className="coordinate-top">
        {9 - col}
      </div>
    );
  }
  boardWithCoordinates.push(
    <div key="top-row" className="coordinate-row">
      {topCoordinates}
    </div>
  );
  
  // 盤面の行（マス目 + 右側に漢数字）
  for (let i = 0; i < rowOrder.length; i++) {
    const row = rowOrder[i];
    const rowSquares = [];
    
    // その行のマス目
    for (const col of colOrder) {
      const squareIndex = i * 9 + colOrder.indexOf(col);
      if (squares[squareIndex]) {
        rowSquares.push(squares[squareIndex]);
      }
    }
    
    // 右側の漢数字
    rowSquares.push(
      <div key={`right-${row}`} className="coordinate-right">
        {kanjiNumbers[row]}
      </div>
    );
    
    boardWithCoordinates.push(
      <div key={`row-${row}`} className="board-row">
        {rowSquares}
      </div>
    );
  }
  
  return boardWithCoordinates;
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
  const [pieceStates, setPieceStates] = useState<Record<string, number>>({});
  const [moveHistory, setMoveHistory] = useState<Array<{
    moveNumber: number;
    notation: string;
    boardState: any;
    currentPlayer: any;
    fromRow?: number;
    fromCol?: number;
    toRow?: number;
    toCol?: number;
  }>>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isScrollLocked, setIsScrollLocked] = useState(false); // 駒の状態管理 (0: 通常, 1: 成り, 2: 反転, 3: 成り+反転)

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
        
        // 指し手を記録（記録関数内で指し手を実行するため、ここでは記録のみ）
        const pieceInfo = board.get_piece_by_coords(selectedRow, selectedCol);
        recordMove(selectedRow, selectedCol, toRow, toCol, pieceInfo.piece, promote || false);
        
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
            
            // 持ち駒ドロップを記録（記録関数内で指し手を実行するため、ここでは記録のみ）
            recordMove(-1, -1, row, col, pieceEnum, false);
            
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
    // 平手初期状態に戻す際に駒の状態をリセット
    setPieceStates({});
  }, [board]);

  const handleResetToMatePosition = useCallback(() => {
    if (!board) return;
    const newBoard = board.clone();
    
    // 盤面をクリア
    newBoard.clear_board();
    
    // 後手玉を初期位置に配置
    newBoard.set_piece_by_coords(8, 4, window.wasmModule.Piece.King, window.wasmModule.Player.White);
    
    // 玉以外の駒の枚数を倍にして、先手と後手の両方に持ち駒を設定
    const pieces = [
      { piece: window.wasmModule.Piece.Pawn, count: 18 }, // 9 * 2
      { piece: window.wasmModule.Piece.Lance, count: 4 }, // 2 * 2
      { piece: window.wasmModule.Piece.Knight, count: 4 }, // 2 * 2
      { piece: window.wasmModule.Piece.Silver, count: 4 }, // 2 * 2
      { piece: window.wasmModule.Piece.Gold, count: 4 }, // 2 * 2
      { piece: window.wasmModule.Piece.Bishop, count: 2 }, // 1 * 2
      { piece: window.wasmModule.Piece.Rook, count: 2 }, // 1 * 2
      { piece: window.wasmModule.Piece.King, count: 1 } // 玉は1枚のみ
    ];
    
    // 後手のみに持ち駒を設定（先手は持ち駒なし）
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
    // 盤面反転は表示のみで行い、実際のデータ構造は変更しない
    setIsBoardFlipped(!isBoardFlipped);
  }, [isBoardFlipped]);

  // 駒の状態を取得する関数
  const getPieceState = useCallback((row: number, col: number): number => {
    const key = `${row}-${col}`;
    return pieceStates[key] || 0;
  }, [pieceStates]);

  // 駒の状態を次の状態に変更する関数
  const cyclePieceState = useCallback((row: number, col: number) => {
    const key = `${row}-${col}`;
    setPieceStates(prev => {
      const currentState = prev[key] || 0;
      const nextState = (currentState + 1) % 4;
      return {
        ...prev,
        [key]: nextState
      };
    });
  }, []);

  const handleEditSquareClick = useCallback((row: number, col: number) => {
    if (!board || !isEditMode) return;
    
    // 駒が存在する場合は状態を変更
    const pieceInfo = board.get_piece_by_coords(row, col);
    if (pieceInfo.piece !== (window as any).wasmModule?.Piece?.Empty) {
      cyclePieceState(row, col);
      return;
    }
    
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
  }, [board, isEditMode, selectedEditPiece, selectedEditPlayer, cyclePieceState]);

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
    
    // 移動先に駒があるかチェック
    const existingPieceInfo = newBoard.get_piece_by_coords(row, col);
    const existingPiece = existingPieceInfo.piece;
    
    // 移動先に駒がある場合、その駒を持ち駒に追加
    if (existingPiece !== (window as any).wasmModule?.Piece?.Empty) {
      // 駒を成り駒から元の駒に戻す
      let pieceToAdd = existingPiece;
      const wasm = (window as any).wasmModule;
      
      // 成り駒の場合は元の駒に戻す
      if (existingPiece === wasm.Piece.PromotedPawn) {
        pieceToAdd = wasm.Piece.Pawn;
      } else if (existingPiece === wasm.Piece.PromotedLance) {
        pieceToAdd = wasm.Piece.Lance;
      } else if (existingPiece === wasm.Piece.PromotedKnight) {
        pieceToAdd = wasm.Piece.Knight;
      } else if (existingPiece === wasm.Piece.PromotedSilver) {
        pieceToAdd = wasm.Piece.Silver;
      } else if (existingPiece === wasm.Piece.PromotedBishop) {
        pieceToAdd = wasm.Piece.Bishop;
      } else if (existingPiece === wasm.Piece.PromotedRook) {
        pieceToAdd = wasm.Piece.Rook;
      }
      
      // 取った駒を相手の持ち駒に追加
      newBoard.add_captured_piece(draggedPlayer, pieceToAdd);
    }
    
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

  // 同じ駒が複数ある場合の区別表記を生成する関数
  const generateDisambiguation = useCallback((fromRow: number, fromCol: number, toRow: number, toCol: number, piece: any, player: any) => {
    if (!board) return '';
    
    // 同じ種類の駒を探す
    const samePieces: Array<{row: number, col: number}> = [];
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        try {
          const pieceInfo = board.get_piece_by_coords(row, col);
          if (pieceInfo.piece === piece && pieceInfo.player === player) {
            samePieces.push({row, col});
          }
        } catch (err) {
          // エラーは無視
        }
      }
    }
    
    // 同じ駒が1つしかない場合は区別不要
    if (samePieces.length <= 1) return '';
    
    // 移動先に到達可能な駒をフィルタリング
    const reachablePieces = samePieces.filter(({row, col}) => {
      try {
        const moves = board.get_valid_moves_by_coords(row, col);
        return moves.some((move: any) => {
          try {
            return move.get_row() === toRow && move.get_column() === toCol;
          } catch (err) {
            return false;
          }
        });
      } catch (err) {
        return false;
      }
    });
    
    // 到達可能な駒が1つしかない場合は区別不要
    if (reachablePieces.length <= 1) return '';
    
    // 移動元の駒の位置を基準に区別表記を決定
    const fromPiece = reachablePieces.find(({row, col}) => row === fromRow && col === fromCol);
    if (!fromPiece) return '';
    
    // 他の到達可能な駒との位置関係を比較
    const otherPieces = reachablePieces.filter(({row, col}) => !(row === fromRow && col === fromCol));
    
    for (const other of otherPieces) {
      // 同じ列にある場合（上下の区別）
      if (fromPiece.col === other.col) {
        if (isBoardFlipped) {
          // 後手視点では上下が逆になる
          if (fromPiece.row < other.row) {
            return '引'; // 上側の駒（後手視点では下）
          } else {
            return '上'; // 下側の駒（後手視点では上）
          }
        } else {
          // 先手視点（実際の駒の位置を基準）
          if (fromPiece.row < other.row) {
            return '上'; // 上側の駒
          } else {
            return '引'; // 下側の駒
          }
        }
      }
      
      // 同じ行にある場合（左右の区別）
      if (fromPiece.row === other.row) {
        if (isBoardFlipped) {
          // 後手視点では左右が逆になる
          if (fromPiece.col < other.col) {
            return '右'; // 左側の駒（後手視点では右）
          } else {
            return '左'; // 右側の駒（後手視点では左）
          }
        } else {
          // 先手視点（実際の駒の位置を基準）
          if (fromPiece.col < other.col) {
            return '左'; // 左側の駒
          } else {
            return '右'; // 右側の駒
          }
        }
      }
    }
    
    return '';
  }, [board, isBoardFlipped]);

  // 指し手の符号を生成する関数
  const generateMoveNotation = useCallback((fromRow: number, fromCol: number, toRow: number, toCol: number, piece: any, isPromoted: boolean = false) => {
    const pieceNames: Record<number, string> = {
      [window.wasmModule.Piece.Pawn]: '歩',
      [window.wasmModule.Piece.Lance]: '香',
      [window.wasmModule.Piece.Knight]: '桂',
      [window.wasmModule.Piece.Silver]: '銀',
      [window.wasmModule.Piece.Gold]: '金',
      [window.wasmModule.Piece.Bishop]: '角',
      [window.wasmModule.Piece.Rook]: '飛',
      [window.wasmModule.Piece.King]: '玉',
      [window.wasmModule.Piece.PromotedPawn]: 'と',
      [window.wasmModule.Piece.PromotedLance]: '成香',
      [window.wasmModule.Piece.PromotedKnight]: '成桂',
      [window.wasmModule.Piece.PromotedSilver]: '成銀',
      [window.wasmModule.Piece.PromotedBishop]: '馬',
      [window.wasmModule.Piece.PromotedRook]: '龍',
    };

    const pieceName = pieceNames[piece] || '駒';
    
    // 手番の記号を取得（先手が▲、後手が△）
    const currentPlayer = board?.get_current_player();
    const playerSymbol = currentPlayer === window.wasmModule.Player.Black ? '▲' : '△';
    
    // 漢数字の配列（上が一、下が九）
    const kanjiNumbers = ['九', '八', '七', '六', '五', '四', '三', '二', '一'];
    
    // 直前の指し手と同じ座標かチェック
    const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;
    let isSamePosition = false;
    
    if (lastMove && lastMove.toRow !== undefined && lastMove.toCol !== undefined) {
      isSamePosition = lastMove.toRow === toRow && lastMove.toCol === toCol;
    }
    
    // 持ち駒ドロップの場合
    if (fromRow === -1 && fromCol === -1) {
      const column = 9 - toCol; // 算用数字側（右から1,2,3...）
      const row = kanjiNumbers[toRow]; // 漢数字側（上が一、下が九）
      const position = isSamePosition ? '同' : `${column}${row}`;
      return `${playerSymbol}${position}${pieceName}打`;
    }
    
    // 通常の移動の場合
    const column = 9 - toCol; // 算用数字側（右から1,2,3...）
    const row = kanjiNumbers[toRow]; // 漢数字側（上が一、下が九）
    const position = isSamePosition ? '同' : `${column}${row}`;
    
    // 同じ駒の区別表記を取得
    const disambiguation = generateDisambiguation(fromRow, fromCol, toRow, toCol, piece, currentPlayer);
    
    const promotion = isPromoted ? '成' : '';
    
    return `${playerSymbol}${position}${pieceName}${disambiguation}${promotion}`;
  }, [board, moveHistory, generateDisambiguation, isBoardFlipped]);

  // 指し手を記録する関数
  const recordMove = useCallback((fromRow: number, fromCol: number, toRow: number, toCol: number, piece: any, isPromoted: boolean = false) => {
    if (!board) return;

    const notation = generateMoveNotation(fromRow, fromCol, toRow, toCol, piece, isPromoted);
    const moveNumber = Math.floor(moveHistory.length / 2) + 1;
    
    // 指し手を実行した後の盤面状態を保存するため、新しい盤面を作成
    const newBoard = board.clone();
    
    // 持ち駒ドロップの場合
    if (fromRow === -1 && fromCol === -1) {
      newBoard.drop_piece(piece, toRow, toCol);
    } else {
      // 通常の移動の場合
      newBoard.make_move_by_coords_with_promotion(fromRow, fromCol, toRow, toCol, isPromoted);
    }
    
    const newMove = {
      moveNumber,
      notation,
      boardState: newBoard,
      currentPlayer: newBoard.get_current_player(),
      fromRow,
      fromCol,
      toRow,
      toCol
    };

    // 現在の指し手インデックス以降の履歴を削除（新しい指し手を追加する場合）
    const updatedHistory = moveHistory.slice(0, currentMoveIndex + 1);
    updatedHistory.push(newMove);
    
    setMoveHistory(updatedHistory);
    setCurrentMoveIndex(updatedHistory.length - 1);
  }, [board, moveHistory, currentMoveIndex, generateMoveNotation]);

  // 指し手の履歴から盤面を復元する関数
  const restoreBoardFromHistory = useCallback((index: number) => {
    if (index < 0 || index >= moveHistory.length) return;
    
    const historyEntry = moveHistory[index];
    const restoredBoard = historyEntry.boardState.clone();
    
    setBoard(restoredBoard);
    setCurrentMoveIndex(index);
    setSelectedPosition(null);
    setValidMoves([]);
    setSelectedCapturedPiece(null);
    setSelectedCapturedPiecePlayer(null);
    setIsDroppingMode(false);
  }, [moveHistory]);

  // 初期状態に戻す関数
  const restoreToInitial = useCallback(() => {
    if (!board) return;
    
    const newBoard = board.clone();
    newBoard.reset_to_initial_position();
    setBoard(newBoard);
    setCurrentMoveIndex(-1);
    setSelectedPosition(null);
    setValidMoves([]);
    setSelectedCapturedPiece(null);
    setSelectedCapturedPiecePlayer(null);
    setIsDroppingMode(false);
  }, [board]);

  // スクロール制御を切り替える関数
  const toggleScrollLock = useCallback(() => {
    setIsScrollLocked(prev => !prev);
  }, []);

  // スクロール制御の効果
  useEffect(() => {
    if (isScrollLocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    // クリーンアップ関数
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isScrollLocked]);

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
                {renderBoard(board, selectedPosition, validMoves, handleSquareClick, isDroppingMode, isEditMode, getPieceState, isBoardFlipped, handleSquareDrop, handleSquareDragOver, handlePieceDragStart, handleDragEnd, handleDragLeave)}
              </div>
            )}
            
            <div className="current-player">
              現在の手番: {isBoardFlipped 
                ? (board?.get_current_player() === (window as any).wasmModule?.Player?.Black ? '先手（黒）' : '後手（白）')
                : (board?.get_current_player() === (window as any).wasmModule?.Player?.Black ? '先手（黒）' : '後手（白）')
              }
            </div>
            
            {/* 指し手ログ */}
            <div 
              className="move-log"
              onClick={toggleScrollLock}
              onWheel={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const delta = e.deltaY > 0 ? 1 : -1;
                const newIndex = Math.max(-1, Math.min(moveHistory.length - 1, currentMoveIndex + delta));
                if (newIndex !== currentMoveIndex) {
                  if (newIndex === -1) {
                    restoreToInitial();
                  } else {
                    restoreBoardFromHistory(newIndex);
                  }
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.overflow = 'hidden';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.overflow = 'visible';
              }}
            >
              <div className="move-log-display">
                {currentMoveIndex === -1 ? '初期状態' : moveHistory[currentMoveIndex]?.notation || '初期状態'}
              </div>
              <div className="move-log-hint">
                ホバーしてホイールで指し手を切り替え
              </div>
              <div className="move-log-scroll-status">
                {isScrollLocked ? 'スクロール停止中' : 'スクロール可能'}
              </div>
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