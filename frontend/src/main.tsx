import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import html2canvas from 'html2canvas'

// WebAssemblyモジュールの初期化
const initWasm = async () => {
  try {
    console.log('WASMモジュールの初期化開始');
    
    // WebAssemblyモジュールを動的インポート（型を明示して default を呼び出せるようにする）
    const wasmModule: typeof import('shogi-core') = await import('shogi-core');
    console.log('WASMモジュール読み込み完了:', wasmModule);

    // WASMモジュールの初期化を待機
    await wasmModule.default();
    console.log('WASMモジュール初期化完了');

    // Boardクラスなどが正しくimportできているか確認
    if (!wasmModule.Board || typeof wasmModule.Board !== 'function') {
      throw new Error('Boardクラスが見つかりません');
    }

    // テスト用のインスタンス作成
    const testBoard = new wasmModule.Board();
    console.log('Boardインスタンス作成成功:', testBoard);

    // グローバルにモジュールを設定（必要なら）
    (window as any).wasmModule = wasmModule;
    
    // html2canvasをグローバルに設定
    (window as any).html2canvas = html2canvas;
    
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
