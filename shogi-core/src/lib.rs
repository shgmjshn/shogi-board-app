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
            // デフォルト値として(0, 0)を返す
            Position { row: 0, column: 0 }
        } else {
            Position { row, column }
        }
    }

    fn is_valid(&self) -> bool {
        self.row >= 0 && self.row < 9 && self.column >= 0 && self.column < 9
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
        
        // 移動先に相手の駒がある場合は持ち駒に追加
        if let Some((captured_piece, captured_player)) = self.get_piece_at(to) {
            if captured_player != player {
                // 成り駒は元の駒に戻して持ち駒に追加
                let original_piece = self.get_original_piece(captured_piece);
                self.add_captured_piece(player, original_piece);
            }
        }
        
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
        let final_piece = if promote && self.can_promote(from.row, from.column, to.row, to.column) {
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
        
        // 後ろ方向に動ける駒（銀、角、飛車）の場合は、移動元が敵陣にあるか、移動先が敵陣に入るか、移動先が敵陣から出る場合に成れる
        if self.can_move_backward(piece) {
            match player {
                Player::Black => from.row >= 6 || to.row >= 6 || (from.row >= 6 && to.row < 6), // 移動元が敵陣にあるか、移動先が敵陣に入るか、敵陣から出る
                Player::White => from.row <= 2 || to.row <= 2 || (from.row <= 2 && to.row > 2), // 移動元が敵陣にあるか、移動先が敵陣に入るか、敵陣から出る
            }
        } else {
            // 後ろ方向に動けない駒（歩、香車、桂馬）は従来通り敵陣に入ったタイミングのみ
            match player {
                Player::Black => to.row >= 6, // 移動先が敵陣に入る場合のみ
                Player::White => to.row <= 2, // 移動先が敵陣に入る場合のみ
            }
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
    pub fn set_piece_by_coords(&mut self, row: i32, col: i32, piece: Piece, player: Player) -> bool {
        let position = Position::new(row, col);
        self.set_piece(position, piece, player)
    }

    #[wasm_bindgen]
    pub fn clear_square(&mut self, position: Position) -> bool {
        if !position.is_valid() {
            return false;
        }
        self.pieces[position.row as usize][position.column as usize] = (Piece::Empty, Player::Black);
        true
    }

    #[wasm_bindgen]
    pub fn clear_square_by_coords(&mut self, row: i32, col: i32) -> bool {
        let position = Position::new(row, col);
        self.clear_square(position)
    }

    #[wasm_bindgen]
    pub fn clear_board(&mut self) {
        for row in 0..9 {
            for col in 0..9 {
                self.pieces[row][col] = (Piece::Empty, Player::Black);
            }
        }
    }

    #[wasm_bindgen]
    pub fn set_current_player(&mut self, player: Player) {
        self.current_player = player;
    }

    #[wasm_bindgen]
    pub fn reset_to_initial_position(&mut self) {
        self.clear_board();
        self.current_player = Player::Black;
        self.captured_pieces = [[0; 8]; 2];
        self.initialize();
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
    pub fn set_captured_piece_count(&mut self, player: Player, piece: Piece, count: i32) -> bool {
        let player_index = if player == Player::Black { 0 } else { 1 };
        let piece_index = self.piece_to_index(piece);
        if piece_index >= 0 && piece_index < 8 && count >= 0 {
            self.captured_pieces[player_index][piece_index as usize] = count;
            true
        } else {
            false
        }
    }

    #[wasm_bindgen]
    pub fn clear_captured_pieces(&mut self, player: Player) {
        let player_index = if player == Player::Black { 0 } else { 1 };
        for i in 0..8 {
            self.captured_pieces[player_index][i] = 0;
        }
    }

    #[wasm_bindgen]
    pub fn get_all_captured_pieces(&self) -> Vec<i32> {
        let mut result = Vec::new();
        for player in [Player::Black, Player::White] {
            let player_index = if player == Player::Black { 0 } else { 1 };
            for piece_index in 0..8 {
                result.push(self.captured_pieces[player_index][piece_index]);
            }
        }
        result
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
    pub fn debug_can_drop_piece(&self, piece: Piece, to_row: i32, to_col: i32) -> String {
        let mut reasons = Vec::new();
        
        // 持ち駒があるかチェック
        if self.get_captured_piece_count(self.current_player, piece) <= 0 {
            reasons.push("持ち駒がない".to_string());
        }

        // 盤面内かチェック
        if to_row < 0 || to_row >= 9 || to_col < 0 || to_col >= 9 {
            reasons.push(format!("盤面外: ({}, {})", to_row, to_col));
        }

        // 空のマスかチェック
        let to_pos = Position::new(to_row, to_col);
        if let Some(_) = self.get_piece_at(to_pos) {
            reasons.push("空のマスでない".to_string());
        }

        // 歩・香車の特殊ルール
        match piece {
            Piece::Pawn => {
                // 二歩の禁止
                if self.has_pawn_in_column_except(to_col, self.current_player, -1) {
                    reasons.push("二歩の禁止".to_string());
                }
            }
            Piece::Lance => {
                // 香車は最下段（先手）または最上段（後手）には打てない
                let forbidden_row = if self.current_player == Player::Black { 8 } else { 0 };
                if to_row == forbidden_row {
                    reasons.push("香車の禁止位置".to_string());
                }
            }
            Piece::Knight => {
                // 桂馬は最下段・下から2段目（先手）または最上段・上から2段目（後手）には打てない
                let forbidden_rows = if self.current_player == Player::Black { [7, 8] } else { [0, 1] };
                if forbidden_rows.contains(&to_row) {
                    reasons.push("桂馬の禁止位置".to_string());
                }
            }
            _ => {}
        }

        if reasons.is_empty() {
            "OK".to_string()
        } else {
            format!("ドロップ不可: {}", reasons.join(", "))
        }
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

    #[wasm_bindgen]
    pub fn debug_board_state(&self) -> String {
        let mut result = String::new();
        result.push_str("盤面の状態:\n");
        
        for row in (0..9).rev() {
            result.push_str(&format!("{}段目: ", row));
            for col in 0..9 {
                let pos = Position::new(row, col);
                if let Some((piece, player)) = self.get_piece_at(pos) {
                    let piece_name = match piece {
                        Piece::Empty => "空",
                        Piece::Pawn => "歩",
                        Piece::Lance => "香",
                        Piece::Knight => "桂",
                        Piece::Silver => "銀",
                        Piece::Gold => "金",
                        Piece::Bishop => "角",
                        Piece::Rook => "飛",
                        Piece::King => if player == Player::Black { "玉" } else { "王" },
                        Piece::PromotedPawn => "と",
                        Piece::PromotedLance => "成香",
                        Piece::PromotedKnight => "成桂",
                        Piece::PromotedSilver => "成銀",
                        Piece::PromotedBishop => "馬",
                        Piece::PromotedRook => "龍",
                    };
                    let player_name = if player == Player::Black { "先手" } else { "後手" };
                    result.push_str(&format!("{}{} ", piece_name, player_name));
                } else {
                    result.push_str("空 ");
                }
            }
            result.push('\n');
        }
        
        result.push_str(&format!("現在の手番: {}\n", 
            if self.current_player == Player::Black { "先手" } else { "後手" }));
        
        result
    }

    // 二歩の判定の詳細を表示するデバッグメソッド
    #[wasm_bindgen]
    pub fn debug_has_pawn_in_column(&self, col: i32, player: Player, except_row: i32) -> String {
        let mut result = format!("列{}の歩の確認（除外行: {}）:\n", col, except_row);
        let player_name = if player == Player::Black { "先手" } else { "後手" };
        result.push_str(&format!("{}の歩をチェック中...\n", player_name));
        
        let mut found_pawns = Vec::new();
        
        for row in 0..9 {
            if row == except_row {
                result.push_str(&format!("{}段目: 除外（移動元）\n", row));
                continue;
            }
            
            let pos = Position::new(row, col);
            if let Some((piece, piece_player)) = self.get_piece_at(pos) {
                if piece == Piece::Pawn {
                    let piece_player_name = if piece_player == Player::Black { "先手" } else { "後手" };
                    result.push_str(&format!("{}段目: {}の歩\n", row, piece_player_name));
                    
                    if piece_player == player {
                        found_pawns.push(row);
                    }
                } else {
                    result.push_str(&format!("{}段目: 他の駒\n", row));
                }
            } else {
                result.push_str(&format!("{}段目: 空\n", row));
            }
        }
        
        if found_pawns.is_empty() {
            result.push_str("二歩なし - ドロップ可能\n");
        } else {
            let pawn_positions: Vec<String> = found_pawns.iter().map(|&row| row.to_string()).collect();
            result.push_str(&format!("二歩あり - 列{}の{}段目に{}の歩があるためドロップ不可\n", 
                col, pawn_positions.join(", "), player_name));
        }
        
        result
    }

    // 持ち駒の状態を詳細に表示するデバッグメソッド
    #[wasm_bindgen]
    pub fn debug_captured_pieces(&self) -> String {
        let mut result = String::new();
        result.push_str("持ち駒の状態:\n");
        
        for player in [Player::Black, Player::White] {
            let player_name = if player == Player::Black { "先手" } else { "後手" };
            result.push_str(&format!("{}の持ち駒:\n", player_name));
            
            let mut has_pieces = false;
            let pieces = [Piece::Pawn, Piece::Lance, Piece::Knight, Piece::Silver, Piece::Gold, Piece::Bishop, Piece::Rook, Piece::King];
            for piece in pieces {
                let count = self.get_captured_piece_count(player, piece);
                if count > 0 {
                    let piece_name = match piece {
                        Piece::Pawn => "歩",
                        Piece::Lance => "香",
                        Piece::Knight => "桂",
                        Piece::Silver => "銀",
                        Piece::Gold => "金",
                        Piece::Bishop => "角",
                        Piece::Rook => "飛",
                        Piece::King => "玉",
                        _ => "不明",
                    };
                    result.push_str(&format!("  {}: {}個\n", piece_name, count));
                    has_pieces = true;
                }
            }
            
            if !has_pieces {
                result.push_str("  持ち駒なし\n");
            }
        }
        
        result
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

    // 二歩の禁止チェック（同じ列のみ判定、移動元の歩を除外）
    fn has_pawn_in_column_except(&self, col: i32, player: Player, except_row: i32) -> bool {
        // 指定された列（col）のみをチェック（同じ段は判定しない）
        for row in 0..9 {
            if row == except_row {
                continue; // 移動元の位置は除外
            }
            let pos = Position::new(row, col);
            if let Some((piece, piece_player)) = self.get_piece_at(pos) {
                // 同じ列に自分の歩があるかチェック（相手の歩は判定に入れない）
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

    fn can_move_backward(&self, piece: Piece) -> bool {
        matches!(piece, 
            Piece::Silver | Piece::Bishop | Piece::Rook
        )
    }
}

#[wasm_bindgen]
pub fn hello_shogi() -> String {
    "こんにちは将棋！".to_string()
}