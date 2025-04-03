// pages/files/files.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    files: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadFiles();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时重新加载文件列表
    this.loadFiles();
    
    // 设置底部tabbar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 1
      });
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 加载文件列表
  loadFiles() {
    const files = wx.getStorageSync('srtFiles') || [];
    this.setData({ files });
  },

  // 处理文件点击
  handleFileClick(e) {
    const file = e.currentTarget.dataset.file;
    
    // 显示确认对话框
    wx.showModal({
      title: '打开文件',
      content: '是否立即播放字幕？',
      confirmText: '立即播放',
      cancelText: '稍后播放',
      success: (res) => {
        if (res.confirm) {
          // 读取文件内容并播放
          this.playFile(file);
        }
      }
    });
  },

  // 长按删除文件
  handleLongPress(e) {
    const file = e.currentTarget.dataset.file;
    
    wx.showModal({
      title: '确认删除',
      content: '是否删除该文件？',
      success: (res) => {
        if (res.confirm) {
          // 删除文件内容
          wx.removeStorageSync(`file_content_${file.id}`);
          
          // 更新文件列表
          let files = this.data.files.filter(item => item.id !== file.id);
          wx.setStorageSync('srtFiles', files);
          this.setData({ files });
          
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 播放文件
  playFile(file) {
    // 从本地存储获取文件内容
    const fileContent = wx.getStorageSync(`file_content_${file.id}`);
    
    if (fileContent) {
      try {
        const parsedSubtitles = this.parseSrt(fileContent);
        if (parsedSubtitles && parsedSubtitles.length > 0) {
          wx.navigateTo({
            url: `/pages/player/player?subtitles=${encodeURIComponent(JSON.stringify(parsedSubtitles))}`
          });
        } else {
          wx.showToast({
            title: '字幕内容无效',
            icon: 'none'
          });
        }
      } catch (error) {
        console.error('解析失败', error);
        wx.showToast({
          title: '字幕解析失败',
          icon: 'none'
        });
      }
    } else {
      wx.showToast({
        title: '文件内容不存在',
        icon: 'none'
      });
    }
  },

  // SRT解析方法
  srtTimeToSeconds(time) {
    const match = time.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!match) throw Error(`时间格式错误: ${time}`);

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    const milliseconds = Number(match[4]);

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  },

  parseSrt(srt) {
    // 移除 BOM 和空白
    srt = srt.replace(/^\uFEFF/, '').trim();
    
    // 按块分割
    const blocks = srt.split(/\r?\n\r?\n/);
    
    return blocks
      .filter(block => block.trim().length > 0) // 过滤空块
      .map(block => {
        const lines = block.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 3) return null; // 无效块

        // 查找时间轴行
        const timeLine = lines.find(line => 
          line.match(/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/)
        );
        
        if (!timeLine) return null;
        
        const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
        if (!timeMatch) return null;

        // 获取所有文本行
        const textLines = lines.filter(line => 
          line !== timeLine && 
          !/^\d+$/.test(line)
        );

        return {
          start: this.srtTimeToSeconds(timeMatch[1]),
          end: this.srtTimeToSeconds(timeMatch[2]),
          text: textLines.join('\n')
        };
      })
      .filter(item => item !== null && item.text.length > 0);
  }
})