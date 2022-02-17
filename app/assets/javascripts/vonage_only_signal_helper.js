class VonageOnlySignalHelper {
  constructor(apiKey, sessionId, token) {
    this.apiKey = apiKey;
    this.sessionId = sessionId;
    this.token = token;

    // フラグ系
    this.isSupported = false;
    this.isConnected = false;
    this.isError = false;

    // vonage関連のオブジェクト
    this.sessionObj = null;
  }

  /**
   * OTの初期設定
   */
  initOT() {
    OT.on(
      "exception",
      function (event) {
        this.#errorLog("OT exception", event);
      },
      this
    );

    this.isSupported = OT.checkSystemRequirements() == 1;
  }

  /**
   * session接続処理
   */
  initSession() {
    if (this.isSupported) {
      this.sessionObj = OT.initSession(this.apiKey, this.sessionId)
        // セッションのアーカイブ記録が開始されたときにディスパッチ
        // 新しいクライアント（自分を含む）がセッションに接続したときにディスパッチされ、
        // 最初に接続したときにセッション内のすべてのクライアントに対してディスパッチされる。
        .on(
          "connectionCreated",
          function (event) {
            this.#debugLog("session connectionCreated:", event);
          },
          this
        )
        // 自分以外のクライアントがセッションから切断したときにディスパッチ
        .on(
          "connectionDestroyed",
          function (event) {
            this.#debugLog("session connectionDestroyed:", event);
          },
          this
        )
        // 自分がセッションに接続されたらディスパッチ
        .on(
          "sessionConnected",
          function (event) {
            this.#debugLog("session sessionConnected:", event);
            this.isConnected = true;
            const userName = event.target.connection.data;
            this.setName(userName);
            this.initPublisher();
          },
          this
        )
        // 自分がセッションから切断されたらディスパッチ
        .on(
          "sessionDisconnected",
          function (event) {
            this.#debugLog("session sessionDisconnected:", event);
            this.isConnected = false;
            if (this.isPublished) this.unPublish();
          },
          this
        )
        // セッションからシグナルを受信したときにディスパッチ
        .on(
          "signal",
          function (event) {
            this.#debugLog("session signal:", event);
          },
          this
        );
    } else {
      this.#errorLog("not supported browser.");
    }
  }

  /**
   * session接続処理
   */
  sessionConnect() {
    if (this.sessionObj) {
      this.sessionObj.connect(this.token, (error) => {
        if (error) this.#errorLog("session connect error:", error);
      });
    }
  }

  /**
   * session切断処理
   */
  sessionDisconnect() {
    if (this.sessionObj) this.sessionObj.disconnect();
  }

  /**
   * signal送信
   * @param {string} type
   * @param {string} data
   * @param {Connection|null} to
   */
  sendSignal(type, data, to = null) {
    if (!this.sessionObj) return;
    const option = {
      type: type,
      data: data,
    };
    if (to) option.to = to;
    this.sessionObj.signal(option, (error) => {
      if (error) {
        this.#errorLog("signal error", error);
      } else {
        this.#debugLog("signal sent", { type: type, data: data });
      }
    });
  }

  #debugLog(type = "debug", object = null) {
    console.log(`${type}:`, object);
  }
  #errorLog(type = "Error", object = null) {
    console.error(`${type}:`, object);
    this.isError = true;
  }
}
