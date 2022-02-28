class VonageHelper {
  constructor(apiKey, sessionId, token, isOnlySubscribe, audioOffImage = null, videoOffImage = null, events = {}) {
    this.apiKey = apiKey;
    this.sessionId = sessionId;
    this.token = token;
    this.isOnlySubscribe = isOnlySubscribe;
    this.events = {
      disConnectedFunction: () => {},
      archiveStartedFunction: () => {},
      archiveStoppedFunction: () => {},
    };
    $.extend(this.events, events);
    this.videoTagId = "videos";
    this.audioOffImage = audioOffImage;
    this.videoOffImage = videoOffImage;
    this.userName = null;
    this.existedModeratorCount = 0;

    // 入力デバイス系
    this.audioDeviceList = [];
    this.videoDeviceList = [];
    this.selectedAudioDeviceId = null;
    this.selectedVideoDeviceId = null;

    // 出力デバイス系
    this.audioOutputDeviceList = [];
    this.selectedAudioOutputDeviceId = null;

    // フラグ系
    this.isSupported = false;
    this.isScreenSupported = false;
    this.isConnected = false;
    this.isPublished = false;
    this.enableAudio = true;
    this.enableVideo = true;
    this.isScreenShared = false;
    this.isError = false;
    this.isDeviceUpdated = false;

    // vonage関連のオブジェクト
    this.sessionObj = null;
    this.publisherObj = null;
    this.videoOpts = {
      fitMode: "contain",
      insertMode: "append",
      width: "100%",
      height: "100%",
      style: {
        audioLevelDisplayMode: "off",
        archiveStatusDisplayMode: "off",
        backgroundImageURI: this.videoOffImage, // ビデオが表示されていないときの背景画像
        buttonDisplayMode: "off",
        nameDisplayMode: "on",
      },
    };
    this.screenPublisherObj = null;
    this.screenOpts = {
      videoSource: "screen",
      fitMode: "contain",
      insertMode: "append",
      width: "100%",
      height: "100%",
      style: {
        audioLevelDisplayMode: "off",
        archiveStatusDisplayMode: "off",
        backgroundImageURI: this.videoOffImage, // ビデオが表示されていないときの背景画像
        buttonDisplayMode: "off",
        nameDisplayMode: "on",
      },
      videoContentHint: "detail",
    };
    this.subscribeObjs = [];
    this.subscribeScreenObj = null;
    this.subscribeOpts = {
      fitMode: "contain",
      insertMode: "append",
      width: "100%",
      height: "100%",
      style: {
        audioBlockedDisplayMode: "off",
        audioLevelDisplayMode: "off",
        backgroundImageURI: this.videoOffImage, // ビデオが表示されていないときの背景画像
        buttonDisplayMode: "off",
        nameDisplayMode: "on",
        videoDisabledDisplayMode: "off",
      },
    };

    this.audioLevel = 0;
    this.speakerFrameTimers = [];

    //1秒前のstats
    this.preStats = {
      audio: {
          bytesSent: 0,
          packetsLost: 0,
          packetsSent: 0,
      },
      video: {
          bytesSent: 0,
          packetsLost: 0,
          packetsSent: 0,
          frameRate: 0,
      },
    }
    //表示用stats
    this.displayStatus = {
      audio: {
        bitRate: "ー",
        packetsLostRate: "ー",
      },
      video: {
        bitRate: "ー",
        packetsLostRate: "ー",
        frameRate: "ー",
      },
      networkStatus: "Disconnect",
    },
    this.statsInterval = null,

    // 受け取ったsignalを格納するオブジェクト
    this.signalObj = [];
  }

  /**
   * init処理
   */
  async init() {
    this.initOT();
    this.initSession();
  }

  /**
   * nameをセット
   * @param {string} name
   */
  setName(name) {
    this.userName = name;
    this.videoOpts.name = this.userName;
    this.screenOpts.name = `${this.userName}の画面共有`;
  }

  /**
   * isOnlySubscribeを変更
   * @param {boolean} bool
   */
  setOnlySubscribe(bool) {
    this.isOnlySubscribe = bool;
    if (this.isOnlySubscribe) {
      if (this.publisherObj) this.publisherObj.destroy();
      this.publisherObj = null;
    }
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

    let isScreenSupported = false;
    OT.checkScreenSharingCapability((response) => {
      isScreenSupported =
        response.supported && response.extensionRegistered !== false;
    });
    this.isScreenSupported = isScreenSupported;
  }

  /**
   * session接続処理
   */
  initSession() {
    if (this.isSupported) {
      this.sessionObj = OT.initSession(this.apiKey, this.sessionId)
        // セッションのアーカイブ記録が開始されたときにディスパッチ
        .on(
          "archiveStarted",
          function (event) {
            this.#debugLog("session archiveStarted:", event);
            this.events.archiveStartedFunction();
          },
          this
        )
        // セッションのアーカイブ記録が停止したときにディスパッチ
        .on(
          "archiveStopped",
          function (event) {
            this.#debugLog("session archiveStopped:", event);
            this.events.archiveStoppedFunction();
          },
          this
        )
        // 新しいクライアント（自分を含む）がセッションに接続したときにディスパッチされ、
        // 最初に接続したときにセッション内のすべてのクライアントに対してディスパッチされる。
        .on(
          "connectionCreated",
          function (event) {
            this.#debugLog("session connectionCreated:", event);
            const isModerator =
              event.connection.permissions.forceDisconnect === 1;
            if (isModerator) this.existedModeratorCount++;
          },
          this
        )
        // 自分以外のクライアントがセッションから切断したときにディスパッチ
        .on(
          "connectionDestroyed",
          function (event) {
            this.#debugLog("session connectionDestroyed:", event);
            const isModerator =
              event.connection.permissions.forceDisconnect === 1;
            if (isModerator) this.existedModeratorCount--;
          },
          this
        )
        // モデレーターがストリームをセッションに公開しているクライアントに対してオーディオを強制的にミュート、もしくはミュート解除したらディスパッチ
        .on(
          "muteForced",
          function (event) {
            this.#debugLog("session muteForced:", event);
          },
          this
        )
        // 自分がセッションに接続されたらディスパッチ
        .on(
          "sessionConnected",
          function (event) {
            this.#debugLog("session sessionConnected:", event);
            this.isConnected = true;
            if (this.isOnlySubscribe) return;
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
            this.unPublish();
            this.subscribeObjs = [];
            this.events.disConnectedFunction(event);
            if (this.isOnlySubscribe) return;
            this.setName(null);
            this.initPublisher();
          },
          this
        )
        // 自分がセッションから接続が一時的に失われた後、再接続したときにディスパッチ
        .on(
          "sessionReconnected",
          function (event) {
            this.#debugLog("session sessionReconnected:", event);
          },
          this
        )
        // 自分がセッションへの接続を失い、再接続しようとしているときにディスパッチ
        .on(
          "sessionReconnecting",
          function (event) {
            this.#debugLog("session sessionReconnecting:", event);
          },
          this
        )
        // セッションからシグナルを受信したときにディスパッチ
        .on(
          "signal",
          function (event) {
            this.#debugLog("session signal:", event);
            this.signalObj.push({
              type: event.type,
              data: event.data,
              from: event.from,
            });
          },
          this
        )
        // 別のクライアントによって新しいストリームが公開されたときにディスパッチ
        .on(
          "streamCreated",
          function (event) {
            this.#debugLog("session streamCreated:", event);
            const videoType = event.stream.videoType;
            const subscribe = this.subscribe(event.stream);
            if (videoType === "screen") {
              this.stopScreenShare();
              this.subscribeScreenObjs = subscribe;
            } else {
              this.subscribeObjs.push(subscribe);
            }
            if (this.events.changeArchiveLayout)
              this.events.changeArchiveLayout("streamCreated", event);
          },
          this
        )
        // 別のクライアントからのストリームが公開を停止したときにディスパッチ
        .on(
          "streamDestroyed",
          function (event) {
            this.#debugLog("session streamDestroyed:", event);
            const videoType = event.stream.videoType;
            if (videoType === "screen") {
              this.subscribeScreenObjs = null;
            } else {
              const streamId = event.stream.id;
              this.subscribeObjs = this.subscribeObjs.filter((subscriber) => {
                return subscriber.stream.id !== streamId;
              });
            }
            if (this.events.changeArchiveLayout)
              this.events.changeArchiveLayout("streamDestroyed", event);
          },
          this
        )
        // ストリームのプロパティが変更されたときにディスパッチ
        // オーディオまたはビデオの公開を開始または停止したとき
        // ネットワークやCPU的な理由でビデオの公開が停止したとき
        .on(
          "streamPropertyChanged",
          function (event) {
            this.#debugLog("session streamPropertyChanged:", event);

            const isMyself = event.stream.connection.id === this.sessionObj.connection.id;
            if (event.changedProperty === "hasAudio" && !isMyself) {
              const targetElementId = this.sessionObj.getSubscribersForStream(event.stream)[0].id;
              this.#changeDisplayAudioOffImage(targetElementId, event.newValue);
            }
          },
          this
        );
    } else {
      this.#errorLog("not supported browser.");
    }
  }

  /**
   * signalイベントを登録
   * @param {string} type
   * @param {function} callback
   */
  registerSignalEvent(type, callback = null) {
    if (!this.sessionObj) return;
    this.sessionObj.on(
      `signal:${type}`,
      function (event) {
        if (callback) callback(event);
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
        if (error) {
          this.#errorLog("session connect error:", error);
        } else {
          this.publish();
        }
      });
    }
  }

  /**
   * session切断処理
   */
  sessionDisconnect() {
    if (this.sessionObj) {
      this.sessionObj.disconnect();
    }
  }

  /**
   * moderatorによる強制session切断処理
   * @param {Connection} connection
   */
  sessionForceDisconnect(connection) {
    if (this.sessionObj) {
      this.sessionObj.forceDisconnect(connection, (error) => {
        if (error) this.#errorLog("session force disconnect error:", error);
      });
    }
  }

  /**
   * moderatorによる強制音声ミュート処理
   * @param {Stream} stream
   */
   forceMuteStream(stream) {
    if (this.sessionObj) {
      this.sessionObj.forceMuteStream(stream);
    }
  }

  /**
   * signal送信
   * @param {string} type
   * @param {string} data
   * @param {Connection|null} to
   * @returns
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
        if (error.name === 'OT_NOT_FOUND') {
          this.#warnLog("signal connection not found", error);
        } else {
          this.#errorLog("signal error", error);
        }
      } else {
        this.#debugLog("signal sent", { type: type, data: data });
      }
    });
  }

  /**
   * publisher作成処理
   */
  async initPublisher() {
    return new Promise((resolve) => {
      if (this.publisherObj) this.publisherObj.destroy();

      const option = {
        publishAudio: this.enableAudio,
        publishVideo: this.enableVideo,
      };
      $.extend(this.videoOpts, option);

      this.publisherObj = OT.initPublisher(
        this.videoTagId,
        this.videoOpts,
        (error) => {
          if (error) {
            this.#errorLog("initPublisher error:", error);
            if (this.publisherObj) this.publisherObj.destroy();
            this.publisherObj = null;
          } else {
            this.#debugLog("initPublisher success:");
            this.#createAudioOffImage(this.publisherObj.id, this.enableAudio);
            this.#createSpeakerFrameElement(this.publisherObj.id);
          }
          resolve();
        }
      )
        // カメラとマイクへのアクセスを許可したときにディスパッチ
        .on(
          "accessAllowed",
          function (event) {
            this.#debugLog("initPublisher accessAllowed:", event);
            this.deviceUpdated();
          },
          this
        )
        // カメラとマイクへのアクセスを許可しなかったときにディスパッチ
        .on(
          "accessDenied",
          function (event) {
            this.#debugLog("initPublisher accessDenied:", event);
          },
          this
        )
        // カメラとマイクへのアクセスを許可するためのダイアログを閉じたときにディスパッチ
        .on(
          "accessDialogClosed",
          function (event) {
            this.#debugLog("initPublisher accessDialogClosed:", event);
          },
          this
        )
        // カメラとマイクへのアクセスを許可するためのダイアログが開かれたときにディスパッチ
        .on(
          "accessDialogOpened",
          function (event) {
            this.#debugLog("initPublisher accessDialogOpened:", event);
          },
          this
        )
        // １秒間に60回(ブラウザによる)ディスパッチ
        // 自分の音声レベルを示すための数値(0.0~1.0)を定期的に送信する
        .on(
          "audioLevelUpdated",
          function (event) {
            this.audioLevel = event.audioLevel;
            this.#changeDisplaySpeakerFrame(event.target.id, event.audioLevel, 0.1);
          },
          this
        )
        // Publisher要素がHTMLDOMから削除されたときにディスパッチ
        .on(
          "destroyed",
          function (event) {
            this.#debugLog("initPublisher destroyed:", event);
          },
          this
        )
        // モデレーターが自分の音声の強制的にミュートしたときにディスパッチ
        .on(
          "muteForced",
          function (event) {
            this.#debugLog("initPublisher muteForced:", event);
            this.enableAudio = false;
          },
          this
        )
        // セッションへの公開を開始したときにディスパッチ
        .on(
          "streamCreated",
          function (event) {
            this.#debugLog("initPublisher streamCreated:", event);
            this.isPublished = true;
            this.startGetStats();
          },
          this
        )
        // セッションへの公開を停止したときにディスパッチ
        .on(
          "streamDestroyed",
          function (event) {
            event.preventDefault();
            this.#debugLog("initPublisher streamDestroyed:", event);
            this.isPublished = false;
            this.stopScreenShare();
            this.stopGetStats();
          },
          this
        );
    });
  }

  /**
   * 配信開始
   */
  publish() {
    if (this.isPublished) return;
    if (this.sessionObj && this.publisherObj) {
      this.sessionObj.publish(this.publisherObj, (error) => {
        if (error) {
          this.#errorLog("publish error:", error);
        } else {
          this.#debugLog("publish success:");
        }
      });
    }
  }

  /**
   * 配信停止
   */
  unPublish() {
    if (!this.isPublished) return;
    if (this.sessionObj && this.publisherObj) {
      this.sessionObj.unpublish(this.publisherObj);
      this.#debugLog("unpublish success:");
    }
  }

  /**
   * サブスクライブ
   */
  subscribe(stream) {
    return (
      this.sessionObj
        .subscribe(stream, this.videoTagId, this.subscribeOpts, (error) => {
          if (error) this.#errorLog("subscribe error", error);
        })
        // ブラウザの自動再生ポリシーのためにサブスクライバーのオーディオがブロックされたときにディスパッチ
        .on(
          "audioBlocked",
          (event) => {
            this.#debugLog("subscribe audioBlocked:", event);
          },
          this
        )
        // １秒間に60回(ブラウザによる)ディスパッチ
        // 他人の音声レベルを示すための数値(0.0~1.0)を定期的に送信する
        .on("audioLevelUpdated", (event) => {
          this.#changeDisplaySpeakerFrame(event.target.id, event.audioLevel, 0.01);
        }, this)
        // ブラウザの自動再生ポリシーのために一時停止した後、サブスクライバーのオーディオのブロックが解除されたときにディスパッチ
        .on(
          "audioUnblocked",
          (event) => {
            this.#debugLog("subscribe audioUnblocked:", event);
          },
          this
        )
        // サブスクライバーが'disconnect'イベントをディスパッチした後、サブスクライバーのストリームが再開されたときにディスパッチ
        .on(
          "connected",
          (event) => {
            this.#debugLog("subscribe connected:", event);
          },
          this
        )
        // サブスクライバー要素がHTMLDOMから削除されたときにディスパッチ
        .on(
          "destroyed",
          (event) => {
            this.#debugLog("subscribe destroyed:", event);
          },
          this
        )
        // サブスクライバーのストリームが中断されたときにディスパッチ
        .on(
          "disconnected",
          (event) => {
            this.#debugLog("subscribe disconnected:", event);
          },
          this
        )
        // ビデオのビデオサイズが変更されたときにディスパッチ
        .on(
          "videoDimensionsChanged",
          (event) => {
            this.#debugLog("subscribe videoDimensionsChanged:", event);
          },
          this
        )
        // サブスクライバーのビデオが無効になっている場合にディスパッチ
        .on(
          "videoDisabled",
          (event) => {
            this.#debugLog("subscribe videoDisabled:", event);
          },
          this
        )
        // ストリーム品質が低下したと判断した場合にディスパッチ
        .on(
          "videoDisableWarning",
          (event) => {
            this.#debugLog("subscribe videoDisableWarning:", event);
          },
          this
        )
        // ビデオが無効になっている状態から、ストリーム品質が向上したと判断した場合にディスパッチ
        .on(
          "videoDisableWarningLifted",
          (event) => {
            this.#debugLog("subscribe videoDisableWarningLifted:", event);
          },
          this
        )
        // サブスクライバーのビデオ要素が作成されたときにディスパッチ
        .on(
          "videoElementCreated",
          (event) => {
            this.#debugLog("subscribe videoElementCreated:", event);

            this.#createAudioOffImage(event.target.id, event.target.stream.hasAudio);
            this.#createSpeakerFrameElement(event.target.id);
          },
          this
        )
        // ビデオが以前に無効にされた後、サブスクライバーへのビデオの送信を再開したときにディスパッチ
        .on(
          "videoEnabled",
          (event) => {
            this.#debugLog("subscribe videoEnabled:", event);
          },
          this
        )
    );
  }

  /**
   * マイク、カメラデバイスの取得
   */
  async getDevices() {
    return new Promise((resolve) => {
      OT.getDevices((error, devices) => {
        if (error) {
          this.#errorLog("getDevices error:", error);
          return;
        }

        this.audioDeviceList = devices.filter(
          (device) =>
            device.kind === "audioInput" && device.deviceId !== "default"
        );
        this.videoDeviceList = devices.filter(
          (device) =>
            device.kind === "videoInput" && device.deviceId !== "default"
        );
        this.#debugLog("audioList:", this.audioDeviceList);
        this.#debugLog("videoList:", this.videoDeviceList);

        this.selectedAudioDeviceId
          ? null
          : (this.selectedAudioDeviceId = this.audioDeviceList[0].deviceId);
        this.selectedVideoDeviceId
          ? null
          : (this.selectedVideoDeviceId = this.videoDeviceList[0].deviceId);
        this.#debugLog("selectedAudioDeviceId:", this.selectedAudioDeviceId);
        this.#debugLog("selectedVideoDeviceId:", this.selectedVideoDeviceId);

        resolve();
      });
    });
  }

  /**
   * スピーカーデバイスの取得
   */
  async getAudioOutputDevices() {
    await OT.getAudioOutputDevices().then((audioOutputDeviceList) => {
      this.audioOutputDeviceList = audioOutputDeviceList.filter(
        (device) => device.deviceId != "default"
      );
      this.#debugLog("audioOutputList:", this.audioOutputDeviceList);
      this.selectedAudioOutputDeviceId
        ? null
        : (this.selectedAudioOutputDeviceId =
            this.audioOutputDeviceList[0].deviceId);
      this.#debugLog(
        "selectedAudioOutputDeviceId:",
        this.selectedAudioOutputDeviceId
      );
    });
  }

  /**
   * デバイス更新
   */
  async deviceUpdated() {
    if (this.isDeviceUpdated) return;
    this.isDeviceUpdated = true;
    await this.getDevices();
    await this.getAudioOutputDevices();
    if (
      !this.audioDeviceList.some(
        (device) => device.deviceId === this.selectedAudioDeviceId
      )
    ) {
      this.setAudioSource(this.audioDeviceList[0].deviceId);
    } else {
      this.setAudioSource(this.selectedAudioDeviceId);
    }
    if (
      !this.videoDeviceList.some(
        (device) => device.deviceId === this.selectedVideoDeviceId
      )
    ) {
      this.setVideoSource(this.videoDeviceList[0].deviceId);
    } else {
      this.setVideoSource(this.selectedVideoDeviceId);
    }
    if (
      !this.audioOutputDeviceList.some(
        (device) => device.deviceId === this.selectedAudioOutputDeviceId
      )
    ) {
      this.setAudioOutputDevice(this.audioOutputDeviceList[0].deviceId);
    } else {
      this.setAudioOutputDevice(this.selectedAudioOutputDeviceId);
    }
    this.isDeviceUpdated = false;
  }

  /**
   * マイクソースの変更
   */
  setAudioSource(audioDeviceId) {
    if (!this.publisherObj) return;
    this.selectedAudioDeviceId = audioDeviceId;
    this.publisherObj.setAudioSource(this.selectedAudioDeviceId);
    this.#debugLog("setAudioSource:", this.selectedAudioDeviceId);
    $.extend(this.videoOpts, { audioSource: this.selectedAudioDeviceId });
  }

  /**
   * カメラソースの変更
   */
  setVideoSource(videoDeviceId) {
    if (!this.publisherObj) return;
    this.selectedVideoDeviceId = videoDeviceId;
    this.publisherObj.setVideoSource(this.selectedVideoDeviceId);
    this.#debugLog("setVideoSource:", this.selectedVideoDeviceId);
    $.extend(this.videoOpts, { videoSource: this.selectedVideoDeviceId });
  }

  /**
   * スピーカーソースの変更
   */
  setAudioOutputDevice(audioOutputDeviceId) {
    this.selectedAudioOutputDeviceId = audioOutputDeviceId;
    OT.setAudioOutputDevice(this.selectedAudioOutputDeviceId);
    this.#debugLog("setAudioOutputDevice:", this.selectedAudioOutputDeviceId);
  }

  /**
   * オーディオのON/OFF
   */
  setAudioEnabled(enabled) {
    if (!this.publisherObj) return;
    this.enableAudio = enabled;
    this.publisherObj.publishAudio(this.enableAudio);
    this.#debugLog("setAudioEnabled:", this.enableAudio);
    this.#changeDisplayAudioOffImage(this.publisherObj.id, this.enableAudio);
  }

  /**
   * ビデオのON/OFF
   */
  setVideoEnabled(enabled) {
    if (!this.publisherObj) return;
    this.enableVideo = enabled;
    this.publisherObj.publishVideo(this.enableVideo);
    this.#debugLog("setVideoEnabled:", this.enableVideo);
  }

  /**
   * 画面共有を開始
   */
  startScreenShare() {
    if (!this.isPublished) return;
    if (!this.isScreenSupported) {
      this.#errorLog("not support browser:");
      return;
    }

    if (
      this.subscribeObjs.some((subscribe) => subscribe.videoType === "screen")
    ) {
      this.#errorLog("other user already share screen");
      return;
    }

    if (this.isScreenShared) this.stopScreenShare();

    this.screenPublisherObj = OT.initPublisher(
      this.videoTagId,
      this.screenOpts,
      (error) => {
        if (error) {
          this.#errorLog("initPublisher(screen) error:", error);
          if (this.screenPublisherObj) this.screenPublisherObj.destroy();
          this.screenPublisherObj = null;
        } else {
          this.#debugLog("initPublisher(screen) success:");
          if (this.sessionObj && this.screenPublisherObj) {
            this.sessionObj.publish(this.screenPublisherObj, (error) => {
              if (error) this.#errorLog("publish(screen) error:", error);
            });
          }
        }
      }
    )
      // Publisher要素がHTMLDOMから削除されたときにディスパッチ
      .on(
        "destroyed",
        function (event) {
          this.#debugLog("initPublisher(screen) destroyed:", event);
        },
        this
      )
      // セッションへの公開を開始したときにディスパッチ
      .on(
        "streamCreated",
        function (event) {
          this.#debugLog("initPublisher(screen) streamCreated:", event);
          this.isScreenShared = true;
          if (this.events.changeArchiveLayout)
            this.events.changeArchiveLayout("streamCreated", event);
        },
        this
      )
      // セッションへの公開を停止したときにディスパッチ
      .on(
        "streamDestroyed",
        function (event) {
          this.#debugLog("initPublisher(screen) streamDestroyed:", event);
          this.isScreenShared = false;
          if (this.events.changeArchiveLayout)
            this.events.changeArchiveLayout("streamDestroyed", event);
        },
        this
      )
      // 画面共有しているウィンドウサイズが変更されたときにディスパッチ
      .on(
        "videoDimensionsChanged",
        function (event) {
          this.#debugLog(
            "initPublisher(screen) videoDimensionsChanged:",
            event
          );
        },
        this
      );
  }

  /**
   * 画面共有を停止
   */
  stopScreenShare() {
    if (!this.screenPublisherObj || !this.isScreenShared) return;
    this.screenPublisherObj.destroy();
    this.screenPublisherObj = null;
  }

  /**
   * 配信ステータス取得開始処理
   */
  startGetStats() {
    this.statsInterval = setInterval(() => {
      this.publisherObj.getStats((error, statsArray) => {
        if (error) this.#errorLog("getStats", error);
        const audioStats = {
          bitRate: Math.round(
            ((statsArray[0].stats.audio.bytesSent -
              this.preStats.audio.bytesSent) *
              8) /
              1000
          ),
          packetsLostRate:
            Math.round(
              (statsArray[0].stats.audio.packetsLost /
                (statsArray[0].stats.audio.packetsSent +
                  statsArray[0].stats.audio.packetsLost)) *
                100 *
                1000
            ) / 1000,
        };
        if (!this.enableAudio) audioStats.bitRate = 0;

        const videoStats = {
          bitRate: Math.round(
            ((statsArray[0].stats.video.bytesSent -
              this.preStats.video.bytesSent) *
              8) /
              1000
          ),
          packetsLostRate:
            Math.round(
              (statsArray[0].stats.video.packetsLost /
                (statsArray[0].stats.video.packetsSent +
                  statsArray[0].stats.video.packetsLost)) *
                100 *
                1000
            ) / 1000,
          frameRate: Math.round(statsArray[0].stats.video.frameRate),
        };
        if (!this.enableVideo) {
          videoStats.bitRate = 0;
          videoStats.frameRate = 0;
        }

        $.extend(this.preStats.audio, statsArray[0].stats.audio);
        $.extend(this.preStats.video, statsArray[0].stats.video);

        let isExcellent = true;
        let isAcceptable = true;
        let isBad = true;
        switch(true) {
          case this.enableVideo:
            if(this.publisherObj.videoWidth() >= 1200) {
              isExcellent = videoStats.bitRate >= 1000 && videoStats.packetsLostRate <= 0.5;
              isAcceptable = videoStats.bitRate >= 350 && videoStats.packetsLostRate <= 3;
            } else if(this.publisherObj.videoWidth() >= 600) {
              isExcellent = videoStats.bitRate >= 600 && videoStats.packetsLostRate <= 0.5;
              isAcceptable = videoStats.bitRate >= 250 && videoStats.packetsLostRate <= 3;
            } else {
              isExcellent = videoStats.bitRate >= 300 && videoStats.packetsLostRate <= 0.5;
              isAcceptable = videoStats.bitRate >= 150 && videoStats.packetsLostRate <= 3;
            }
            break;
          case this.enableAudio:
            isExcellent = audioStats.bitRate >= 30 && audioStats.packetsLostRate <= 0.5;
            isAcceptable = audioStats.bitRate >= 25 && audioStats.packetsLostRate <= 5;
            break;
          default:
            isExcellent = false;
            isAcceptable = false;
            isBad = false;
        }

        let networkQuality;
        switch(true) {
          case isExcellent:
            networkQuality = 'Excellent';
            break;
          case isAcceptable:
            networkQuality = 'Acceptable';
            break;
          case isBad:
            networkQuality = 'Bad';
            break;
          default:
            networkQuality = 'Off';
        }

        const stats = {
          audio: audioStats,
          video: videoStats,
          networkStatus: networkQuality,
        };
        $.extend(this.displayStatus, stats);
      });
    }, 1000);
  }

  /**
   * 配信ステータス取得終了処理
   */
  stopGetStats() {
    clearInterval(this.statsInterval);
    this.statsInterval = null;
    this.displayStatus = {
      audio: {
        bitRate: "ー",
        packetsLostRate: "ー",
      },
      video: {
        bitRate: "ー",
        packetsLostRate: "ー",
        frameRate: "ー",
      },
      networkStatus: "Disconnect",
    };
  }

  /**
   * マイクON/OFF通知イメージの作成
   * @param {string} targetElementId
   * @param {boolean} hasAudio
   */
  #createAudioOffImage(targetElementId, hasAudio) {
    const iconElement = $("<img>").attr({
      "src": this.audioOffImage,
    })
    .addClass('audio-off');

    $(`#${targetElementId}`).append(iconElement);

    this.#changeDisplayAudioOffImage(targetElementId, hasAudio);
  }
  /**
   * マイクON/OFF通知イメージの表示切り替え
   * @param {string} targetElementId
   * @param {boolean} hasAudio
   */
  #changeDisplayAudioOffImage(targetElementId, hasAudio) {
    if (hasAudio) {
      $(`#${targetElementId} > .audio-off`).hide();
      $(`#${targetElementId} > .speaker-frame`).removeClass('disable');
    } else {
      $(`#${targetElementId} > .audio-off`).show();
      $(`#${targetElementId} > .speaker-frame`).hide();
      $(`#${targetElementId} > .speaker-frame`).addClass('disable');
    }
  }
  /**
   * 話者の枠の作成
   * @param {string} targetElementId
   */
  #createSpeakerFrameElement(targetElementId) {
    const element = $("<div>").addClass("speaker-frame");

    $(`#${targetElementId}`).append(element);
  }
  /**
   * 話者の枠の表示切り替え
   * @param {string} targetElementId
   * @param {float} audioLevel
   * @param {float} threshold
   */
  #changeDisplaySpeakerFrame(targetElementId, audioLevel, threshold) {
    if (audioLevel > threshold) {
      if (this.speakerFrameTimers[targetElementId]) clearTimeout(this.speakerFrameTimers[targetElementId]);
      $(`#${targetElementId} > .speaker-frame`).not('.disable').show();
      this.speakerFrameTimers[targetElementId] = setTimeout(() => {
        $(`#${targetElementId} > .speaker-frame`).hide();
        delete this.speakerFrameTimers[targetElementId];
      }, 200);
    }
  }
  #debugLog(type = "debug", object = null) {
    console.log(`${type}:`, object);
  }
  #warnLog(type = "warn", object = null) {
    console.warn(`${type}:`, object);
  }
  #errorLog(type = "Error", object = null) {
    console.error(`${type}:`, object);
    this.isError = true;
  }
}
