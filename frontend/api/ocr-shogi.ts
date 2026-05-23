import type { VercelRequest, VercelResponse } from '@vercel/node';
import { recognizeWithGemini } from '../src/utils/geminiBoardOcr';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY が設定されていません。Vercel の環境変数を設定してください。',
    });
  }

  const { image, mimeType } = req.body ?? {};
  if (typeof image !== 'string' || !image) {
    return res.status(400).json({ error: 'image が必要です' });
  }

  const resolvedMimeType = typeof mimeType === 'string' && mimeType ? mimeType : 'image/jpeg';

  try {
    const position = await recognizeWithGemini(apiKey, image, resolvedMimeType);
    return res.status(200).json(position);
  } catch (error) {
    const message = error instanceof Error ? error.message : '盤面認識に失敗しました';
    return res.status(500).json({ error: message });
  }
}
