// 导出初始化函数，供 AiAssistant 组件调用
export function initChat() {
  // 1. 基础变量初始化
  const recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isRecognitionSupported = !!recognition; // 检测浏览器是否支持语音识别
  let speechRecognition = null; // 语音识别实例
  let mediaRecorder = null; // 录音实例
  let audioChunks = []; // 录音数据片段
  let isRecording = false; // 录音状态标记
  let recordingStartTime = 0; // 录音开始时间

  // 2. 获取 DOM 元素（确保组件已渲染，DOM 存在）
  const voiceBtn = document.getElementById('voice-btn');
  const sendBtn = document.getElementById('send-btn');
  const userInput = document.getElementById('user-input');
  const chatMessages = document.getElementById('chat-messages');
  const recordingToast = document.getElementById('recording-toast');

  // 3. 浏览器兼容性处理（不支持则禁用按钮）
  if (!isRecognitionSupported) {
    voiceBtn.disabled = true;
    voiceBtn.title = "您的浏览器不支持语音功能（建议使用 Chrome/Edge）";
    return; // 终止初始化
  }

  // 4. 绑定事件（避免组件重渲染时重复绑定）
  if (!voiceBtn.dataset.eventBound) {
    // 文本消息发送（点击/回车）
    sendBtn.addEventListener('click', sendTextMessage);
    userInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendTextMessage());

    // 语音按钮事件（按住录音/松开停止/移出停止）
    voiceBtn.addEventListener('mousedown', startRecording);
    voiceBtn.addEventListener('mouseup', stopRecording);
    voiceBtn.addEventListener('mouseleave', () => isRecording && stopRecording());

    voiceBtn.dataset.eventBound = 'true'; // 标记已绑定事件，防止重复
  }

  // ------------------------------
  // 5. 核心功能函数
  // ------------------------------

  /**
   * 发送文本消息
   */
  function sendTextMessage() {
    const text = userInput.value.trim();
    if (!text) return; // 空消息不发送

    // 添加用户文本消息到界面
    addMessage({ type: 'text', content: text, sender: 'user' });
    userInput.value = ''; // 清空输入框

    // 模拟机器人回复（实际项目可替换为接口请求）
    setTimeout(() => {
      addMessage({ type: 'text', content: `收到你的消息：${text}`, sender: 'bot' });
    }, 1000);
  }

  /**
   * 开始录音
   */
  async function startRecording() {
    if (isRecording) return; // 防止重复开始

    try {
      // 获取麦克风权限（必须在 HTTPS/localhost 环境下）
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 初始化录音实例
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = []; // 清空历史录音数据
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data); // 收集录音片段
      mediaRecorder.start(); // 开始录音

      // 初始化语音识别实例
      speechRecognition = new recognition();
      speechRecognition.lang = 'zh-CN'; // 识别中文
      speechRecognition.interimResults = false; // 只返回最终结果
      speechRecognition.start(); // 开始识别

      // 更新状态
      recordingStartTime = Date.now();
      isRecording = true;
      voiceBtn.classList.add('recording'); // 按钮变红
      recordingToast.classList.add('active'); // 显示录音提示
    } catch (err) {
      console.error('录音启动失败:', err);
      alert(err.message.includes('permission') ? '请允许麦克风权限后重试' : '录音功能异常');
    }
  }

  /**
   * 停止录音并处理结果
   */
  function stopRecording() {
    if (!isRecording || !mediaRecorder) return;

    // 计算录音时长（过滤 <1 秒的短录音）
    const duration = Math.round((Date.now() - recordingStartTime) / 1000);
    if (duration < 1) {
      resetRecordingState();
      alert('录音时间太短，请至少录制1秒');
      return;
    }

    // 停止录音
    mediaRecorder.stop();
    mediaRecorder.onstop = () => {
      // 生成音频 Blob 和临时 URL（用于播放）
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // 处理语音识别结果
      let transcript = '语音转文字失败';
      speechRecognition.onresult = (event) => {
        transcript = event.results[0][0].transcript; // 获取识别文本
      };

      // 停止识别并发送语音消息
      speechRecognition.stop();
      speechRecognition.onend = () => {
        addMessage({
          type: 'voice',
          content: { audioUrl, duration, transcript },
          sender: 'user'
        });

        // 模拟机器人回复（实际项目可替换为接口请求）
        setTimeout(() => {
          addMessage({ type: 'text', content: `你说的是：${transcript}`, sender: 'bot' });
        }, 1000);

        resetRecordingState(); // 重置录音状态
      };
    };
  }

  /**
   * 重置录音状态
   */
  function resetRecordingState() {
    isRecording = false;
    voiceBtn.classList.remove('recording');
    recordingToast.classList.remove('active');
    mediaRecorder = null;
    speechRecognition = null;
  }

  /**
   * 添加消息到界面（支持文本/语音类型）
   * @param {Object} msg - 消息对象
   * @param {string} msg.type - 消息类型（text/voice）
   * @param {string|Object} msg.content - 消息内容（文本/语音信息）
   * @param {string} msg.sender - 发送者（user/bot）
   */
  function addMessage(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.sender}-message`;

    // 文本消息结构
    if (msg.type === 'text') {
      messageDiv.innerHTML = `
        <div class="message-bubble">${msg.content}</div>
      `;
    }

    // 语音消息结构（带播放按钮、波形、时长、转文字）
    if (msg.type === 'voice') {
      messageDiv.innerHTML = `
        <div class="message-bubble voice-message" data-audio="${msg.content.audioUrl}">
          <div class="voice-icon">▶</div>
          <div class="voice-wave">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="voice-duration">${msg.content.duration}″</div>
        </div>
        <div class="transcript">${msg.content.transcript}</div>
      `;

      // 绑定语音播放/暂停事件
      const voiceElement = messageDiv.querySelector('.voice-message');
      const audio = new Audio(msg.content.audioUrl);
      const voiceIcon = voiceElement.querySelector('.voice-icon');
      const voiceWave = voiceElement.querySelector('.voice-wave');

      voiceElement.addEventListener('click', () => {
        if (audio.paused) {
          audio.play();
          voiceIcon.textContent = '⏸';
          voiceWave.style.display = 'flex'; // 显示波形动画
        } else {
          audio.pause();
          voiceIcon.textContent = '▶';
          voiceWave.style.display = 'none'; // 隐藏波形动画
        }
      });

      // 播放结束重置状态
      audio.onended = () => {
        voiceIcon.textContent = '▶';
        voiceWave.style.display = 'none';
      };
    }

    // 添加消息到列表并滚动到底部
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}