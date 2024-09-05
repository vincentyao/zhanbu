const app = getApp()

Page({
  data: {
    messages: [],
    inputValue: '',
    sendButtonDisabled: true,
    zodiacSigns: ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座']
  },

  onLoad: function() {
    console.log('Page loaded');
  },

  onInput: function(e) {
    this.setData({
      inputValue: e.detail.value,
      sendButtonDisabled: e.detail.value.trim() === ''
    });
  },

  onSend: function() {
    if (this.data.inputValue.trim() === '') return;

    const userInput = this.data.inputValue.trim();
    this.addMessage(userInput, true);

    if (this.isValidZodiacSign(userInput)) {
      this.setData({
        inputValue: '',
        sendButtonDisabled: true
      });
      this.getHoroscopeFromAPI(userInput);
    } else {
      const errorMessage = "输入错误，请重新输入：白羊座、金牛座、双子座、巨蟹座、狮子座、处女座、天秤座、天蝎座、射手座、摩羯座、水瓶座、双鱼座";
      this.addMessage(errorMessage, false, true);
    }
  },

  addMessage: function(message, isUser, isError = false) {
    const messages = this.data.messages;
    messages.push({
      content: message,
      isUser: isUser,
      isError: isError
    });
    this.setData({
      messages: messages
    });
  },

  isValidZodiacSign: function(sign) {
    return this.data.zodiacSigns.includes(sign);
  },

  getHoroscopeFromAPI: function(sign) {
    console.log('Fetching horoscope for:', sign);
    const signInEnglish = this.getEnglishSign(sign);
    console.log('English sign:', signInEnglish);

    const encodedSign = encodeURIComponent(signInEnglish);
    const url = `https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=${encodedSign}&day=TODAY`;

    wx.request({
      url: url,
      method: 'GET',
      header: {
        'accept': 'application/json',
        'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8'
      },
      success: (res) => {
        console.log('API response:', res);
        if (res.statusCode === 200 && res.data && res.data.data && res.data.data.horoscope_data) {
          const horoscope = res.data.data.horoscope_data;
          const horoscopeMessage = `${sign}今日运势：\n\n${horoscope}`;
          this.addMessage(horoscopeMessage, false);
        } else {
          this.addMessage("抱歉，获取运势信息时出现错误。请稍后再试。", false, true);
        }
      },
      fail: (error) => {
        console.error('API request failed:', error);
        console.error('Error details:', error.errMsg);
        this.addMessage(`抱歉，获取运势信息时出现错误。错误信息: ${error.errMsg}`, false, true);
      }
    });
  },

  getEnglishSign: function(chineseSign) {
    const signMap = {
      '白羊座': 'Aries',
      '金牛座': 'Taurus',
      '双子座': 'Gemini',
      '巨蟹座': 'Cancer',
      '狮子座': 'Leo',
      '处女座': 'Virgo',
      '天秤座': 'Libra',
      '天蝎座': 'Scorpio',
      '射手座': 'Sagittarius',
      '摩羯座': 'Capricorn',
      '水瓶座': 'Aquarius',
      '双鱼座': 'Pisces'
    };
    return signMap[chineseSign];
  }
})