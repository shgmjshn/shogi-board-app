import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

function getApiKey(env: Record<string, string>): string | undefined {
  return env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || undefined;
}

async function readRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function handleOcrRequest(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string>,
) {
  const apiKey = getApiKey(env);
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error:
          'GEMINI_API_KEY が設定されていません。frontend/.env.local を確認してください。',
      }),
    );
    return;
  }

  try {
    const body = JSON.parse(await readRequestBody(req)) as {
      image?: string;
      mimeType?: string;
    };

    if (!body.image) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'image が必要です' }));
      return;
    }

    const module = await server.ssrLoadModule('/src/utils/geminiBoardOcr.ts');
    const recognizeWithGemini = module.recognizeWithGemini as (
      apiKey: string,
      imageBase64: string,
      mimeType: string,
    ) => Promise<unknown>;

    const position = await recognizeWithGemini(
      apiKey,
      body.image,
      body.mimeType || 'image/jpeg',
    );

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(position));
  } catch (error) {
    const message = error instanceof Error ? error.message : '盤面認識に失敗しました';
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message }));
  }
}

export function ocrApiDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'ocr-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/ocr-shogi' || req.method !== 'POST') {
          next();
          return;
        }

        await handleOcrRequest(server, req, res, env);
      });
    },
  };
}
