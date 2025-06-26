import * as wasm from "./shogi_core_bg.wasm";
export * from "./shogi_core_bg.js";
import { __wbg_set_wasm } from "./shogi_core_bg.js";
__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
