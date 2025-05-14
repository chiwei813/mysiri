# filepath: /Users/chiweichang/mysiri/app.py
from flask import Flask, render_template, request, jsonify, session
import os
import speech_recognition as sr
import pyttsx3
import google.generativeai as genai
from dotenv import load_dotenv
from pydub import AudioSegment
import subprocess
import requests
import json
import time
import hashlib
import datetime
from utils import generate_cache_key, is_similar_query

# 載入環境變數
load_dotenv()

# 獲取 API KEY
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# 設定 Gemini API
genai.configure(api_key=GEMINI_API_KEY)

# 定義可用模型及其備用模型
PRIMARY_MODEL = 'gemini-1.5-pro'
BACKUP_MODEL = 'gemini-1.0-pro'  # 較低配額的備用模型
REST_API_MODEL = 'gemini-2.0-flash'  # 直接使用 REST API 的模型

# 創建模型和聊天實例
try:
    model = genai.GenerativeModel(PRIMARY_MODEL)
    print(f"使用主要模型: {PRIMARY_MODEL}")
except Exception as e:
    print(f"無法使用主要模型，錯誤: {e}")
    model = genai.GenerativeModel(BACKUP_MODEL)
    print(f"使用備用模型: {BACKUP_MODEL}")

chat = model.start_chat(history=[])

# 簡單的響應緩存系統
response_cache = {}
CACHE_EXPIRY = 60 * 60  # 一小時的緩存過期時間

# 語音設置
voice_settings = {
    'volume': 1.0,
    'rate': 1.0,
    'pitch': 1.0
}

# 創建一個函數來獲取語音引擎實例，每次請求時調用
def get_tts_engine():
    engine = pyttsx3.init()
    engine.setProperty('volume', voice_settings['volume'])
    engine.setProperty('rate', voice_settings['rate'] * 200)  # 基準速率為 200
    return engine

# 使用直接 REST API 方式呼叫 Gemini
def call_gemini_rest_api(text):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{REST_API_MODEL}:generateContent?key={GEMINI_API_KEY}"
    headers = {'Content-Type': 'application/json'}
    data = {
        "contents": [{
            "parts": [{"text": text}]
        }]
    }
    
    print(f"調用 REST API: {REST_API_MODEL}")
    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        print(f"REST API 響應狀態碼: {response.status_code}")
        
        if response.status_code == 200:
            response_json = response.json()
            # 解析返回的 JSON 結果
            try:
                generated_text = response_json['candidates'][0]['content']['parts'][0]['text']
                return generated_text
            except (KeyError, IndexError) as e:
                print(f"解析 API 響應時出錯: {e}")
                print(f"API 響應: {response_json}")
                return f"處理請求時出現問題: {e}"
        elif response.status_code == 429:
            print("REST API 也遇到配額限制")
            return "很抱歉，所有 AI 服務都已達到使用配額限制。請稍後再試。"
        else:
            print(f"API 調用失敗: 狀態碼 {response.status_code}")
            print(f"響應: {response.text}")
            return f"API 調用失敗: {response.text}"
    except requests.exceptions.RequestException as e:
        print(f"REST API 請求異常: {e}")
        return f"REST API 請求失敗: {e}"

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "my_secret_key_for_session")

# 聊天歷史記錄
def get_chat_history():
    if 'chat_history' not in session:
        session['chat_history'] = []
    return session['chat_history']

def add_to_chat_history(user_message, system_response):
    history = get_chat_history()
    history.append({
        'user': user_message,
        'system': system_response,
        'timestamp': datetime.datetime.now().isoformat()
    })
    session['chat_history'] = history
    # 只保留最近的 50 條消息
    if len(history) > 50:
        session['chat_history'] = history[-50:]

@app.route('/')
def index():
    return render_template('index.html', chat_history=get_chat_history())

@app.route('/update_voice_settings', methods=['POST'])
def update_voice_settings():
    global voice_settings
    
    data = request.json
    if not data:
        return jsonify({"error": "No settings provided"}), 400
    
    try:
        # 更新全局語音設置
        voice_settings['volume'] = float(data.get('volume', 1.0))
        voice_settings['rate'] = float(data.get('rate', 1.0))
        voice_settings['pitch'] = float(data.get('pitch', 1.0))
        
        # pyttsx3 目前不直接支持調整音調，但我們可以記錄設置以備將來擴展
        
        return jsonify({"success": True, "settings": voice_settings})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/process_audio', methods=['POST'])
def process_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    
    try:
        # 保存音頻文件到臨時位置
        temp_webm_path = "temp_audio.webm"
        temp_wav_path = "temp_audio.wav"
        audio_file.save(temp_webm_path)
        
        # 使用 ffmpeg 將 webm 轉換為 wav (通過 pydub)
        try:
            sound = AudioSegment.from_file(temp_webm_path, format="webm")
            sound.export(temp_wav_path, format="wav")
        except Exception as e:
            print(f"音頻轉換錯誤: {e}")
            return jsonify({"error": f"音頻格式轉換失敗: {str(e)}"}), 500
        
        # 使用 speech_recognition 進行語音識別
        recognizer = sr.Recognizer()
        
        # 使用轉換後的 WAV 文件
        with sr.AudioFile(temp_wav_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(
                audio_data, 
                language='zh-TW'
            )
        
        # 檢查緩存
        cache_key = generate_cache_key(text)
        current_time = time.time()
        cache_hit = False
        
        # 檢查緩存中是否有匹配的查詢
        for key, cache_data in list(response_cache.items()):
            cache_time, cache_query, cache_response = cache_data
            
            # 檢查緩存是否過期
            if current_time - cache_time > CACHE_EXPIRY:
                del response_cache[key]
                continue
                
            # 檢查查詢是否相似
            if is_similar_query(text, cache_query):
                print(f"語音查詢使用緩存的回應: {cache_key}")
                response_text = cache_response
                cache_hit = True
                break
                
        # 如果沒有命中緩存，使用 API
        if not cache_hit:
            try:
                response = chat.send_message(text)
                response_text = response.text
                
                # 將回應存入緩存
                response_cache[cache_key] = (current_time, text, response_text)
                print(f"語音查詢將回應存入緩存: {cache_key}")
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "quota" in error_str.lower():
                    print(f"主要模型 API 配額限制，嘗試備用模型: {e}")
                    try:
                        # 首先嘗試使用 SDK 的備用模型
                        backup_model = genai.GenerativeModel(BACKUP_MODEL)
                        backup_chat = backup_model.start_chat(history=[])
                        backup_response = backup_chat.send_message(text)
                        response_text = backup_response.text
                        print(f"成功使用備用模型: {BACKUP_MODEL}")
                    except Exception as backup_e:
                        # 如果 SDK 的備用模型也失敗，使用直接 REST API 調用
                        print(f"備用模型也失敗，嘗試直接 REST API: {backup_e}")
                        try:
                            response_text = call_gemini_rest_api(text)
                            print("成功使用直接 REST API 調用")
                        except Exception as rest_e:
                            response_text = f"很抱歉，所有 AI 服務方式都失敗。請稍後再試。錯誤詳情：{rest_e}"
                else:
                    response_text = f"處理您的請求時發生錯誤：{e}"
                    
                # 即使使用備用模型也將有效結果存入緩存
                if not response_text.startswith("很抱歉"):
                    response_cache[cache_key] = (current_time, text, response_text)
        
        # 將回應轉換為語音 (創建新的引擎實例)
        voice_file_path = "static/response.mp3"
        engine = get_tts_engine()
        engine.save_to_file(response_text, voice_file_path)
        engine.runAndWait()
        
        # 清理臨時文件
        if os.path.exists(temp_webm_path):
            os.remove(temp_webm_path)
        if os.path.exists(temp_wav_path):
            os.remove(temp_wav_path)
        
        # 添加到聊天歷史
        add_to_chat_history(text, response_text)
        
        return jsonify({
            "input_text": text,
            "response_text": response_text,
            "audio_url": voice_file_path
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/text_input', methods=['POST'])
def text_input():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400
    
    try:
        # 檢查是否有緩存的回應
        user_query = data['text']
        cache_key = generate_cache_key(user_query)
        current_time = time.time()
        cache_hit = False
        
        # 檢查緩存中是否有匹配的查詢
        for key, cache_data in list(response_cache.items()):
            cache_time, cache_query, cache_response = cache_data
            
            # 檢查緩存是否過期
            if current_time - cache_time > CACHE_EXPIRY:
                del response_cache[key]
                continue
                
            # 檢查查詢是否相似
            if is_similar_query(user_query, cache_query):
                print(f"使用緩存的回應: {cache_key}")
                response_text = cache_response
                cache_hit = True
                break
        
        # 如果沒有命中緩存，使用 API
        if not cache_hit:
            try:
                response = chat.send_message(user_query)
                response_text = response.text
                
                # 將回應存入緩存
                response_cache[cache_key] = (current_time, user_query, response_text)
                print(f"將回應存入緩存: {cache_key}")
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "quota" in error_str.lower():
                    print(f"主要模型 API 配額限制，嘗試備用模型: {e}")
                    try:
                        # 首先嘗試使用 SDK 的備用模型
                        backup_model = genai.GenerativeModel(BACKUP_MODEL)
                        backup_chat = backup_model.start_chat(history=[])
                        backup_response = backup_chat.send_message(user_query)
                        response_text = backup_response.text
                        print(f"成功使用備用模型: {BACKUP_MODEL}")
                    except Exception as backup_e:
                        # 如果 SDK 的備用模型也失敗，使用直接 REST API 調用
                        print(f"備用模型也失敗，嘗試直接 REST API: {backup_e}")
                        try:
                            response_text = call_gemini_rest_api(user_query)
                            print("成功使用直接 REST API 調用")
                        except Exception as rest_e:
                            response_text = f"很抱歉，所有 AI 服務方式都失敗。請稍後再試。錯誤詳情：{rest_e}"
                else:
                    response_text = f"處理您的請求時發生錯誤：{e}"
                    
                # 即使使用備用模型也將有效結果存入緩存
                if not response_text.startswith("很抱歉"):
                    response_cache[cache_key] = (current_time, user_query, response_text)
        
        # 將回應轉換為語音 (創建新的引擎實例)
        voice_file_path = "static/response.mp3"
        engine = get_tts_engine()
        engine.save_to_file(response_text, voice_file_path)
        engine.runAndWait()
        
        # 添加到聊天歷史
        add_to_chat_history(user_query, response_text)
        
        return jsonify({
            "response_text": response_text,
            "audio_url": voice_file_path
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    os.makedirs("static", exist_ok=True)
    app.run(debug=True)
