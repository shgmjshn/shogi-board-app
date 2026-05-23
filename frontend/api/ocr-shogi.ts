import type { VercelRequest, VercelResponse } from '@vercel/node';
import { recognizeWithGemini } from '../lib/ocr/geminiBoardOcr';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY が設定されていません。Vercel の Environment Variables に GEMINI_API_KEY を追加して再デプロイしてください。',
    });
  }

  try {
    const { image, mimeType } = req.body ?? {};
    if (typeof image !== 'string' || !image) {
      return res.status(400).json({ error: 'image が必要です' });
    }

    const resolvedMimeType = typeof mimeType === 'string' && mimeType ? mimeType : 'image/jpeg';
    const position = await recognizeWithGemini(apiKey, image, resolvedMimeType);
    return res.status(200).json(position);
  } catch (error) {
    const message = error instanceof Error ? error.message : '盤面認識に失敗しました';
    console.error('ocr-shogi failed:', message);
    return res.status(500).json({ error: message });
  }
}
