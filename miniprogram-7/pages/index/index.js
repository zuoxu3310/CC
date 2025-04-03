// index.js 
const app = getApp()

Page({
  data: {
    active: 0,
    testResult: [],
    recentFiles: []
  },

  onLoad() {
    // 加载本地存储的文件记录
    this.loadRecentFiles();
  },

  // 加载本地存储的文件记录
  loadRecentFiles() {
    const recentFiles = wx.getStorageSync('recentFiles') || [];
    this.setData({ recentFiles });
  },

  // 添加新的文件记录
  addRecentFile(fileName, content) {
    const now = new Date();
    const newFile = {
      id: Date.now(),
      name: fileName,
      date: now.toISOString().split('T')[0]
    };

    // 存储文件内容
    wx.setStorageSync(`file_content_${newFile.id}`, content);

    let recentFiles = wx.getStorageSync('recentFiles') || [];
    // 限制最多保存2个记录
    recentFiles = [newFile, ...recentFiles].slice(0, 2);
    
    // 更新本地存储和页面数据
    wx.setStorageSync('recentFiles', recentFiles);
    this.setData({ recentFiles });
  },

  // 清除最近文件记录
  clearRecentFiles() {
    wx.showModal({
      title: '确认清除',
      content: '是否清除所有最近文件记录？',
      success: (res) => {
        if (res.confirm) {
          // 获取所有文件记录
          const recentFiles = wx.getStorageSync('recentFiles') || [];
          // 清除每个文件的内容
          recentFiles.forEach(file => {
            wx.removeStorageSync(`file_content_${file.id}`);
          });
          // 清除文件列表
          wx.removeStorageSync('recentFiles');
          this.setData({ recentFiles: [] });
          wx.showToast({
            title: '已清除',
            icon: 'success'
          });
        }
      }
    });
  },

  srtTimeToSeconds(time) {
    const match = time.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/)
    if (!match) throw Error(`时间格式错误: ${time}`)

    const hours = Number(match[1])
    const minutes = Number(match[2])
    const seconds = Number(match[3])
    const milliseconds = Number(match[4])

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
  },

  parseSrt(srt) {
    // 移除 BOM 和空白
    srt = srt.replace(/^\uFEFF/, '').trim()
    
    // 按块分割
    const blocks = srt.split(/\r?\n\r?\n/)
    
    return blocks
      .filter(block => block.trim().length > 0) // 过滤空块
      .map(block => {
        const lines = block.split(/\r?\n/).filter(line => line.trim().length > 0)
        if (lines.length < 3) return null // 无效块（至少需要序号+时间轴+1行文本）

        // 查找时间轴行（跳过序号行）
        const timeLine = lines.find(line => 
          line.match(/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/)
        )
        
        if (!timeLine) return null
        
        const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/)
        if (!timeMatch) return null

        // 获取所有文本行（排除序号和时间轴行）
        const textLines = lines.filter(line => 
          line !== timeLine && 
          !/^\d+$/.test(line) // 排除纯数字序号行
        )

        return {
          start: this.srtTimeToSeconds(timeMatch[1]),
          end: this.srtTimeToSeconds(timeMatch[2]),
          text: textLines.join('\n') // 保留原始换行
        }
      })
      .filter(item => item !== null && item.text.length > 0) // 过滤无效条目
  },

  goToPlayer() {
    // 获取文件系统管理器
    const fs = wx.getFileSystemManager()
    
    try {
      // 读取测试字幕文件
      const srtContent = fs.readFileSync(`assets/test`, 'utf8')
      
      const parsedSubtitles = this.parseSrt(srtContent)
      console.log('解析结果：', parsedSubtitles)
      
      if (parsedSubtitles && parsedSubtitles.length > 0) {
        wx.navigateTo({
          url: `/pages/player/player?subtitles=${encodeURIComponent(JSON.stringify(parsedSubtitles))}`
        })
      } else {
        wx.showToast({
          title: '未找到有效字幕',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('读取或解析失败', error)
      wx.showToast({ 
        title: '读取字幕失败',
        icon: 'none'
      })
    }
  },

  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/search'
    })
  },

  // 修改上传方法
  uploadSrt() {
    wx.chooseMessageFile({
      count: 10,
      type: 'all',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].path;
        const fileName = res.tempFiles[0].name;
        
        // 读取文件内容
        wx.getFileSystemManager().readFile({
          filePath: tempFilePath,
          encoding: 'utf8',
          success: (res) => {
            try {
              const srtContent = res.data;
              const parsedSubtitles = this.parseSrt(srtContent);
              console.log('解析结果：', parsedSubtitles);
              
              if (parsedSubtitles && parsedSubtitles.length > 0) {
                // 保存文件记录
                const newFile = {
                  id: Date.now(),
                  name: fileName,
                  date: new Date().toISOString().split('T')[0]
                };
                
                // 保存文件内容
                wx.setStorageSync(`file_content_${newFile.id}`, srtContent);
                
                // 更新文件列表
                let files = wx.getStorageSync('srtFiles') || [];
                files = [newFile, ...files];
                wx.setStorageSync('srtFiles', files);
                
                // 添加到最近文件记录，同时保存文件内容
                this.addRecentFile(fileName, srtContent);
                
                // 显示确认对话框
                wx.showModal({
                  title: '上传成功',
                  content: '是否立即播放字幕？',
                  confirmText: '立即播放',
                  cancelText: '稍后播放',
                  success: (res) => {
                    if (res.confirm) {
                      wx.navigateTo({
                        url: `/pages/player/player?subtitles=${encodeURIComponent(JSON.stringify(parsedSubtitles))}`
                      });
                    } else {
                      wx.showToast({
                        title: '已保存',
                        icon: 'success'
                      });
                    }
                  }
                });
              } else {
                wx.showToast({
                  title: '未找到有效字幕',
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
          },
          fail: (error) => {
            console.error('读取文件失败', error);
            wx.showToast({
              title: '读取文件失败',
              icon: 'none'
            });
          }
        });
      },
      fail: (error) => {
        console.error('选择文件失败', error);
        if (error.errMsg.includes('cancel')) return;
        wx.showToast({
          title: '选择文件失败',
          icon: 'none'
        });
      }
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 0
      })
    }
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
  }
})
