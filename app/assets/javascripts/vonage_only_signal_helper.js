class VonageOnlySignalHelper {
  constructor(apiKey, sessionId, token, events = {}) {
    this.apiKey = apiKey;
    this.sessionId = sessionId;
    this.token = token;
    this.events = events;
    this.authRequests = [];

    // フラグ系
    this.isSupported = false;
    this.isConnected = false;
    this.isError = false;

    // vonage関連のオブジェクト
    this.sessionObj = null;
  }

  /**
   * moderator用init処理
   */
  initForModerator() {
    this.initOT();
    this.initSession();
    this.registerSignalAuthRequest();
  }

  /**
   * publisher用init処理
   */
  initForPublisher() {
    this.initOT();
    this.initSession();
    this.registerSignalReceiveToken();
    this.sessionConnect();
  }

  /**
   * subscriber用init処理
   */
   initForSubscriber() {
    this.initOT();
    this.initSession();
    this.registerSignalBroadcast();
    this.sessionConnect();
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
      .on(
        "sessionConnected",
        function (event) {
          this.#debugLog("session sessionConnected:", event);
          this.isConnected = true;
        },
        this
      )
      .on(
        "sessionDisconnected",
        function (event) {
          this.#debugLog("session sessionDisconnected:", event);
          this.isConnected = false;
        },
        this
      );
    } else {
      this.#errorLog("not supported browser.");
    }
  }

  /**
   * signal:authRequestイベントを登録
   */
  registerSignalAuthRequest() {
    this.sessionObj.on(
      "signal:authRequest",
      function (event) {
        this.#debugLog("session signal:authRequest", event);
        this.authRequests = this.authRequests.filter(function(request) {
            return request.from !== event.from;
        });
        this.authRequests.push(event);
      },
      this
    );
  }

  /**
   * signal:receiveTokenイベントを登録
   */
  registerSignalReceiveToken() {
    this.sessionObj.on(
      "signal:receiveToken",
      function (event) {
        this.#debugLog("session signal:receiveToken", event);
        const token = event.data;
        if (this.events.init) this.events.init(token);
        this.sessionDisconnect();
      },
      this
    );
  }

  /**
   * signal:broadcastイベントを登録
   */
  registerSignalBroadcast() {
    this.sessionObj.on(
      "signal:broadcast",
      function (event) {
        this.#debugLog("session signal:broadcast", event);
        if (this.events.setBroadcast) this.events.setBroadcast(event.data === 'true');
      },
      this
    );
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
