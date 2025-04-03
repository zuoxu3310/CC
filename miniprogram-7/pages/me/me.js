// pages/me/me.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    showAgreement: false,
    showPrivacy: false,
    showAbout: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

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
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 2
      })
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

  // 打开用户协议弹窗
  showAgreement() {
    this.setData({ showAgreement: true });
  },

  // 打开隐私政策弹窗
  showPrivacy() {
    this.setData({ showPrivacy: true });
  },

  // 打开关于我们弹窗
  showAbout() {
    this.setData({ showAbout: true });
  },

  // 关闭弹窗
  closePopup() {
    this.setData({ 
      showAgreement: false,
      showPrivacy: false,
      showAbout: false
    });
  }
})