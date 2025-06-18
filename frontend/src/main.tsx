import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// WebAssemblyモジュールの初期化
const initWasm = async () => {
  try {
    // モジュールをインポート
    const wasmModule = await import('shogi-core');
    
    // モジュールの初期化を待機
    if ((wasmModule as any).init && typeof (wasmModule as any).init === 'function') {
      const wasmUrl = '/shogi_core_bg.wasm';
      console.log('WASMファイルのURL:', wasmUrl);
      
      // WASMモジュールの初期化に必要なimportsを提供
      const imports = {
        './shogi_core_bg.js': wasmModule
      };
      
      await (wasmModule as any).init(wasmUrl, imports);
    } else if (typeof (wasmModule as any).default === 'function') {
      await (wasmModule as any).default();
    } else {
      throw new Error('WASMモジュールの初期化関数が見つかりません');
    }

    // モジュールが利用可能になるまで待機
    let retryCount = 0;
    const maxRetries = 20;
    const checkModule = () => {
      return new Promise<void>((resolve, reject) => {
        const check = () => {
          // モジュールの基本機能が利用可能か確認
          if (wasmModule.Board && typeof wasmModule.Board === 'function') {
            try {
              // テスト用のインスタンスを作成して機能を確認
              const testBoard = new wasmModule.Board();
              if (testBoard && typeof testBoard.get_piece === 'function') {
                console.log("WASMモジュールが完全に初期化されました");
                // グローバルにモジュールを設定
                (window as any).wasmModule = wasmModule;
                resolve();
                return;
              }
            } catch (err) {
              console.log("モジュールの機能確認中:", err);
            }
          }

          if (retryCount >= maxRetries) {
            reject(new Error('WASMモジュールの初期化がタイムアウトしました'));
            return;
          }

          retryCount++;
          console.log(`WASMモジュールの初期化を待機中... (${retryCount}/${maxRetries})`);
          setTimeout(check, 200); // 待機時間を延長
        };
        check();
      });
    };

    await checkModule();
    return true;
  } catch (err) {
    console.error('WASMモジュールの初期化に失敗しました:', err);
    throw err;
  }
};

// アプリケーションの初期化
const initApp = async () => {
  try {
    // WebAssemblyモジュールの初期化を待機
    await initWasm();
    
    // モジュールが利用可能か最終確認
    if (!(window as any).wasmModule?.Board) {
      throw new Error('WebAssemblyモジュールが正しく初期化されていません');
    }

    // テスト用のインスタンスを作成して最終確認
    try {
      const testBoard = new (window as any).wasmModule.Board();
      if (!testBoard || typeof testBoard.get_piece !== 'function') {
        throw new Error('WebAssemblyモジュールの機能が不完全です');
      }
    } catch (err) {
      throw new Error('WebAssemblyモジュールのテストに失敗しました: ' + (err instanceof Error ? err.message : String(err)));
    }

    // Reactアプリケーションのマウント
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error('アプリケーションの初期化に失敗しました:', err);
    document.getElementById('root')!.innerHTML = `
      <div style="color: red; padding: 20px;">
        エラー: アプリケーションの初期化に失敗しました。<br>
        ${err instanceof Error ? err.message : '不明なエラーが発生しました'}
      </div>
    `;
  }
};

// アプリケーションの初期化を開始
initApp();
