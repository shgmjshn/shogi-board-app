#!/bin/bash

echo "三者対話テンプレートのセットアップを開始します..."

# .envファイルの作成
if [ ! -f .env ]; then
    cat > .env << 'EOF'
# Gemini API設定
GEMINI_API_KEY="your_gemini_api_key_here"
GEMINI_CMD="curl -s -X POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $GEMINI_API_KEY' \
  -d '{
    \"contents\": [{
      \"parts\": [{
        \"text\": \"$1\"
      }]
    }]
  }' | jq -r '.candidates[0].content.parts[0].text'"
EOF
    echo "✅ .envファイルを作成しました"
else
    echo "⚠️  .envファイルは既に存在します"
fi

# 実行権限の設定
chmod +x triad.sh
echo "✅ triad.shに実行権限を設定しました"

# logsディレクトリの作成
mkdir -p logs
echo "✅ logsディレクトリを作成しました"

echo ""
echo "セットアップ完了！"
echo "次に、.envファイルを編集してGemini APIキーを設定してください。"
