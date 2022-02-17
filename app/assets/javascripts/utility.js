const Utility = {
  /**
   * トークンを取得
   * @param {string} url
   * @param {string} userName
   * @param {function} callback
   */
  getToken(url, userName, callback) {
    window.axios
      .get(url, {
        params: {
          data: userName,
        },
      })
      .then((response) => {
        const token = response.data;
        callback(token);
      });
  },
};