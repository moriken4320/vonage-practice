## 環境構築手順
1. 以下のコマンドを順に実行
```
$ git clone git@github.com:moriken4320/nexpro-vonage-sample.git
$ cd nexpro-vonage-sample
$ make init
```

2. envファイルを編集
```
API_KEY=[vonageのapi_key]
SECRET_KEY=[vonageのsecret_key]
```
↑各値は[vonageのコンソール画面](https://tokbox.com/account)で確認できる。

※環境変数を編集しても反映されない場合は、dockerコンテナをリスタートしてください。

3. `localhost:3000` でアクセスし、表示確認。

## アドミン・ユーザー情報
admin
```
email:
admin@example.com

password:
123456
```

user
```
email:
user@example.com

password:
123456
```

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
