import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// WebAssemblyモジュールの初期化
const initWasm = async () => {
  try {
    console.log('WASMモジュールの初期化開始');
    
    // WebAssemblyモジュールを動的インポート
    const wasmModule = await import('shogi-core');
    console.log('WASMモジュール読み込み完了:', wasmModule);

    // 明示的に初期化関数を呼び出す
    if (wasmModule.default) {
      await wasmModule.default();
      console.log('WASMモジュール初期化完了');
    }

    // Boardクラスなどが正しくimportできているか確認
    if (!wasmModule.Board || typeof wasmModule.Board !== 'function') {
      throw new Error('Boardクラスが見つかりません');
    }

    // テスト用のインスタンス作成
    const testBoard = new wasmModule.Board();
    console.log('Boardインスタンス作成成功:', testBoard);

    // グローバルにモジュールを設定（必要なら）
    (window as any).wasmModule = wasmModule;
    console.log('WASMモジュールの初期化完了');
    return wasmModule;
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
