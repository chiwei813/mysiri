# Gemini 語音助理

這是一個基於 Gemini API 的語音助理應用程式，提供語音輸入、文字輸入和語音輸出的功能。

## 功能

- 語音輸入：通過麥克風將您的語音轉換為文字
- 文字輸入：直接輸入文字進行對話
- 使用 Gemini API 進行自然語言處理
- 語音輸出：將 Gemini 的回應轉換為語音
- API 多層備用機制：當主模型配額用完時自動切換備用模型或 REST API 調用
- 響應緩存：記住並快速響應相似問題，減少 API 調用
- 語音設置：可調整語音回應的音量、語速
- 聊天歷史記錄：保存對話歷史

## 技術棧

- 前端：HTML、CSS、JavaScript、Bootstrap
- 後端：Python、Flask
- 語音處理：SpeechRecognition、pyttsx3、pydub、ffmpeg
- AI 模型：Google Gemini API (1.5-pro / 1.0-pro / 2.0-flash)

## 安裝與設置

### 必要條件

- Python 3.10+
- Conda 環境管理工具
- Google Gemini API 密鑰

### 步驟

1. 克隆此專案
2. 創建並激活 Conda 環境

```bash
conda create -n gemini_voice_assistant python=3.10 -y
conda activate gemini_voice_assistant
```

3. 安裝所需的依賴

```bash
pip install flask google-generativeai SpeechRecognition pyttsx3 python-dotenv pydub ffmpeg-python
conda install -c conda-forge ffmpeg -y
```

4. 在 `.env` 文件中設置你的 Gemini API 密鑰

```
GEMINI_API_KEY=your_api_key_here
FLASK_SECRET_KEY=your_secret_key_for_session
```

5. 運行應用

```bash
python app.py
```

6. 在瀏覽器中訪問 `http://127.0.0.1:5000`

## 使用說明

1. 在輸入框中輸入文字後按下「發送」按鈕或按 Enter 鍵
2. 或者點擊麥克風按鈕進行語音輸入（最長錄音10秒）
3. 等待 Gemini API 處理您的輸入並返回回應
4. 系統將自動播放語音回應
5. 點擊右下角⚙️按鈕可以調整語音設置

## API 配額限制解決方案

本應用實現了多層級的 API 備用機制:
1. 首先嘗試使用 `gemini-1.5-pro` 模型
2. 如遇配額限制，切換到 `gemini-1.0-pro` 模型
3. 若仍失敗，則使用直接 REST API 調用 `gemini-2.0-flash` 模型

此外，應用還使用緩存機制減少 API 調用次數，相似問題會直接返回上次的回答。

## 注意事項

- 語音輸入功能需要麥克風權限
- 使用前請確保已設置正確的 Gemini API 密鑰
- 本應用程序只能使用連接到互聯網的設備
