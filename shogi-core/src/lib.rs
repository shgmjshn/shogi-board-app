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
            Player::Black => self.row >= 6, // 6,7,8段目
            Player::White => self.row <= 2, // 0,1,2段目
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
    captured_pieces: [[i32; 8]; 2], // [player][piece_type] で持ち駒の数を管理
}

#[wasm_bindgen]
impl Board {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Board {
        let mut board = Board {
            pieces: [[(Piece::Empty, Player::Black); 9]; 9],
            current_player: Player::Black,
            captured_pieces: [[0; 8]; 2],
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
        
        // 移動先に相手の駒がある場合は持ち駒に追加
        if let Some((captured_piece, captured_player)) = self.get_piece_at(to) {
            if captured_player != player {
                // 成り駒は元の駒に戻して持ち駒に追加
                let original_piece = self.get_original_piece(captured_piece);
                self.add_captured_piece(player, original_piece);
            }
        }
        
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
            captured_pieces: self.captured_pieces,
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

    #[wasm_bindgen]
    pub fn get_captured_piece_count(&self, player: Player, piece: Piece) -> i32 {
        let player_index = if player == Player::Black { 0 } else { 1 };
        let piece_index = self.piece_to_index(piece);
        if piece_index >= 0 && piece_index < 8 {
            self.captured_pieces[player_index][piece_index as usize]
        } else {
            0
        }
    }

    #[wasm_bindgen]
    pub fn add_captured_piece(&mut self, player: Player, piece: Piece) {
        let player_index = if player == Player::Black { 0 } else { 1 };
        let piece_index = self.piece_to_index(piece);
        if piece_index >= 0 && piece_index < 8 {
            self.captured_pieces[player_index][piece_index as usize] += 1;
        }
    }

    #[wasm_bindgen]
    pub fn use_captured_piece(&mut self, player: Player, piece: Piece) -> bool {
        let player_index = if player == Player::Black { 0 } else { 1 };
        let piece_index = self.piece_to_index(piece);
        if piece_index >= 0 && piece_index < 8 {
            if self.captured_pieces[player_index][piece_index as usize] > 0 {
                self.captured_pieces[player_index][piece_index as usize] -= 1;
                true
            } else {
                false
            }
        } else {
            false
        }
    }

    #[wasm_bindgen]
    pub fn can_drop_piece(&self, piece: Piece, to_row: i32, to_col: i32) -> bool {
        // 持ち駒があるかチェック
        if self.get_captured_piece_count(self.current_player, piece) <= 0 {
            return false;
        }

        // 盤面内かチェック
        if to_row < 0 || to_row >= 9 || to_col < 0 || to_col >= 9 {
            return false;
        }

        // 空のマスかチェック
        let to_pos = Position::new(to_row, to_col);
        if let Some(_) = self.get_piece_at(to_pos) {
            return false;
        }

        // 歩・香車の特殊ルール
        match piece {
            Piece::Pawn => {
                // 二歩の禁止
                if self.has_pawn_in_column_except(to_col, self.current_player, -1) {
                    return false;
                }
            }
            Piece::Lance => {
                // 香車は最下段（先手）または最上段（後手）には打てない
                let forbidden_row = if self.current_player == Player::Black { 8 } else { 0 };
                if to_row == forbidden_row {
                    return false;
                }
            }
            Piece::Knight => {
                // 桂馬は最下段・下から2段目（先手）または最上段・上から2段目（後手）には打てない
                let forbidden_rows = if self.current_player == Player::Black { [7, 8] } else { [0, 1] };
                if forbidden_rows.contains(&to_row) {
                    return false;
                }
            }
            _ => {}
        }

        true
    }

    #[wasm_bindgen]
    pub fn drop_piece(&mut self, piece: Piece, to_row: i32, to_col: i32) -> bool {
        if !self.can_drop_piece(piece, to_row, to_col) {
            return false;
        }

        if self.use_captured_piece(self.current_player, piece) {
            self.pieces[to_row as usize][to_col as usize] = (piece, self.current_player);
            self.current_player = if self.current_player == Player::Black {
                Player::White
            } else {
                Player::Black
            };
            true
        } else {
            false
        }
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
        
        match piece {
            Piece::Pawn => {
                // 歩: 前方1マスのみ
                let dir = if player == Player::Black { 1 } else { -1 };
                let new_row = from.row + dir;
                let new_col = from.column;
                
                if new_row >= 0 && new_row < 9 && new_col >= 0 && new_col < 9 {
                    let new_pos = Position::new(new_row, new_col);
                    if self.is_empty_or_opponent(new_pos, player) {
                        // 二歩の禁止チェック
                        if !self.has_pawn_in_column_except(new_col, player, from.row) {
                            moves.push(new_pos);
                        }
                    }
                }
            }
            
            Piece::Lance => {
                // 香車: 前方一直線
                let dir = if player == Player::Black { 1 } else { -1 };
                let mut current_row = from.row + dir;
                
                while current_row >= 0 && current_row < 9 {
                    let new_pos = Position::new(current_row, from.column);
                    if let Some((_, piece_player)) = self.get_piece_at(new_pos) {
                        if piece_player != player {
                            moves.push(new_pos);
                        }
                        break; // 他の駒にぶつかったら停止
                    }
                    moves.push(new_pos);
                    current_row += dir;
                }
            }
            
            Piece::Knight => {
                // 桂馬: 特殊な動き（前方2マス+左右1マス）
                let dir = if player == Player::Black { 2 } else { -2 };
                let new_row = from.row + dir;
                
                if new_row >= 0 && new_row < 9 {
                    // 左桂馬
                    let left_col = from.column - 1;
                    if left_col >= 0 {
                        let new_pos = Position::new(new_row, left_col);
                        if self.is_empty_or_opponent(new_pos, player) {
                            moves.push(new_pos);
                        }
                    }
                    
                    // 右桂馬
                    let right_col = from.column + 1;
                    if right_col < 9 {
                        let new_pos = Position::new(new_row, right_col);
                        if self.is_empty_or_opponent(new_pos, player) {
                            moves.push(new_pos);
                        }
                    }
                }
            }
            
            Piece::Silver => {
                // 銀: 前方3方向+後方2方向
                let dir = if player == Player::Black { 1 } else { -1 };
                let directions = vec![
                    (dir, -1),   // 前方左斜め
                    (dir, 0),    // 前方
                    (dir, 1),    // 前方右斜め
                    (-dir, -1),  // 後方左斜め
                    (-dir, 1),   // 後方右斜め
                ];
                
                for (dr, dc) in directions {
                    let new_row = from.row + dr;
                    let new_col = from.column + dc;
                    
                    if new_row >= 0 && new_row < 9 && new_col >= 0 && new_col < 9 {
                        let new_pos = Position::new(new_row, new_col);
                        if self.is_empty_or_opponent(new_pos, player) {
                            moves.push(new_pos);
                        }
                    }
                }
            }
            
            Piece::Gold | Piece::PromotedPawn | Piece::PromotedLance | 
            Piece::PromotedKnight | Piece::PromotedSilver => {
                // 金・成り駒: 前方3方向+横2方向+後方1方向
                let dir = if player == Player::Black { 1 } else { -1 };
                let directions = vec![
                    (dir, -1),   // 前方左斜め
                    (dir, 0),    // 前方
                    (dir, 1),    // 前方右斜め
                    (0, -1),     // 左
                    (0, 1),      // 右
                    (-dir, 0),   // 後方
                ];
                
                for (dr, dc) in directions {
                    let new_row = from.row + dr;
                    let new_col = from.column + dc;
                    
                    if new_row >= 0 && new_row < 9 && new_col >= 0 && new_col < 9 {
                        let new_pos = Position::new(new_row, new_col);
                        if self.is_empty_or_opponent(new_pos, player) {
                            moves.push(new_pos);
                        }
                    }
                }
            }
            
            Piece::Bishop => {
                // 角行: 斜め4方向の一直線
                let directions = vec![(-1, -1), (-1, 1), (1, -1), (1, 1)];
                self.add_sliding_moves(from, directions, player, &mut moves);
            }
            
            Piece::PromotedBishop => {
                // 馬: 角行の動き+縦横1マス
                let directions = vec![(-1, -1), (-1, 1), (1, -1), (1, 1)];
                self.add_sliding_moves(from, directions, player, &mut moves);
                
                // 縦横1マス
                let orthogonal_directions = vec![(-1, 0), (1, 0), (0, -1), (0, 1)];
                for (dr, dc) in orthogonal_directions {
                    let new_row = from.row + dr;
                    let new_col = from.column + dc;
                    
                    if new_row >= 0 && new_row < 9 && new_col >= 0 && new_col < 9 {
                        let new_pos = Position::new(new_row, new_col);
                        if self.is_empty_or_opponent(new_pos, player) {
                            moves.push(new_pos);
                        }
                    }
                }
            }
            
            Piece::Rook => {
                // 飛車: 縦横4方向の一直線
                let directions = vec![(-1, 0), (1, 0), (0, -1), (0, 1)];
                self.add_sliding_moves(from, directions, player, &mut moves);
            }
            
            Piece::PromotedRook => {
                // 龍: 飛車の動き+斜め1マス
                let directions = vec![(-1, 0), (1, 0), (0, -1), (0, 1)];
                self.add_sliding_moves(from, directions, player, &mut moves);
                
                // 斜め1マス
                let diagonal_directions = vec![(-1, -1), (-1, 1), (1, -1), (1, 1)];
                for (dr, dc) in diagonal_directions {
                    let new_row = from.row + dr;
                    let new_col = from.column + dc;
                    
                    if new_row >= 0 && new_row < 9 && new_col >= 0 && new_col < 9 {
                        let new_pos = Position::new(new_row, new_col);
                        if self.is_empty_or_opponent(new_pos, player) {
                            moves.push(new_pos);
                        }
                    }
                }
            }
            
            Piece::King => {
                // 玉: 全方向1マス
                let directions = vec![
                    (-1, -1), (-1, 0), (-1, 1),
                    (0, -1), (0, 1),
                    (1, -1), (1, 0), (1, 1),
                ];
                
                for (dr, dc) in directions {
                    let new_row = from.row + dr;
                    let new_col = from.column + dc;
                    
                    if new_row >= 0 && new_row < 9 && new_col >= 0 && new_col < 9 {
                        let new_pos = Position::new(new_row, new_col);
                        if self.is_empty_or_opponent(new_pos, player) {
                            moves.push(new_pos);
                        }
                    }
                }
            }
            
            Piece::Empty => {}
        }

        // 成り判定（成り駒でない場合のみ）
        if !self.is_promoted_piece(piece) && self.can_promote_piece(piece) {
            // 歩の場合は成り判定エリア内でも成り駒の動きを追加しない
            // （成ることを明示的に選択した場合のみ成り駒になる）
            if piece != Piece::Pawn && from.is_promotion_zone(player) {
                if let Some(promoted_piece) = self.get_promoted_piece(piece) {
                    // 成り駒の動きも追加
                    let promoted_moves = self.get_piece_moves(from, promoted_piece, player);
                    moves.extend(promoted_moves);
                }
            }
        }

        moves
    }

    // 一直線に動ける駒（香車、飛車、角行）の移動可能位置を計算
    fn add_sliding_moves(&self, from: Position, directions: Vec<(i32, i32)>, player: Player, moves: &mut Vec<Position>) {
        for (dr, dc) in directions {
            let mut current_row = from.row + dr;
            let mut current_col = from.column + dc;
            
            while current_row >= 0 && current_row < 9 && current_col >= 0 && current_col < 9 {
                let new_pos = Position::new(current_row, current_col);
                if let Some((_, piece_player)) = self.get_piece_at(new_pos) {
                    if piece_player != player {
                        moves.push(new_pos);
                    }
                    break; // 他の駒にぶつかったら停止
                }
                moves.push(new_pos);
                current_row += dr;
                current_col += dc;
            }
        }
    }

    // 二歩の禁止チェック（移動元の歩を除外）
    fn has_pawn_in_column_except(&self, col: i32, player: Player, except_row: i32) -> bool {
        for row in 0..9 {
            if row == except_row {
                continue; // 移動元の位置は除外
            }
            let pos = Position::new(row, col);
            if let Some((piece, piece_player)) = self.get_piece_at(pos) {
                if piece == Piece::Pawn && piece_player == player {
                    return true;
                }
            }
        }
        false
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

    fn piece_to_index(&self, piece: Piece) -> i32 {
        match piece {
            Piece::Pawn => 0,
            Piece::Lance => 1,
            Piece::Knight => 2,
            Piece::Silver => 3,
            Piece::Gold => 4,
            Piece::Bishop => 5,
            Piece::Rook => 6,
            Piece::King => 7,
            _ => -1, // 成り駒や空の駒は持ち駒にならない
        }
    }

    fn get_original_piece(&self, piece: Piece) -> Piece {
        match piece {
            Piece::PromotedPawn => Piece::Pawn,
            Piece::PromotedLance => Piece::Lance,
            Piece::PromotedKnight => Piece::Knight,
            Piece::PromotedSilver => Piece::Silver,
            Piece::PromotedBishop => Piece::Bishop,
            Piece::PromotedRook => Piece::Rook,
            _ => piece, // 成り駒でない場合はそのまま
        }
    }
}

#[wasm_bindgen]
pub fn hello_shogi() -> String {
    "こんにちは将棋！".to_string()
}