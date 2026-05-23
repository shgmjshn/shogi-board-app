import { recognizeWithGemini } from './geminiBoardOcr';
import { RecognizedPosition } from './boardOcrTypes';

const API_KEY_STORAGE_KEY = 'shogi-board-gemini-api-key';

export function getStoredApiKey(): string {
  return sessionStorage.getItem(API_KEY_STORAGE_KEY) ?? '';
}

export function storeApiKey(apiKey: string): void {
  if (apiKey.trim()) {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
  } else {
    sessionStorage.removeItem(API_KEY_STORAGE_KEY);
  }
}

export function getConfiguredApiKey(userApiKey?: string): string | undefined {
  const key = userApiKey?.trim() || getStoredApiKey() || import.meta.env.VITE_GEMINI_API_KEY;
  return key || undefined;
}

export async function recognizeBoardFromPhoto(
  imageBase64: string,
  mimeType: string,
  userApiKey?: string,
): Promise<RecognizedPosition> {
  const directApiKey = import.meta.env.PROD ? undefined : getConfiguredApiKey(userApiKey);

  if (!directApiKey) {
    try {
      const response = await fetch('/api/ocr-shogi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageBase64, mimeType }),
      });

      const responseBody = (await response.json().catch(() => ({}))) as
        | RecognizedPosition
        | { error?: string };

      if (response.ok) {
        return responseBody as RecognizedPosition;
      }

      throw new Error(
        typeof (responseBody as { error?: string }).error === 'string'
          ? (responseBody as { error?: string }).error
          : `サーバーでの盤面認識に失敗しました (${response.status})`,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('盤面認識リクエストに失敗しました');
    }
  }

  return recognizeWithGemini(directApiKey, imageBase64, mimeType);
}

export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const resized = await resizeImageFile(file, 1280);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('画像の読み込みに失敗しました'));
        return;
      }

      const commaIndex = result.indexOf(',');
      if (commaIndex < 0) {
        reject(new Error('画像データの形式が不正です'));
        return;
      }

      resolve({
        base64: result.slice(commaIndex + 1),
        mimeType: resized.type || 'image/jpeg',
      });
    };
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    reader.readAsDataURL(resized);
  });
}

async function resizeImageFile(file: File, maxSize: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    return file;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9),
  );

  return blob ?? file;
}
