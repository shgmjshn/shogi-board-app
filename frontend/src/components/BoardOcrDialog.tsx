import React, { useEffect, useRef, useState } from 'react';
import {
  fileToBase64,
  getConfiguredApiKey,
  getStoredApiKey,
  recognizeBoardFromPhoto,
  storeApiKey,
} from '../utils/boardOcrService';
import { summarizePosition } from '../utils/geminiBoardOcr';
import { RecognizedPosition } from '../utils/boardOcrTypes';
import './BoardOcrDialog.css';

interface BoardOcrDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (position: RecognizedPosition) => void;
}

export const BoardOcrDialog: React.FC<BoardOcrDialogProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognizedPosition, setRecognizedPosition] = useState<RecognizedPosition | null>(null);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const resetState = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    setRecognizedPosition(null);
    setSummary('');
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setRecognizedPosition(null);
    setSummary('');
  };

  const handleRecognize = async () => {
    if (!selectedFile) {
      setError('先に写真を選択してください');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setRecognizedPosition(null);
    setSummary('');

    try {
      storeApiKey(apiKey);
      const { base64, mimeType } = await fileToBase64(selectedFile);
      const position = await recognizeBoardFromPhoto(base64, mimeType, apiKey);
      setRecognizedPosition(position);
      setSummary(summarizePosition(position));
    } catch (recognizeError) {
      const message =
        recognizeError instanceof Error
          ? recognizeError.message
          : '盤面の読み取りに失敗しました';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!recognizedPosition) {
      return;
    }
    onApply(recognizedPosition);
    handleClose();
  };

  if (!isOpen) {
    return null;
  }

  const hideApiKeyInput =
    import.meta.env.PROD ||
    Boolean(getConfiguredApiKey(apiKey)) ||
    Boolean(import.meta.env.VITE_GEMINI_API_KEY);

  return (
    <div className="board-ocr-overlay" onClick={handleClose}>
      <div
        className="board-ocr-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="board-ocr-title"
      >
        <div className="board-ocr-header">
          <h3 id="board-ocr-title">写真から盤面を読み取る</h3>
          <button type="button" className="board-ocr-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <p className="board-ocr-description">
          将棋盤の写真を撮影または選択し、AI OCRで盤面を再現します。盤面全体と持ち駒が写っている写真だと精度が高くなります。
        </p>

        <div className="board-ocr-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="board-ocr-file-input"
            id="board-ocr-file"
          />
          <label htmlFor="board-ocr-file" className="board-ocr-file-label">
            写真を撮る / 選択
          </label>
          <button
            type="button"
            className="board-ocr-recognize-button"
            onClick={handleRecognize}
            disabled={!selectedFile || isProcessing}
          >
            {isProcessing ? '読み取り中...' : '盤面を読み取る'}
          </button>
        </div>

        {!hideApiKeyInput && (
          <div className="board-ocr-api-key">
            <label htmlFor="board-ocr-api-key">Gemini APIキー（未設定時のみ必要）</label>
            <input
              id="board-ocr-api-key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="AIza..."
              autoComplete="off"
            />
            <p className="board-ocr-api-key-note">
              本番環境ではサーバー側の GEMINI_API_KEY を使用します。ローカル開発時は VITE_GEMINI_API_KEY またはここでの入力も利用できます。
            </p>
          </div>
        )}

        {previewUrl && (
          <div className="board-ocr-preview">
            <img src={previewUrl} alt="選択した将棋盤の写真" />
          </div>
        )}

        {isProcessing && <div className="board-ocr-loading">盤面を解析しています...</div>}

        {error && <div className="board-ocr-error">{error}</div>}

        {recognizedPosition && (
          <div className="board-ocr-result">
            <p className="board-ocr-summary">{summary}</p>
            <p className="board-ocr-result-note">
              内容を確認してから盤面に反映してください。誤認識がある場合は局面編集モードで修正できます。
            </p>
            <div className="board-ocr-result-actions">
              <button type="button" className="board-ocr-cancel-button" onClick={handleClose}>
                キャンセル
              </button>
              <button type="button" className="board-ocr-apply-button" onClick={handleApply}>
                盤面に反映
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
