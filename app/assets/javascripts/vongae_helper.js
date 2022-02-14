class VonageHelper {
  constructor(campaignId, apiKey, sessionId, token, user, events = {}) {
    this.campaignId = campaignId;
    this.apiKey = apiKey;
    this.sessionId = sessionId;
    this.token = token;
    this.events = events;
    this.videoTagId = "videos";
    this.audioOffImage = null;
    this.videoOffImage = null;

    // ユーザー情報
    this.user = user;

    // デバイス系
    this.audioDeviceList = [];
    this.videoDeviceList = [];
    this.selectedAudioDeviceId = null;
    this.selectedVideoDeviceId = null;

    // フラグ系
    this.isSupported = false;
    this.isScreenSupported = false;
    this.isFirstSubscribed = false;
    this.isConnected = false;
    this.isPublished = false;
    this.enableVideo = true;
    this.enableAudio = true;
    this.isScreenShared = false;
    this.isError = false;

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
        archiveStatusDisplayMode: "on",
        backgroundImageURI: this.videoOffImage, // ビデオが表示されていないときの背景画像
        buttonDisplayMode: "off",
        nameDisplayMode: "on",
      },
      name: this.user.name,
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
        archiveStatusDisplayMode: "on",
        backgroundImageURI: this.videoOffImage, // ビデオが表示されていないときの背景画像
        buttonDisplayMode: "off",
        nameDisplayMode: "on",
      },
      name: `${this.user.name}の画面共有`,
      videoContentHint: "detail",
    };

    this.audioLevel = 0;
  }

  /**
   * moderator用init処理
   */
  initForModerator() {
    this.initOT();
    this.initPublisher();
    setTimeout(async () => {
        await this.deviceUpdated();
    }, 100);
    this.initSession();
  }

  /**
   * publisher用init処理
   */
  async initForPublisher() {
    this.initOT();
    this.initPublisher();
    setTimeout(async () => {
        await this.deviceUpdated();
    }, 100);
    this.initSession();
  }

  /**
   * subscriber用init処理
   */
  async initForSubscriber() {
    this.initOT();
    this.initSession();
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
          },
          this
        )
        // セッションのアーカイブ記録が停止したときにディスパッチ
        .on(
          "archiveStopped",
          function (event) {
            this.#debugLog("session archiveStopped:", event);
          },
          this
        )
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
          },
          this
        )
        // 別のクライアントによって新しいストリームが公開されたときにディスパッチ
        .on(
          "streamCreated",
          function (event) {
            this.#debugLog("session streamCreated:", event);
          },
          this
        )
        // 別のクライアントからのストリームが公開を停止したときにディスパッチ
        .on(
          "streamDestroyed",
          function (event) {
            this.#debugLog("session streamDestroyed:", event);
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
    if (this.sessionObj) this.sessionObj.disconnect();
  }

  /**
   * publisher作成処理
   */
  initPublisher() {
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
          // this.createRemoteAudioOffIcon();
        }
      }
    )
      // カメラとマイクへのアクセスを許可したときにディスパッチ
      .on(
        "accessAllowed",
        function (event) {
          this.#debugLog("initPublisher accessAllowed:", event);
          setTimeout(async () => {
            await this.deviceUpdated();
          }, 100);
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
        },
        this
      )
      // セッションへの公開を開始したときにディスパッチ
      .on(
        "streamCreated",
        function (event) {
          this.#debugLog("initPublisher streamCreated:", event);
        },
        this
      )
      // セッションへの公開を停止したときにディスパッチ
      .on(
        "streamDestroyed",
        function (event) {
          event.preventDefault();
          this.#debugLog("initPublisher streamDestroyed:", event);
        },
        this
      );
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
          this.isPublished = true;
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
      this.isPublished = false;
    }
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
   * デバイス更新
   */
  async deviceUpdated() {
    await this.getDevices();
    if (
      !this.audioDeviceList.some(
        (device) => device.deviceId === this.selectedAudioDeviceId
      )
    ) {
      this.setAudioSource(this.audioDeviceList[0].deviceId);
    }
    if (
      !this.videoDeviceList.some(
        (device) => device.deviceId === this.selectedVideoDeviceId
      )
    ) {
      this.setVideoSource(this.videoDeviceList[0].deviceId);
    }
  }

  /**
   * マイクソースの変更
   */
  setAudioSource(audioDeviceId) {
    if (!this.publisherObj) return;
    this.selectedAudioDeviceId = audioDeviceId;
    this.publisherObj.setAudioSource(this.selectedAudioDeviceId);
    this.#debugLog("setAudioSource:", this.selectedAudioDeviceId);
  }

  /**
   * カメラソースの変更
   */
  setVideoSource(videoDeviceId) {
    if (!this.publisherObj) return;
    this.selectedVideoDeviceId = videoDeviceId;
    this.publisherObj.setVideoSource(this.selectedVideoDeviceId);
    this.#debugLog("setVideoSource:", this.selectedVideoDeviceId);
  }

  /**
   * オーディオのON/OFF
   */
  setAudioEnabled(enabled) {
    if (!this.publisherObj) return;
    this.enableAudio = enabled;
    this.publisherObj.publishAudio(this.enableAudio);
    this.#debugLog("setAudioEnabled:", this.enableAudio);
    // if(this.enableAudio) {
    //     $("#audio-off-icon").hide();
    // } else {
    //     $("#audio-off-icon").show();
    // }
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

    if(this.isScreenShared) this.stopScreenShare();

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
        },
        this
      )
      // セッションへの公開を停止したときにディスパッチ
      .on(
        "streamDestroyed",
        function (event) {
          this.#debugLog("initPublisher(screen) streamDestroyed:", event);
          this.isScreenShared = false;
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

  #debugLog(type = "debug", object = null) {
    console.log(`${type}:`, object);
  }
  #errorLog(type = "Error", object = null) {
    console.error(`${type}:`, object);
  }
}
