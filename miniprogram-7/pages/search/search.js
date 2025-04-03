Page({
  data: {
    searchValue: '',
    searchHistory: [],
    searchResults: []
  },

  onLoad() {
    // 加载搜索历史
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ searchHistory: history });
  },

  onSearchInput(e) {
    this.setData({
      searchValue: e.detail
    });
  },

  onSearch(e) {
    const keyword = e.detail.trim();
    if (keyword) {
      this.doSearch(keyword);
    }
  },

  clearHistory() {
    wx.showModal({
      title: '确认清除',
      content: '是否清除搜索历史？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('searchHistory');
          this.setData({ searchHistory: [] });
        }
      }
    });
  },

  onHistoryTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ searchValue: keyword });
    this.doSearch(keyword);
  },

  async doSearch(keyword) {
    // 保存搜索历史
    let history = wx.getStorageSync('searchHistory') || [];
    if (!history.includes(keyword)) {
      history = [keyword, ...history].slice(0, 10);
      wx.setStorageSync('searchHistory', history);
      this.setData({ searchHistory: history });
    }

    try {
      wx.showLoading({ title: '搜索中...' });

      // 构建搜索参数
      const searchParams = {
        id: keyword,
        format: 'srt',
        language: 'zh,zh-CN' // 使用标准的语言代码格式，同时搜索简体中文和中文
      };

      // 如果关键词包含季和集信息，添加相应参数
      if (keyword.includes('S') && keyword.includes('E')) {
        const match = keyword.match(/S(\d+)E(\d+)/i);
        if (match) {
          searchParams.season = match[1];
          searchParams.episode = match[2];
          searchParams.id = keyword.split('S')[0].trim(); // 提取剧集ID
        }
      }

      const result = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://sub.wyzie.ru/search',
          method: 'GET',
          data: searchParams,
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        });
      });

      const data = result.data;
      console.log('API响应数据:', data);
      
      if (data && data.length > 0) {
        this.setData({
          searchResults: data.map(item => ({
            id: item.id,
            url: item.url,
            format: item.format,
            title: item.media,
            language: item.language,
            // 添加更多有用的信息
            isHearingImpaired: item.isHearingImpaired,
            flagUrl: item.flagUrl
          }))
        });
      } else {
        this.setData({ searchResults: [] });
        wx.showToast({ 
          title: '未找到中文字幕，请检查ID是否正确',
          icon: 'none',
          duration: 2000
        });
      }

    } catch (error) {
      console.error('搜索出错:', error);
      wx.showToast({ title: '搜索失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 处理字幕点击
  handleSubtitleClick(e) {
    const subtitle = e.currentTarget.dataset.subtitle;
    
    wx.showModal({
      title: '下载字幕',
      content: `是否下载 ${subtitle.title} 的字幕文件？`,
      success: (res) => {
        if (res.confirm) {
          this.downloadSubtitle(subtitle);
        }
      }
    });
  },

  // 下载字幕
  async downloadSubtitle(subtitle) {
    try {
      wx.showLoading({ title: '下载中...' });

      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: subtitle.url,
          method: 'GET',
          responseType: 'text',
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        });
      });

      if (response.statusCode === 200 && response.data) {
        // 生成唯一ID
        const fileId = Date.now().toString();
        
        // 保存文件内容
        wx.setStorageSync(`file_content_${fileId}`, response.data);
        
        // 获取现有文件列表
        let files = wx.getStorageSync('srtFiles') || [];
        
        // 添加新文件信息
        const newFile = {
          id: fileId,
          name: subtitle.title,
          date: new Date().toLocaleDateString(),
          format: subtitle.format,
          language: subtitle.language
        };
        
        // 更新文件列表
        files = [newFile, ...files];
        wx.setStorageSync('srtFiles', files);

        wx.showToast({ 
          title: '下载成功', 
          icon: 'success',
          complete: () => {
            // 延迟跳转到文件页面
            setTimeout(() => {
              wx.switchTab({
                url: '/pages/files/files'
              });
            }, 1500);
          }
        });
      } else {
        throw new Error('下载失败');
      }
    } catch (error) {
      console.error('下载出错:', error);
      wx.showToast({
        title: '下载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
}); 