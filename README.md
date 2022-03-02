## 環境構築手順
1. 以下のコマンドを順に実行
```
$ git clone git@github.com:test-moriken-team/nexpro-vonage-sample.git
$ cd nexpro-vonage-sample
$ make init
```

2. envファイルを編集
```
RAILS_MASTER_KEY=???????
API_KEY=[vonageのapi_key] ←ここを編集
SECRET_KEY=[vonageのsecret_key] ←ここを編集
```
↑各値は[vonageのコンソール画面](https://tokbox.com/account)で確認できる。

※環境変数を編集しても反映されない場合は、dockerコンテナをリスタートしてください。

3. `localhost:3000` でアクセスし、表示確認。

## アドミン・ユーザー情報
admin
※moderatorとしてセッションに接続するために必要な認証情報
```
email:
admin@example.com

password:
123456
```

user
※subscriberとしてセッションに接続するために必要な認証情報
```
email:
user@example.com

password:
123456
```

## 機能一覧
## 共通
- マイクOFF(＆映像右上にマイクOFFアイコン表示)
- カメラOFF(＆映像をビデオOFF画像に変更)
- マイクデバイス一覧表示
- カメラデバイス一覧表示
- スピーカーデバイス一覧表示（chromeのみ対応）
- マイクデバイス変更
- カメラデバイス変更
- スピーカーデバイス変更（chromeのみ対応）
- オーディオボリュームメーター
- シグナル（文字列を送信できるソケット通信）
- 話者の映像枠を青色にする

### moderator
- 名前を入力してセッションに入室
- 画面共有開始・終了
- 録画開始・終了
- subscriberへの配信(broadcast)開始・終了
- 参加リクエスト一覧表示
- 参加リクエスト承認・拒否
- パネリスト一覧表示 ※パネリスト・・・映像を配信している者
- パネリスト強制切断
- パネリスト強制ミュート
- 配信ステータス表示（品質、ビットレート、パケロス率等）

### publisher
- 名前を入力して参加リクエストを送信
- 画面共有開始・終了
- 配信ステータス表示（品質、ビットレート、パケロス率等）

### subscriber
- 挙手（参加リクエスト）※承認され参加する時はマイク・カメラOFF状態となる
- 音声を一括OFF

## 確認すべきファイル
```
server:
app/controllers/campaigns_controller.rb
app/services/vonage_service.rb

front:
app/assets/javascripts/utility.js
app/assets/javascripts/vongae_helper.js
app/views/campaigns/_show_moderator.js.erb
app/views/campaigns/_show_publisher.js.erb
app/views/campaigns/_show_subscriber.js.erb

app/views/campaigns/show_moderator.html.erb
app/views/campaigns/show_publisher.html.erb
app/views/campaigns/show_subscriber.html.erb
```

## herokuリンク
```
https://mori-rails-vonage-sample.herokuapp.com/
```
