# Gemini 語音助理

這是一個基於 Gemini API 的語音助理網頁應用程式，提供語音輸入、文字輸入和語音輸出的功能，並實現了多層 API 備用機制以解決配額限制問題。

## 功能特色

- **語音互動**：
  - 語音輸入：通過麥克風將您的語音轉換為文字，自動顯示於輸入框，方便編輯
  - 文字輸入：直接輸入文字進行對話
  - 語音輸出：將 Gemini 的回應轉換為語音

- **多層 API 備用機制**：
  - 主要模型：gemini-2.0-flash (通過 REST API)
  - 第一備用：gemini-1.0-pro (通過 REST API)
  - 最後備用：gemini-1.5-pro (通過 SDK)

- **智能緩存系統**：
  - 查詢緩存：避免重複 API 調用，節省配額
  - 緩存過期機制：自動清理過時回應
  - 相似查詢檢測：識別相似問題，提供一致回答

- **個人化語音設置**：
  - 音量調整：根據個人喜好設定回應音量
  - 語速調整：自定義語音播放速度
  - 設置記憶：自動保存個人化語音設置

- **聊天歷史記錄**：
  - 自動保存最近 50 條對話
  - 頁面刷新後仍保留歷史紀錄

## 技術棧

- **前端**：HTML、CSS、JavaScript、Bootstrap
- **後端**：Python、Flask
- **語音處理**：SpeechRecognition、pyttsx3、pydub、ffmpeg
- **AI 模型**：Google Gemini API (2.0-flash / 1.0-pro / 1.5-pro)
- **緩存機制**：基於時間戳和相似度檢測的智能緩存

## 安裝與設置

### 必要條件

- Python 3.10+
- Conda 環境管理工具
- Google Gemini API 密鑰

### 安裝步驟

1. 克隆此專案
   ```bash
   git clone https://github.com/chiwei813/mysiri.git
   cd mysiri
   ```

2. 創建並激活 Conda 環境
   ```bash
   conda create -n gemini_voice_assistant python=3.10 -y
   conda activate gemini_voice_assistant
   ```

3. 安裝所需的依賴
   ```bash
   pip install flask google-generativeai SpeechRecognition pyttsx3 python-dotenv pydub
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

1. **文字對話**：
   - 在輸入框中輸入文字
   - 按下「發送」按鈕或按 Enter 鍵發送
   - 等待 AI 回應並聆聽語音回答

2. **語音對話**：
   - 點擊麥克風按鈕開始錄音（最長錄音10秒）
   - 系統會自動將您的語音轉換為文字，顯示在輸入框中
   - 語音識別內容會自動發送，或者您可以編輯後再發送
   - AI 回應將自動以語音播放

3. **語音設置**：
   - 可調整回應的音量和語速以符合個人偏好
   - 設置會自動保存，下次使用時仍然有效

## API 配額限制解決方案

本應用實現了完善的多層級 API 備用機制:
1. 首先嘗試使用 `gemini-2.0-flash` 模型（通過 REST API）
2. 如遇配額限制，切換到 `gemini-1.0-pro` 模型（通過 REST API）
3. 若仍失敗，則使用 SDK 調用 `gemini-1.5-pro` 模型作為最後備用

此外，應用還實現了智能緩存系統，能夠識別相似問題並直接返回已有回答，有效減少不必要的 API 調用，延長免費配額的使用時間。

## 開發與擴展

本專案設計了清晰的模組化結構，方便進一步擴展：
- 可輕鬆添加更多語言支援
- 易於整合其他 AI 模型作為備用
- 可擴展語音合成功能，支援更多聲音選項
- 可進一步優化連續對話模式，保持對話上下文

## 注意事項

- 語音輸入功能需要瀏覽器的麥克風權限
- 使用前請確保已設置正確的 Gemini API 密鑰
- 本應用需要網路連接才能運作
- 緩存系統會保存之前的對話，注意不要輸入敏感信息
