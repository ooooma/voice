// 等待页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 语音识别和录音相关变量
    const recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isRecognitionSupported = !!recognition;
    let speechRecognition = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let recordingStartTime = 0;

    // DOM 元素
    const voiceBtn = document.getElementById('voice-btn');
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const recordingToast = document.getElementById('recording-toast');

    // 初始化
    if (!isRecognitionSupported) {
        voiceBtn.disabled = true;
        voiceBtn.title = "您的浏览器不支持语音功能";
    }

    // 文本消息发送
    sendBtn.addEventListener('click', sendTextMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendTextMessage();
    });

    // 语音按钮事件 - 按住开始，松开结束
    voiceBtn.addEventListener('mousedown', startRecording);
    voiceBtn.addEventListener('mouseup', stopRecording);
    voiceBtn.addEventListener('mouseleave', () => {
        if (isRecording) stopRecording();
    });

    // 发送文本消息
    function sendTextMessage() {
        const text = userInput.value.trim();
        if (!text) return;
        
        addTextMessage(text, 'user');
        userInput.value = '';
        
        // 模拟回复
        setTimeout(() => {
            addTextMessage(`收到你的消息：${text}`, 'bot');
        }, 1000);
    }

    // 开始录音
    async function startRecording() {
        if (!isRecognitionSupported || isRecording) return;

        try {
            // 获取麦克风权限
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // 初始化录音和识别
            mediaRecorder = new MediaRecorder(stream);
            speechRecognition = new recognition();
            speechRecognition.lang = 'zh-CN';
            speechRecognition.interimResults = false;

            // 开始录音
            audioChunks = [];
            mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
            mediaRecorder.start();
            
            // 开始语音识别
            speechRecognition.start();
            
            // 记录开始时间
            recordingStartTime = Date.now();
            isRecording = true;

            // 更新UI
            voiceBtn.classList.add('recording');
            recordingToast.classList.add('active');
        } catch (err) {
            console.error('录音启动失败:', err);
            alert('请允许麦克风权限后重试');
        }
    }

    // 停止录音并发送
    function stopRecording() {
        if (!isRecording || !mediaRecorder) return;

        // 计算录音时长
        const duration = Math.round((Date.now() - recordingStartTime) / 1000);
        if (duration < 1) {
            // 过滤太短的录音
            resetRecordingState();
            alert('录音时间太短');
            return;
        }

        // 停止录音
        mediaRecorder.stop();
        mediaRecorder.onstop = async () => {
            // 创建音频Blob
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // 处理语音识别结果
            let transcript = '语音转文字失败';
            speechRecognition.onresult = (event) => {
                transcript = event.results[0][0].transcript;
            };

            // 停止识别
            speechRecognition.stop();
            speechRecognition.onend = () => {
                // 添加语音消息到聊天记录
                addVoiceMessage(audioUrl, duration, transcript, 'user');
                
                // 模拟回复
                setTimeout(() => {
                    addTextMessage(`你说的是：${transcript}`, 'bot');
                }, 1000);

                resetRecordingState();
            };
        };
    }

    // 重置录音状态
    function resetRecordingState() {
        isRecording = false;
        voiceBtn.classList.remove('recording');
        recordingToast.classList.remove('active');
        mediaRecorder = null;
        speechRecognition = null;
    }

    // 添加文本消息
    function addTextMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.innerHTML = `
            <div class="message-bubble">${text}</div>
        `;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    // 添加语音消息
    function addVoiceMessage(audioUrl, duration, transcript, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        // 语音消息HTML结构
        messageDiv.innerHTML = `
            <div class="message-bubble voice-message" data-audio="${audioUrl}">
                <div class="voice-icon">▶</div>
                <div class="voice-wave">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <div class="voice-duration">${duration}″</div>
            </div>
            <div class="transcript">${transcript}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();

        // 添加语音播放功能
        const voiceElement = messageDiv.querySelector('.voice-message');
        const audio = new Audio(audioUrl);
        const voiceIcon = voiceElement.querySelector('.voice-icon');
        const voiceWave = voiceElement.querySelector('.voice-wave');

        voiceElement.addEventListener('click', () => {
            if (audio.paused) {
                audio.play();
                voiceIcon.textContent = '⏸';
                voiceWave.style.display = 'flex';
            } else {
                audio.pause();
                voiceIcon.textContent = '▶';
                voiceWave.style.display = 'none';
            }
        });

        audio.onended = () => {
            voiceIcon.textContent = '▶';
            voiceWave.style.display = 'none';
        };
    }

    // 滚动到底部
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});