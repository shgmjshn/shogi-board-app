use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Copy, PartialEq)]
pub enum Piece {
    Empty,
    Pawn,    // 歩
    Lance,   // 香
    Knight,  // 桂
    Silver,  // 銀
    Gold,    // 金
    Bishop,  // 角
    Rook,    // 飛
    King,    // 玉
    PromotedPawn,    // と
    PromotedLance,   // 成香
    PromotedKnight,  // 成桂
    PromotedSilver,  // 成銀
    PromotedBishop,  // 馬
    PromotedRook,    // 龍
}

#[wasm_bindgen]
#[derive(Clone, Copy, PartialEq)]
pub enum Player {
    Black, // 先手
    White, // 後手
}

#[wasm_bindgen]
#[derive(Clone, Copy, PartialEq)]
pub struct Position {
    pub row: i32,    // 1-9
    pub column: i32, // 1-9
}

#[wasm_bindgen]
impl Position {
    #[wasm_bindgen(constructor)]
    pub fn new(row: i32, column: i32) -> Position {
        // 入力値の検証
        if row < 0 || row >= 9 || column < 0 || column >= 9 {
            // エラーログを出力
            web_sys::console::error_1(&format!("Position: 無効な座標 ({}, {})", row, column).into());
            // デフォルト値として(0, 0)を返す
            Position { row: 0, column: 0 }
        } else {
            Position { row, column }
        }
    }

    fn is_valid(&self) -> bool {
        self.row >= 0 && self.row < 9 && self.column >= 0 && self.column < 9
    }

    fn is_promotion_zone(&self, player: Player) -> bool {
        match player {
            Player::Black => self.row <= 2,
            Player::White => self.row >= 6,
        }
    }

    // デバッグ用のメソッド
    #[wasm_bindgen]
    pub fn debug_info(&self) -> String {
        format!("Position({}, {})", self.row, self.column)
    }

    // 座標を取得するメソッド（より安全）
    #[wasm_bindgen]
    pub fn get_row(&self) -> i32 {
        self.row
    }

    #[wasm_bindgen]
    pub fn get_column(&self) -> i32 {
        self.column
    }
}

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub struct PieceInfo {
    pub piece: Piece,
    pub player: Player,
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct Board {
    pieces: [[(Piece, Player); 9]; 9],
    current_player: Player,
}

#[wasm_bindgen]
impl Board {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Board {
        let mut board = Board {
            pieces: [[(Piece::Empty, Player::Black); 9]; 9],
            current_player: Player::Black,
        };
        board.initialize();
        board
    }

    #[wasm_bindgen]
    pub fn get_piece(&self, position: Position) -> PieceInfo {
        match self.get_piece_at(position) {
            Some((piece, player)) => PieceInfo { piece, player },
            None => PieceInfo { piece: Piece::Empty, player: Player::Black },
        }
    }

    #[wasm_bindgen]
    pub fn is_valid_move(&self, from: Position, to: Position) -> bool {
        // 1. 移動元に駒があるか
        let (piece, player) = match self.get_piece_at(from) {
            Some(p) => p,
            None => return false,
        };

        // 2. その駒が現在のプレイヤーのものか
        if player != self.current_player {
            return false;
        }

        // 3. 移動先が盤面内か
        if !self.is_valid_position(to) {
            return false;
        }

        // 4. 移動先に味方の駒がないか
        if !self.is_empty_or_opponent(to, player) {
            return false;
        }

        // 5. その駒の動きとして合法か
        let valid_moves = self.get_piece_moves(from, piece, player);
        valid_moves.contains(&to)
    }

    #[wasm_bindgen]
    pub fn make_move(&mut self, from: Position, to: Position) -> bool {
        if !self.is_valid_move(from, to) {
            return false;
        }

        let (piece, player) = self.pieces[from.row as usize][from.column as usize];
        
        // 自動成りを無効化 - 駒をそのまま移動
        self.pieces[to.row as usize][to.column as usize] = (piece, player);
        self.pieces[from.row as usize][from.column as usize] = (Piece::Empty, Player::Black);
        self.current_player = if self.current_player == Player::Black {
            Player::White
        } else {
            Player::Black
        };
        true
    }

    #[wasm_bindgen]
    pub fn make_move_with_promotion(&mut self, from: Position, to: Position, promote: bool) -> bool {
        if !self.is_valid_move(from, to) {
            return false;
        }

        let (piece, player) = self.pieces[from.row as usize][from.column as usize];
        
        // 成り判定を手動で行う
        let final_piece = if promote && to.is_promotion_zone(player) {
            self.get_promoted_piece(piece).unwrap_or(piece)
        } else {
            piece
        };

        self.pieces[to.row as usize][to.column as usize] = (final_piece, player);
        self.pieces[from.row as usize][from.column as usize] = (Piece::Empty, Player::Black);
        self.current_player = if self.current_player == Player::Black {
            Player::White
        } else {
            Player::Black
        };
        true
    }

    #[wasm_bindgen]
    pub fn get_current_player(&self) -> Player {
        self.current_player
    }

    #[wasm_bindgen]
    pub fn get_valid_moves(&self, from: Position) -> Vec<Position> {
        let (piece, player) = match self.get_piece_at(from) {
            Some(p) => p,
            None => return Vec::new(),
        };

        if player != self.current_player {
            return Vec::new();
        }

        self.get_piece_moves(from, piece, player)
            .into_iter()
            .filter(|&to| self.is_empty_or_opponent(to, player))
            .collect()
    }

    #[wasm_bindgen]
    pub fn get_valid_moves_by_coords(&self, from_row: i32, from_col: i32) -> Vec<Position> {
        let from = Position::new(from_row, from_col);
        let (piece, player) = match self.get_piece_at(from) {
            Some(p) => p,
            None => return Vec::new(),
        };

        if player != self.current_player {
            return Vec::new();
        }

        self.get_piece_moves(from, piece, player)
            .into_iter()
            .filter(|&to| self.is_empty_or_opponent(to, player))
            .collect()
    }

    #[wasm_bindgen]
    pub fn get_piece_by_coords(&self, row: i32, col: i32) -> PieceInfo {
        let position = Position::new(row, col);
        self.get_piece(position)
    }

    #[wasm_bindgen]
    pub fn make_move_by_coords(&mut self, from_row: i32, from_col: i32, to_row: i32, to_col: i32) -> bool {
        let from = Position::new(from_row, from_col);
        let to = Position::new(to_row, to_col);
        self.make_move(from, to)
    }

    #[wasm_bindgen]
    pub fn make_move_by_coords_with_promotion(&mut self, from_row: i32, from_col: i32, to_row: i32, to_col: i32, promote: bool) -> bool {
        let from = Position::new(from_row, from_col);
        let to = Position::new(to_row, to_col);
        self.make_move_with_promotion(from, to, promote)
    }

    #[wasm_bindgen]
    pub fn can_promote(&self, from_row: i32, from_col: i32, to_row: i32, to_col: i32) -> bool {
        let from = Position::new(from_row, from_col);
        let to = Position::new(to_row, to_col);
        
        // 移動元の駒を取得
        let (piece, player) = match self.get_piece_at(from) {
            Some(p) => p,
            None => return false,
        };
        
        // 成り駒は既に成っているので成れない
        if self.is_promoted_piece(piece) {
            return false;
        }
        
        // 歩、香車、桂馬、銀、角、飛車のみ成れる
        if !self.can_promote_piece(piece) {
            return false;
        }
        
        match player {
            Player::Black => from.row >= 6 || to.row >= 6,
            Player::White => from.row <= 2 || to.row <= 2,
        }
    }

    #[wasm_bindgen]
    pub fn clone(&self) -> Board {
        Board {
            pieces: self.pieces,
            current_player: self.current_player,
        }
    }

    #[wasm_bindgen]
    pub fn set_piece(&mut self, position: Position, piece: Piece, player: Player) -> bool {
        if !position.is_valid() {
            return false;
        }
        self.pieces[position.row as usize][position.column as usize] = (piece, player);
        true
    }
}

// 内部実装用のメソッドは#[wasm_bindgen]を付けない
impl Board {
    fn initialize(&mut self) {
        // 初期配置を設定
        // 先手（下側）の配置
        self.pieces[0] = [
            (Piece::Lance, Player::Black),
            (Piece::Knight, Player::Black),
            (Piece::Silver, Player::Black),
            (Piece::Gold, Player::Black),
            (Piece::King, Player::Black),
            (Piece::Gold, Player::Black),
            (Piece::Silver, Player::Black),
            (Piece::Knight, Player::Black),
            (Piece::Lance, Player::Black),
        ];
        self.pieces[1][1] = (Piece::Bishop, Player::Black);
        self.pieces[1][7] = (Piece::Rook, Player::Black);
        for i in 0..9 {
            self.pieces[2][i] = (Piece::Pawn, Player::Black);
        }

        // 後手（上側）の配置
        self.pieces[8] = [
            (Piece::Lance, Player::White),
            (Piece::Knight, Player::White),
            (Piece::Silver, Player::White),
            (Piece::Gold, Player::White),
            (Piece::King, Player::White),
            (Piece::Gold, Player::White),
            (Piece::Silver, Player::White),
            (Piece::Knight, Player::White),
            (Piece::Lance, Player::White),
        ];
        self.pieces[7][1] = (Piece::Rook, Player::White);
        self.pieces[7][7] = (Piece::Bishop, Player::White);
        for i in 0..9 {
            self.pieces[6][i] = (Piece::Pawn, Player::White);
        }
    }

    fn get_piece_at(&self, pos: Position) -> Option<(Piece, Player)> {
        if !pos.is_valid() {
            return None;
        }
        let (piece, player) = self.pieces[pos.row as usize][pos.column as usize];
        if piece == Piece::Empty {
            None
        } else {
            Some((piece, player))
        }
    }

    fn is_valid_position(&self, pos: Position) -> bool {
        pos.is_valid()
    }

    fn is_empty_or_opponent(&self, pos: Position, player: Player) -> bool {
        if let Some((_, piece_player)) = self.get_piece_at(pos) {
            piece_player != player
        } else {
            true
        }
    }

    fn get_piece_moves(&self, from: Position, piece: Piece, player: Player) -> Vec<Position> {
        let mut moves = Vec::new();
        let directions = match piece {
            Piece::Pawn => {
                let dir = if player == Player::Black { -1 } else { 1 };
                vec![(dir, 0)]
            }
            Piece::Lance => {
                let dir = if player == Player::Black { -1 } else { 1 };
                (1..9).map(|i| (dir * i, 0)).collect()
            }
            Piece::Knight => {
                let dir = if player == Player::Black { -2 } else { 2 };
                vec![(dir, -1), (dir, 1)]
            }
            Piece::Silver => {
                let dir = if player == Player::Black { -1 } else { 1 };
                vec![
                    (dir, -1),
                    (dir, 0),
                    (dir, 1),
                    (-dir, -1),
                    (-dir, 1),
                ]
            }
            Piece::Gold | Piece::PromotedPawn | Piece::PromotedLance | 
            Piece::PromotedKnight | Piece::PromotedSilver => {
                let dir = if player == Player::Black { -1 } else { 1 };
                vec![
                    (dir, -1),
                    (dir, 0),
                    (dir, 1),
                    (0, -1),
                    (0, 1),
                    (-dir, 0),
                ]
            }
            Piece::Bishop => {
                vec![
                    (-1, -1), (-1, 1), (1, -1), (1, 1),
                ]
            }
            Piece::PromotedBishop => {
                vec![
                    (-1, -1), (-1, 1), (1, -1), (1, 1),
                    (0, -1), (0, 1), (-1, 0), (1, 0),
                ]
            }
            Piece::Rook => {
                vec![
                    (-1, 0), (1, 0), (0, -1), (0, 1),
                ]
            }
            Piece::PromotedRook => {
                vec![
                    (-1, 0), (1, 0), (0, -1), (0, 1),
                    (-1, -1), (-1, 1), (1, -1), (1, 1),
                ]
            }
            Piece::King => {
                vec![
                    (-1, -1), (-1, 0), (-1, 1),
                    (0, -1), (0, 1),
                    (1, -1), (1, 0), (1, 1),
                ]
            }
            Piece::Empty => vec![],
        };

        for (dr, dc) in directions {
            let mut current = Position {
                row: from.row + dr,
                column: from.column + dc,
            };

            // 香車、飛車、角行は一直線に動ける
            let is_sliding = matches!(piece, Piece::Lance | Piece::Rook | Piece::Bishop | 
                Piece::PromotedRook | Piece::PromotedBishop);
            
            while current.is_valid() {
                if let Some((_, piece_player)) = self.get_piece_at(current) {
                    if piece_player != player {
                        moves.push(current);
                    }
                    break;
                }
                moves.push(current);
                if !is_sliding {
                    break;
                }
                current = Position {
                    row: current.row + dr,
                    column: current.column + dc,
                };
            }
        }

        // 成り判定
        if from.is_promotion_zone(player) || moves.iter().any(|&pos| pos.is_promotion_zone(player)) {
            if let Some(promoted_piece) = self.get_promoted_piece(piece) {
                // 成り駒の動きも追加
                moves.extend(self.get_piece_moves(from, promoted_piece, player));
            }
        }

        moves
    }

    fn get_promoted_piece(&self, piece: Piece) -> Option<Piece> {
        match piece {
            Piece::Pawn => Some(Piece::PromotedPawn),
            Piece::Lance => Some(Piece::PromotedLance),
            Piece::Knight => Some(Piece::PromotedKnight),
            Piece::Silver => Some(Piece::PromotedSilver),
            Piece::Bishop => Some(Piece::PromotedBishop),
            Piece::Rook => Some(Piece::PromotedRook),
            _ => None,
        }
    }

    fn is_promoted_piece(&self, piece: Piece) -> bool {
        matches!(piece, 
            Piece::PromotedPawn | Piece::PromotedLance | Piece::PromotedKnight | 
            Piece::PromotedSilver | Piece::PromotedBishop | Piece::PromotedRook
        )
    }

    fn can_promote_piece(&self, piece: Piece) -> bool {
        matches!(piece, 
            Piece::Pawn | Piece::Lance | Piece::Knight | Piece::Silver | Piece::Bishop | Piece::Rook
        )
    }
}

#[wasm_bindgen]
pub fn hello_shogi() -> String {
    "こんにちは将棋！".to_string()
}