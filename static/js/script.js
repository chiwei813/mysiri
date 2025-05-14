document.addEventListener('DOMContentLoaded', function() {
    const chatContainer = document.getElementById('chat-container');
    const textInput = document.getElementById('text-input');
    const sendButton = document.getElementById('send-text');
    const voiceButton = document.getElementById('voice-input');
    const micIcon = document.getElementById('mic-icon');
    const recordingStatus = document.getElementById('recording-status');
    const responseAudio = document.getElementById('response-audio');
    
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    
    // 初始化語音錄制
    async function initializeRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // 檢查支援的音頻格式
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/webm')) {
                mimeType = 'audio/webm';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                mimeType = 'audio/ogg';
            }
            
            console.log('使用音頻格式:', mimeType);
            mediaRecorder = new MediaRecorder(stream, { mimeType });
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = sendAudioToServer;
            
            return true;
        } catch (err) {
            console.error('無法獲取麥克風權限:', err);
            addMessage('系統無法獲取麥克風權限，請確認瀏覽器設置。', 'system-message');
            return false;
        }
    }
    
    // 添加消息到聊天窗口
    function addMessage(text, className) {
        const message = document.createElement('div');
        message.className = `message ${className}`;
        message.textContent = text;
        chatContainer.appendChild(message);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // 發送文本消息
    async function sendTextMessage() {
        const text = textInput.value.trim();
        if (!text) return;
        
        addMessage(text, 'user-message');
        textInput.value = '';
        
        // 顯示加載中狀態
        const loadingId = showLoading();
        
        try {
            const response = await fetch('/text_input', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text })
            });
            
            // 隱藏加載中狀態
            hideLoading(loadingId);
            
            const data = await response.json();
            
            if (data.error) {
                // 檢查是否是配額限制錯誤
                if (data.error.includes('429') || data.error.toLowerCase().includes('quota')) {
                    addMessage(`API 配額限制: ${data.error}`, 'system-message error-message');
                    addMessage('提示: 您可能已達到免費 API 使用限額。請稍後再試或考慮升級至付費計劃。', 'system-message');
                } else {
                    addMessage(`錯誤: ${data.error}`, 'system-message error-message');
                }
            } else {
                addMessage(data.response_text, 'system-message');
                if (data.audio_url) {
                    playResponseAudio(data.audio_url);
                }
            }
        } catch (error) {
            // 隱藏加載中狀態
            hideLoading(loadingId);
            
            console.error('發送文本出錯:', error);
            addMessage('發送失敗，請稍後再試。', 'system-message error-message');
        }
    }
    
    // 顯示加載中狀態
    function showLoading() {
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'message system-message loading-message';
        loadingMessage.textContent = '正在處理請求...';
        chatContainer.appendChild(loadingMessage);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return Date.now(); // 返回唯一 ID
    }
    
    // 隱藏加載中狀態
    function hideLoading(id) {
        const loadingMessages = document.querySelectorAll('.loading-message');
        loadingMessages.forEach(msg => {
            chatContainer.removeChild(msg);
        });
    }
    
    // 發送錄音到服務器
    async function sendAudioToServer() {
        if (audioChunks.length === 0) return;
        
        voiceButton.classList.remove('recording');
        micIcon.style.display = 'inline';
        recordingStatus.style.display = 'none';
        
        // 獲取適當的 MIME 類型
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg';
        }
        
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        audioChunks = [];
        
        // 創建一個表單數據對象
        const formData = new FormData();
        formData.append('audio', audioBlob, `recording.${mimeType.split('/')[1]}`);
        
        // 顯示加載中狀態
        const loadingId = showLoading();
        
        try {
            const response = await fetch('/process_audio', {
                method: 'POST',
                body: formData
            });
            
            // 隱藏加載中狀態
            hideLoading(loadingId);
            
            const data = await response.json();
            
            if (data.error) {
                // 檢查是否是配額限制錯誤
                if (data.error.includes('429') || data.error.toLowerCase().includes('quota')) {
                    addMessage(`API 配額限制: ${data.error}`, 'system-message error-message');
                    addMessage('提示: 您可能已達到免費 API 使用限額。請稍後再試或考慮升級至付費計劃。', 'system-message');
                } else {
                    addMessage(`錯誤: ${data.error}`, 'system-message error-message');
                }
            } else {
                if (data.input_text) {
                    // 將識別的語音文字填入輸入框
                    textInput.value = data.input_text;
                    
                    addMessage(data.input_text, 'user-message');
                }
                addMessage(data.response_text, 'system-message');
                if (data.audio_url) {
                    playResponseAudio(data.audio_url);
                }
            }
        } catch (error) {
            // 隱藏加載中狀態
            hideLoading(loadingId);
            
            console.error('發送音頻出錯:', error);
            addMessage('發送失敗，請稍後再試。', 'system-message error-message');
        }
    }
    
    // 播放回應音頻
    function playResponseAudio(audioUrl) {
        responseAudio.src = audioUrl + '?t=' + new Date().getTime(); // 防止緩存
        responseAudio.play();
    }
    
    // 切換錄音狀態
    async function toggleRecording() {
        if (isRecording) {
            mediaRecorder.stop();
            isRecording = false;
        } else {
            if (!mediaRecorder && !(await initializeRecording())) {
                return;
            }
            
            audioChunks = [];
            mediaRecorder.start();
            isRecording = true;
            voiceButton.classList.add('recording');
            micIcon.style.display = 'none';
            recordingStatus.style.display = 'inline';
            
            // 添加自動停止錄音（最長10秒）
            setTimeout(() => {
                if (isRecording) {
                    mediaRecorder.stop();
                    isRecording = false;
                }
            }, 10000);
        }
    }
    
    // 事件監聽器
    sendButton.addEventListener('click', sendTextMessage);
    
    textInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            sendTextMessage();
        }
    });
    
    voiceButton.addEventListener('click', toggleRecording);
    
    // 初始化麥克風
    initializeRecording();
});
