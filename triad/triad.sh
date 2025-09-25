#!/bin/bash


set -e

# 環境変数ファイルの読み込み
if [ ! -f "$(dirname $0)/.env" ]; then
    echo "エラー: .envファイルが見つかりません。setup.shを実行してください。"
    exit 1
fi

source $(dirname $0)/.env

# APIキーの確認
if [ "$GEMINI_API_KEY" = "your_gemini_api_key_here" ]; then
    echo "警告: Gemini APIキーが設定されていません。.envファイルを編集してください。"
    echo "テストモードで実行します..."
fi

log_dir="$(dirname $0)/logs"
mkdir -p $log_dir
log_file="$log_dir/$(date +%Y-%m-%d).log"

prompt="$1"

# 出力形式に応じてプロンプトを改善
if echo "$prompt" | grep -qiE "(コード|code|プログラム|program|ソース|source|書いて|作成|作って|実装|implement)"; then
    prompt="$prompt

コードは必ず\`\`\`で囲んでください。例：
\`\`\`python
# ここにコードを書く
\`\`\`"
elif echo "$prompt" | grep -qiE "(json|JSON|データ|data|構造|structure)"; then
    prompt="$prompt

JSON形式で返答してください。例：
{
  'key': 'value',
  'array': [1, 2, 3]
}"
elif echo "$prompt" | grep -qiE "(csv|CSV|表|table|スプレッドシート|spreadsheet)"; then
    prompt="$prompt

CSV形式で返答してください。例：
名前,年齢,職業
田中,25,エンジニア
佐藤,30,デザイナー"
elif echo "$prompt" | grep -qiE "(xml|XML|マークアップ|markup)"; then
    prompt="$prompt

XML形式で返答してください。例：
<root>
  <item>value</item>
</root>"
elif echo "$prompt" | grep -qiE "(yaml|YAML|設定|config|設定ファイル)"; then
    prompt="$prompt

YAML形式で返答してください。例：
key: value
array:
  - item1
  - item2"
elif echo "$prompt" | grep -qiE "(html|HTML|ウェブ|web|ページ|page)"; then
    prompt="$prompt

HTML形式で返答してください。例：
<html>
<head><title>タイトル</title></head>
<body><h1>見出し</h1></body>
</html>"
elif echo "$prompt" | grep -qiE "(markdown|Markdown|マークダウン|md|MD)"; then
    prompt="$prompt

Markdown形式で返答してください。例：
# 見出し1
## 見出し2
- リスト項目1
- リスト項目2"
fi

# プロンプトの確認
if [ -z "$prompt" ]; then
    echo "使用方法: $0 \"あなたのプロンプト\""
    exit 1
fi

echo "プロンプト: $prompt"
echo "ログファイル: $log_file"

# Gemini APIの呼び出し
{
echo ">>> Prompt: $prompt"
echo ">>> 実行時刻: $(date)"
echo ">>> APIキー: ${GEMINI_API_KEY:0:10}..."

# APIキーが設定されている場合のみAPIを呼び出す
if [ "$GEMINI_API_KEY" != "your_gemini_api_key_here" ]; then
    echo ">>> API呼び出し開始..."
    response=$(curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -d "{
        \"contents\": [{
          \"parts\": [{
            \"text\": \"$prompt\"
          }]
        }]
      }" 2>&1)
    
    # エラーチェック
    if echo "$response" | grep -q '"error"'; then
        echo ">>> エラーが発生しました"
        echo ">>> API応答:"
        echo "$response"
    else
        echo ">>> API呼び出し成功"
        # 応答のテキスト部分だけを抽出して表示（一時ファイルを使用）
        temp_file=$(mktemp)
        echo "$response" > "$temp_file"
        gemini_response=$(python3 -c "
import json, sys
try:
    with open('$temp_file', 'r', encoding='utf-8') as f:
        data = json.load(f)
    text = data['candidates'][0]['content']['parts'][0]['text']
    print(text, end='')
except Exception as e:
    print('応答の解析に失敗しました: ' + str(e), end='')
" 2>/dev/null || echo "応答の解析に失敗しました")
        rm -f "$temp_file"
        
        # 応答形式を検出して適切に表示
        if echo "$gemini_response" | grep -q "\`\`\`"; then
            echo ">>> コードブロック形式で応答を取得しました"
        elif echo "$gemini_response" | grep -q "^[[:space:]]*{.*}[[:space:]]*$"; then
            echo ">>> JSON形式で応答を取得しました"
        elif echo "$gemini_response" | grep -q "^[[:space:]]*<.*>[[:space:]]*$"; then
            echo ">>> XML/HTML形式で応答を取得しました"
        elif echo "$gemini_response" | grep -q "^[[:space:]]*[a-zA-Z_][a-zA-Z0-9_]*:[[:space:]]"; then
            echo ">>> YAML形式で応答を取得しました"
        elif echo "$gemini_response" | grep -q "^[[:space:]]*#.*$"; then
            echo ">>> Markdown形式で応答を取得しました"
        elif echo "$gemini_response" | grep -q ","; then
            echo ">>> CSV形式で応答を取得しました"
        fi
        echo ">>> Geminiの応答:"
        echo "$gemini_response"
    fi
else
    echo "テストモード: APIキーが設定されていないため、実際のAPI呼び出しはスキップされました。"
    echo "設定例: GEMINI_API_KEY=\"your_actual_api_key\""
fi

echo -e "\n---\n"
} >> $log_file

echo "Geminiの出力を $log_file に追記しました。"

# 応答のテキスト部分をターミナルにも表示
if [ "$GEMINI_API_KEY" != "your_gemini_api_key_here" ]; then
    echo ""
    echo "=== Geminiの応答 ==="
    echo "$gemini_response"
    echo "=================="
fi