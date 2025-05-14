// Voice settings management
document.addEventListener('DOMContentLoaded', function() {
    // 設置默認值
    const defaultSettings = {
        volume: 1.0,   // 音量 (0.0 - 1.0)
        rate: 1.0,     // 語速 (0.5 - 2.0)
        pitch: 1.0     // 音調 (0.5 - 2.0)
    };
    
    // 從本地存儲加載設置，如果沒有則使用默認設置
    let voiceSettings = JSON.parse(localStorage.getItem('voiceSettings')) || defaultSettings;
    
    // 創建設置面板
    function createSettingsPanel() {
        const settingsPanel = document.createElement('div');
        settingsPanel.className = 'settings-panel';
        settingsPanel.innerHTML = `
            <div class="settings-header">
                <h4>語音設置</h4>
                <button id="close-settings">×</button>
            </div>
            <div class="settings-body">
                <div class="setting-item">
                    <label for="volume-slider">音量:</label>
                    <input type="range" id="volume-slider" min="0" max="1" step="0.1" value="${voiceSettings.volume}">
                    <span id="volume-value">${voiceSettings.volume}</span>
                </div>
                <div class="setting-item">
                    <label for="rate-slider">語速:</label>
                    <input type="range" id="rate-slider" min="0.5" max="2" step="0.1" value="${voiceSettings.rate}">
                    <span id="rate-value">${voiceSettings.rate}</span>
                </div>
                <div class="setting-item">
                    <label for="pitch-slider">音調:</label>
                    <input type="range" id="pitch-slider" min="0.5" max="2" step="0.1" value="${voiceSettings.pitch}">
                    <span id="pitch-value">${voiceSettings.pitch}</span>
                </div>
                <div class="settings-buttons">
                    <button id="save-settings" class="btn btn-primary">保存</button>
                    <button id="reset-settings" class="btn btn-secondary">恢復默認</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(settingsPanel);
        settingsPanel.style.display = 'none';
        
        // 添加設置面板的事件監聽器
        document.getElementById('volume-slider').addEventListener('input', function(e) {
            document.getElementById('volume-value').textContent = e.target.value;
        });
        
        document.getElementById('rate-slider').addEventListener('input', function(e) {
            document.getElementById('rate-value').textContent = e.target.value;
        });
        
        document.getElementById('pitch-slider').addEventListener('input', function(e) {
            document.getElementById('pitch-value').textContent = e.target.value;
        });
        
        document.getElementById('save-settings').addEventListener('click', function() {
            saveSettings();
            toggleSettingsPanel();
        });
        
        document.getElementById('reset-settings').addEventListener('click', function() {
            resetSettings();
        });
        
        document.getElementById('close-settings').addEventListener('click', function() {
            toggleSettingsPanel();
        });
        
        return settingsPanel;
    }
    
    // 保存設置到本地存儲
    function saveSettings() {
        voiceSettings = {
            volume: parseFloat(document.getElementById('volume-slider').value),
            rate: parseFloat(document.getElementById('rate-slider').value),
            pitch: parseFloat(document.getElementById('pitch-slider').value)
        };
        localStorage.setItem('voiceSettings', JSON.stringify(voiceSettings));
        
        // 發送設置到伺服器
        updateServerSettings();
    }
    
    // 重置設置為默認值
    function resetSettings() {
        voiceSettings = { ...defaultSettings };
        
        document.getElementById('volume-slider').value = voiceSettings.volume;
        document.getElementById('volume-value').textContent = voiceSettings.volume;
        
        document.getElementById('rate-slider').value = voiceSettings.rate;
        document.getElementById('rate-value').textContent = voiceSettings.rate;
        
        document.getElementById('pitch-slider').value = voiceSettings.pitch;
        document.getElementById('pitch-value').textContent = voiceSettings.pitch;
        
        localStorage.setItem('voiceSettings', JSON.stringify(voiceSettings));
        
        // 發送設置到伺服器
        updateServerSettings();
    }
    
    // 將設置同步到伺服器
    function updateServerSettings() {
        fetch('/update_voice_settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(voiceSettings)
        })
        .then(response => response.json())
        .then(data => {
            console.log('設置已更新:', data);
        })
        .catch(error => {
            console.error('更新設置失敗:', error);
        });
    }
    
    // 創建設置按鈕
    function createSettingsButton() {
        const settingsButton = document.createElement('button');
        settingsButton.className = 'settings-button btn btn-light';
        settingsButton.innerHTML = '⚙️';
        settingsButton.title = '語音設置';
        
        document.querySelector('.container').appendChild(settingsButton);
        
        settingsButton.addEventListener('click', function() {
            toggleSettingsPanel();
        });
    }
    
    // 切換設置面板的顯示/隱藏
    function toggleSettingsPanel() {
        const settingsPanel = document.querySelector('.settings-panel');
        if (settingsPanel.style.display === 'none') {
            settingsPanel.style.display = 'block';
        } else {
            settingsPanel.style.display = 'none';
        }
    }
    
    // 初始化時發送當前設置到伺服器
    function initSettings() {
        // 創建設置面板和按鈕
        createSettingsPanel();
        createSettingsButton();
        
        // 發送設置到伺服器
        updateServerSettings();
    }
    
    // 初始化
    initSettings();
});
