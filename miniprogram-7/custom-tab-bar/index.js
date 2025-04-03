Component({
  data: {
    active: 0
  },
  methods: {
    onChange(event) {
      const active = event.detail;
      this.setData({ active });
      
      // 页面切换映射
      const urlMap = {
        0: '/pages/index/index',
        1: '/pages/files/files',
        2: '/pages/me/me'
      };
      
      wx.switchTab({
        url: urlMap[active]
      });
    }
  }
}); 