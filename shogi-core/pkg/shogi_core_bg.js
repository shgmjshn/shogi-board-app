let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}


const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_export_0.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}
/**
 * @returns {string}
 */
export function hello_shogi() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.hello_shogi();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14}
 */
export const Piece = Object.freeze({
    Empty: 0, "0": "Empty",
    Pawn: 1, "1": "Pawn",
    Lance: 2, "2": "Lance",
    Knight: 3, "3": "Knight",
    Silver: 4, "4": "Silver",
    Gold: 5, "5": "Gold",
    Bishop: 6, "6": "Bishop",
    Rook: 7, "7": "Rook",
    King: 8, "8": "King",
    PromotedPawn: 9, "9": "PromotedPawn",
    PromotedLance: 10, "10": "PromotedLance",
    PromotedKnight: 11, "11": "PromotedKnight",
    PromotedSilver: 12, "12": "PromotedSilver",
    PromotedBishop: 13, "13": "PromotedBishop",
    PromotedRook: 14, "14": "PromotedRook",
});
/**
 * @enum {0 | 1}
 */
export const Player = Object.freeze({
    Black: 0, "0": "Black",
    White: 1, "1": "White",
});

const BoardFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_board_free(ptr >>> 0, 1));

export class Board {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Board.prototype);
        obj.__wbg_ptr = ptr;
        BoardFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BoardFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_board_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.board_new();
        this.__wbg_ptr = ret >>> 0;
        BoardFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {Position} position
     * @returns {PieceInfo}
     */
    get_piece(position) {
        _assertClass(position, Position);
        var ptr0 = position.__destroy_into_raw();
        const ret = wasm.board_get_piece(this.__wbg_ptr, ptr0);
        return PieceInfo.__wrap(ret);
    }
    /**
     * @param {Position} from
     * @param {Position} to
     * @returns {boolean}
     */
    is_valid_move(from, to) {
        _assertClass(from, Position);
        var ptr0 = from.__destroy_into_raw();
        _assertClass(to, Position);
        var ptr1 = to.__destroy_into_raw();
        const ret = wasm.board_is_valid_move(this.__wbg_ptr, ptr0, ptr1);
        return ret !== 0;
    }
    /**
     * @param {Position} from
     * @param {Position} to
     * @returns {boolean}
     */
    make_move(from, to) {
        _assertClass(from, Position);
        var ptr0 = from.__destroy_into_raw();
        _assertClass(to, Position);
        var ptr1 = to.__destroy_into_raw();
        const ret = wasm.board_make_move(this.__wbg_ptr, ptr0, ptr1);
        return ret !== 0;
    }
    /**
     * @param {Position} from
     * @param {Position} to
     * @param {boolean} promote
     * @returns {boolean}
     */
    make_move_with_promotion(from, to, promote) {
        _assertClass(from, Position);
        var ptr0 = from.__destroy_into_raw();
        _assertClass(to, Position);
        var ptr1 = to.__destroy_into_raw();
        const ret = wasm.board_make_move_with_promotion(this.__wbg_ptr, ptr0, ptr1, promote);
        return ret !== 0;
    }
    /**
     * @returns {Player}
     */
    get_current_player() {
        const ret = wasm.board_get_current_player(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {Position} from
     * @returns {Position[]}
     */
    get_valid_moves(from) {
        _assertClass(from, Position);
        var ptr0 = from.__destroy_into_raw();
        const ret = wasm.board_get_valid_moves(this.__wbg_ptr, ptr0);
        var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v2;
    }
    /**
     * @param {number} from_row
     * @param {number} from_col
     * @returns {Position[]}
     */
    get_valid_moves_by_coords(from_row, from_col) {
        const ret = wasm.board_get_valid_moves_by_coords(this.__wbg_ptr, from_row, from_col);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {number} row
     * @param {number} col
     * @returns {PieceInfo}
     */
    get_piece_by_coords(row, col) {
        const ret = wasm.board_get_piece_by_coords(this.__wbg_ptr, row, col);
        return PieceInfo.__wrap(ret);
    }
    /**
     * @param {number} from_row
     * @param {number} from_col
     * @param {number} to_row
     * @param {number} to_col
     * @returns {boolean}
     */
    make_move_by_coords(from_row, from_col, to_row, to_col) {
        const ret = wasm.board_make_move_by_coords(this.__wbg_ptr, from_row, from_col, to_row, to_col);
        return ret !== 0;
    }
    /**
     * @param {number} from_row
     * @param {number} from_col
     * @param {number} to_row
     * @param {number} to_col
     * @param {boolean} promote
     * @returns {boolean}
     */
    make_move_by_coords_with_promotion(from_row, from_col, to_row, to_col, promote) {
        const ret = wasm.board_make_move_by_coords_with_promotion(this.__wbg_ptr, from_row, from_col, to_row, to_col, promote);
        return ret !== 0;
    }
    /**
     * @param {number} from_row
     * @param {number} from_col
     * @param {number} to_row
     * @param {number} to_col
     * @returns {boolean}
     */
    can_promote(from_row, from_col, to_row, to_col) {
        const ret = wasm.board_can_promote(this.__wbg_ptr, from_row, from_col, to_row, to_col);
        return ret !== 0;
    }
    /**
     * @returns {Board}
     */
    clone() {
        const ret = wasm.board_clone(this.__wbg_ptr);
        return Board.__wrap(ret);
    }
    /**
     * @param {Position} position
     * @param {Piece} piece
     * @param {Player} player
     * @returns {boolean}
     */
    set_piece(position, piece, player) {
        _assertClass(position, Position);
        var ptr0 = position.__destroy_into_raw();
        const ret = wasm.board_set_piece(this.__wbg_ptr, ptr0, piece, player);
        return ret !== 0;
    }
}

const PieceInfoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pieceinfo_free(ptr >>> 0, 1));

export class PieceInfo {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PieceInfo.prototype);
        obj.__wbg_ptr = ptr;
        PieceInfoFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PieceInfoFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pieceinfo_free(ptr, 0);
    }
    /**
     * @returns {Piece}
     */
    get piece() {
        const ret = wasm.__wbg_get_pieceinfo_piece(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {Piece} arg0
     */
    set piece(arg0) {
        wasm.__wbg_set_pieceinfo_piece(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {Player}
     */
    get player() {
        const ret = wasm.__wbg_get_pieceinfo_player(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {Player} arg0
     */
    set player(arg0) {
        wasm.__wbg_set_pieceinfo_player(this.__wbg_ptr, arg0);
    }
}

const PositionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_position_free(ptr >>> 0, 1));

export class Position {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Position.prototype);
        obj.__wbg_ptr = ptr;
        PositionFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PositionFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_position_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get row() {
        const ret = wasm.__wbg_get_position_row(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set row(arg0) {
        wasm.__wbg_set_position_row(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get column() {
        const ret = wasm.__wbg_get_position_column(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set column(arg0) {
        wasm.__wbg_set_position_column(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} row
     * @param {number} column
     */
    constructor(row, column) {
        const ret = wasm.position_new(row, column);
        this.__wbg_ptr = ret >>> 0;
        PositionFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    debug_info() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.position_debug_info(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get_row() {
        const ret = wasm.position_get_row(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_column() {
        const ret = wasm.position_get_column(this.__wbg_ptr);
        return ret;
    }
}

export function __wbg_error_524f506f44df1645(arg0) {
    console.error(arg0);
};

export function __wbg_position_new(arg0) {
    const ret = Position.__wrap(arg0);
    return ret;
};

export function __wbindgen_init_externref_table() {
    const table = wasm.__wbindgen_export_0;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
    ;
};

export function __wbindgen_string_new(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return ret;
};

export function __wbindgen_throw(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

