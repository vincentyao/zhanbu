const app = getApp();

Page({
  data: {
    messages: [],
    inputValue: '',
    sendButtonDisabled: true,
    isTyping: false,
    typingMessage: '',
    scrollViewId: '',
    retryCount: 0,
    maxRetries: 3,
    requestTask: null,
    pollInterval: null
  },

  onLoad: function() {
    console.log('Page loaded');
  },

  onUnload: function() {
    this.clearConnection();
  },

  clearConnection: function() {
    if (this.data.requestTask) {
      this.data.requestTask.abort();
    }
    if (this.data.pollInterval) {
      clearInterval(this.data.pollInterval);
    }
  },

  onInput: function(e) {
    this.setData({
      inputValue: e.detail.value,
      sendButtonDisabled: e.detail.value.trim() === ''
    });
  },

  onSend: function() {
    console.log('onSend function called');
    if (this.data.inputValue.trim() === '') return;

    const userInput = this.data.inputValue.trim();
    this.addMessage(userInput, true);

    const userMessages = this.data.messages
      .filter(message => message.isUser)
      .map(message => message.content);

    if (userMessages.length === 0) {
      userMessages.push(userInput);
    }

    this.setData({
      inputValue: '',
      sendButtonDisabled: true
    });

    console.log('Sending user messages to backend:', userMessages);
    this.sendToBackend(userMessages);
  },

  addMessage: function(message, isUser, isError = false) {
    const newMessages = [...this.data.messages, {
      content: message,
      isUser: isUser,
      isError: isError
    }];
    
    this.setData({
      messages: newMessages,
      scrollViewId: `msg-${newMessages.length - 1}`
    }, () => {
      this.scrollToBottom();
    });
  },

  scrollToBottom: function() {
    wx.nextTick(() => {
      this.setData({
        scrollViewId: `msg-${this.data.messages.length - 1}`
      });
    });
  },

  sendToBackend: function(userMessages) {
    console.log('sendToBackend called with userMessages:', userMessages);

    const url = 'http://8.134.182.21:8089/completions/stream';
    const data = {
      sessionId: "",
      category: "astrology",
      messages: userMessages
    };

    console.log('Sending data to backend:', data);

    this.setData({ isTyping: true, typingMessage: '' });

    this.clearConnection(); // 清除之前的连接
    this.makeRequest(url, data);
  },

  makeRequest: function(url, data) {
    const requestTask = wx.request({
      url: url,
      method: 'POST',
      data: data,
      header: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive'
      },
      responseType: 'text',
      timeout: 30000, // 30 秒超时
      success: (res) => {
        console.log('Backend API response received:', res);
        if (res.statusCode === 200) {
          console.log('Response data:', res.data);
          this.processResponse(res.data);
          this.setData({ retryCount: 0 }); // 重置重试计数
          this.startPolling(url, data); // 开始轮询
        } else {
          console.error('Unexpected API response:', res);
          this.handleRequestError('Unexpected API response', url, data);
        }
      },
      fail: (error) => {
        console.error('API request failed:', error);
        this.handleRequestError(error.errMsg, url, data);
      },
      complete: () => {
        console.log('Request complete');
        this.setData({ isTyping: false });
        if (this.data.typingMessage) {
          this.addMessage(this.data.typingMessage, false);
          this.setData({ typingMessage: '' });
        }
      }
    });

    this.setData({ requestTask: requestTask });
  },

  startPolling: function(url, data) {
    // 每 30 秒发送一次轻量级请求以保持连接活跃
    this.data.pollInterval = setInterval(() => {
      wx.request({
        url: url,
        method: 'HEAD',
        header: {
          'Connection': 'keep-alive'
        },
        success: (res) => {
          console.log('Polling successful, connection kept alive');
        },
        fail: (error) => {
          console.error('Polling failed:', error);
          this.clearConnection();
        }
      });
    }, 30000);
  },

  handleRequestError: function(errorMessage, url, data) {
    if (this.data.retryCount < this.data.maxRetries) {
      console.log(`Retrying request (${this.data.retryCount + 1}/${this.data.maxRetries})`);
      this.setData({ retryCount: this.data.retryCount + 1 });
      setTimeout(() => {
        this.makeRequest(url, data);
      }, 2000); // 等待 2 秒后重试
    } else {
      this.addMessage(`Sorry, there was an error fetching the response. Error: ${errorMessage}`, false, true);
      this.setData({ retryCount: 0 }); // 重置重试计数
      this.clearConnection();
    }
  },

  processResponse: function(response) {
    const lines = response.split('\n');
    let newContent = '';

    for (const line of lines) {
      if (line.startsWith('data:')) {
        const content = line.slice(5).trim();
        if (content === '[DONE]') {
          console.log('Stream completed');
          break;
        }
        newContent += content;
      }
    }

    if (newContent) {
      this.updateTypingMessage(this.data.typingMessage + newContent);
    }
  },

  updateTypingMessage: function(message) {
    this.setData({ typingMessage: message }, () => {
      this.scrollToBottom();
    });
  }
});
