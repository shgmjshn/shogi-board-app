import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  EMPTY_CAPTURED,
  OcrCell,
  OcrPieceType,
  OcrSide,
  RecognizedPosition,
} from './boardOcrTypes';

const OCR_PROMPT = `この将棋盤の写真を解析し、現在の局面をJSONのみで返してください。説明文は不要です。

座標系:
- board は 9x9 配列
- board[0] が9段（相手側・画面上部）、board[8] が1段（自分側・画面下部）
- board[row][0] が9筋（左）、board[row][8] が1筋（右）
- 内部座標と一致するよう、標準的な将棋盤の向きで読み取ってください

駒の向き:
- 先手（黒/sente）の駒: 先が相手側を向く
- 後手（白/gote）の駒: 先が相手側を向く（180度回転）

JSON形式:
{
  "turn": "black" または "white",
  "board": [
    [null, {"piece":"pawn","side":"black"}, ... 9列],
    ... 9行
  ],
  "captured": {
    "black": {"pawn":0,"lance":0,"knight":0,"silver":0,"gold":0,"bishop":0,"rook":0,"king":0},
    "white": {"pawn":0,"lance":0,"knight":0,"silver":0,"gold":0,"bishop":0,"rook":0,"king":0}
  }
}

piece の値: pawn, lance, knight, silver, gold, bishop, rook, king, promoted_pawn, promoted_lance, promoted_knight, promoted_silver, promoted_bishop, promoted_rook
side の値: black（先手）, white（後手）
空マスは null
持ち駒は駒台の枚数を数えて captured に記載
手番が不明な場合は "black" とする`;

const VALID_PIECES = new Set<OcrPieceType>([
  'pawn',
  'lance',
  'knight',
  'silver',
  'gold',
  'bishop',
  'rook',
  'king',
  'promoted_pawn',
  'promoted_lance',
  'promoted_knight',
  'promoted_silver',
  'promoted_bishop',
  'promoted_rook',
]);

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    return fenced[1].trim();
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }

  return text.trim();
}

function parseCaptured(raw: unknown): RecognizedPosition['captured'] {
  const parseSide = (value: unknown) => {
    const result = { ...EMPTY_CAPTURED };
    if (!value || typeof value !== 'object') {
      return result;
    }

    for (const key of Object.keys(EMPTY_CAPTURED) as Array<keyof typeof EMPTY_CAPTURED>) {
      const count = (value as Record<string, unknown>)[key];
      if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
        result[key] = Math.floor(count);
      }
    }

    return result;
  };

  const captured = raw as Record<string, unknown> | undefined;
  return {
    black: parseSide(captured?.black),
    white: parseSide(captured?.white),
  };
}

function parseCell(raw: unknown): OcrCell | null {
  if (raw == null) {
    return null;
  }

  if (typeof raw !== 'object') {
    return null;
  }

  const piece = (raw as Record<string, unknown>).piece;
  const side = (raw as Record<string, unknown>).side;

  if (typeof piece !== 'string' || !VALID_PIECES.has(piece as OcrPieceType)) {
    return null;
  }

  if (side !== 'black' && side !== 'white') {
    return null;
  }

  return {
    piece: piece as OcrPieceType,
    side: side as OcrSide,
  };
}

export function parseRecognizedPosition(raw: unknown): RecognizedPosition {
  if (!raw || typeof raw !== 'object') {
    throw new Error('OCR結果の形式が不正です');
  }

  const data = raw as Record<string, unknown>;
  const turn = data.turn === 'white' ? 'white' : 'black';

  if (!Array.isArray(data.board) || data.board.length !== 9) {
    throw new Error('盤面データが9行ではありません');
  }

  const board = data.board.map((row) => {
    if (!Array.isArray(row) || row.length !== 9) {
      throw new Error('盤面データの列数が9ではありません');
    }
    return row.map(parseCell);
  });

  return {
    turn,
    board,
    captured: parseCaptured(data.captured),
  };
}

export async function recognizeWithGemini(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
): Promise<RecognizedPosition> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent([
    OCR_PROMPT,
    {
      inlineData: {
        data: imageBase64,
        mimeType,
      },
    },
  ]);

  const text = result.response.text();
  if (!text) {
    throw new Error('OCR結果が空でした');
  }

  return parseRecognizedPosition(JSON.parse(extractJson(text)));
}

export function summarizePosition(position: RecognizedPosition): string {
  let boardPieces = 0;
  for (const row of position.board) {
    for (const cell of row) {
      if (cell) {
        boardPieces += 1;
      }
    }
  }

  const countCaptured = (side: OcrSide) =>
    Object.values(position.captured[side]).reduce((sum, count) => sum + count, 0);

  const turnLabel = position.turn === 'black' ? '先手' : '後手';
  const blackCaptured = countCaptured('black');
  const whiteCaptured = countCaptured('white');

  return `盤上 ${boardPieces} 駒 / 先手持ち駒 ${blackCaptured} / 後手持ち駒 ${whiteCaptured} / 手番: ${turnLabel}`;
}
