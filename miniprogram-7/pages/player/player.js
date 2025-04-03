Page({
  data: {
    subtitles: [],
    currentSubtitles: [],
    currentTimeStr: '00:00:00',
    durationStr: '00:00:00',
    isPlaying: false,
    startTime: 0,
    duration: 0,
    timer: null,
    isDragging: false,
    subtitleFontSize: 40
  },

  onLoad(options) {
    const subtitles = JSON.parse(decodeURIComponent(options.subtitles))
    const duration = Math.max(...subtitles.map(sub => sub.end))
    
    this.setData({ 
      subtitles,
      duration,
      durationStr: this.formatTime(duration)
    })
  },

  onUnload() {
    this.stopTimer()
    // 恢复竖屏
    wx.setPageOrientation({
      orientation: 'portrait'
    })
  },

  handlePlay() {
    if (this.data.isPlaying) {
      this.stopTimer()
    } else {
      this.startTimer()
    }
    this.setData({ isPlaying: !this.data.isPlaying })
  },

  handleReset() {
    this.stopTimer()
    this.setData({
      currentSubtitles: [],
      currentTimeStr: '00:00:00',
      isPlaying: false,
      startTime: 0
    })
  },

  handleSliderChange(e) {
    const value = e.detail.value
    this.setData({ 
      startTime: value,
      currentTimeStr: this.formatTime(value)
    })
    this.updateSubtitles(value)
    
    if (this.data.isPlaying) {
      this.startTimer()
    }
    this.setData({ isDragging: false })
  },

  handleSliderChanging(e) {
    if (!this.data.isDragging) {
      this.stopTimer()
      this.setData({ isDragging: true })
    }
    const value = e.detail.value
    this.setData({ 
      currentTimeStr: this.formatTime(value)
    })
    this.updateSubtitles(value)
  },

  updateSubtitles(currentTime) {
    // 查找当前时间对应的所有字幕
    const currentSubtitles = this.data.subtitles.filter(
      sub => currentTime >= sub.start && currentTime <= sub.end
    )
    
    // 只有当字幕发生变化时才更新
    if (JSON.stringify(currentSubtitles) !== JSON.stringify(this.data.currentSubtitles)) {
      this.setData({ currentSubtitles }, () => {
        this.adjustSubtitleSize()
      })
    }
  },

  adjustSubtitleSize() {
    const query = wx.createSelectorQuery()
    query.select('.subtitle-wrapper').boundingClientRect()
    query.select('.subtitle-text').boundingClientRect()
    
    query.exec((res) => {
      if (!res[0] || !res[1]) return
      
      const wrapperHeight = res[0].height
      const wrapperWidth = res[0].width
      const textHeight = res[1].height
      const textContent = this.data.currentSubtitles.map(sub => sub.text).join('\n')
      
      // 先获取基本信息
      const lines = textContent.split('\n').length
      const maxCharsPerLine = Math.max(...textContent.split('\n').map(line => line.length))
      const isLandscape = wx.getSystemInfoSync().windowWidth > wx.getSystemInfoSync().windowHeight
      
      // 基础字号固定为40
      let fontSize = 40
      
      // 只有在超过2行或单行字符过多时才调整字号
      if (lines > 2 || maxCharsPerLine > 30) {
        // 1. 根据行数调整
        if (lines > 6) {
          fontSize = Math.min(fontSize, 32)
        } else if (lines > 4) {
          fontSize = Math.min(fontSize, 36)
        } else if (lines > 2) {
          fontSize = Math.min(fontSize, 38)
        }
        
        // 2. 根据单行字符数调整
        if (maxCharsPerLine > 30) {
          fontSize = Math.min(fontSize, 36)
        } else if (maxCharsPerLine > 20) {
          fontSize = Math.min(fontSize, 38)
        }
        
        // 3. 根据容器高度调整
        if (textHeight > wrapperHeight * 0.9) {
          fontSize = Math.floor(fontSize * (wrapperHeight * 0.9) / textHeight)
        }
      }
      
      // 确保字号在合理范围内
      fontSize = Math.max(Math.min(fontSize, 40), 24)
      
      // 设置字号
      this.setData({
        subtitleFontSize: fontSize
      })
    })
  },

  startTimer() {
    this.stopTimer() // 确保没有多个计时器运行
    const startTimestamp = Date.now() - (this.data.startTime * 1000)
    
    this.data.timer = setInterval(() => {
      const currentTime = (Date.now() - startTimestamp) / 1000
      
      // 检查是否播放完成
      if (currentTime > this.data.duration) {
        this.handleReset()
        return
      }

      this.setData({
        startTime: currentTime,
        currentTimeStr: this.formatTime(currentTime)
      })
      
      this.updateSubtitles(currentTime)
    }, 100)
  },

  stopTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
      this.data.timer = null
    }
  },

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  },

  handleBack() {
    wx.navigateBack()
  },

  handleForward() {
    const newTime = Math.min(this.data.startTime + 5, this.data.duration)
    this.setData({ 
      startTime: newTime,
      currentTimeStr: this.formatTime(newTime)
    })
    this.updateSubtitles(newTime)
    
    if (this.data.isPlaying) {
      this.startTimer()
    }
  },

  handleBackward() {
    const newTime = Math.max(this.data.startTime - 5, 0)
    this.setData({ 
      startTime: newTime,
      currentTimeStr: this.formatTime(newTime)
    })
    this.updateSubtitles(newTime)
    
    if (this.data.isPlaying) {
      this.startTimer()
    }
  },

  onReady() {
    // 使用正确的 API 设置屏幕方向
    wx.setPageOrientation({
      orientation: 'auto'
    })
  },

  // 监听屏幕旋转
  onResize() {
    // 延迟执行以确保布局已更新
    setTimeout(() => {
      this.adjustSubtitleSize()
    }, 300)
  }
}) 