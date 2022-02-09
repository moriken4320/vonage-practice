FROM ruby:2.5.7
# ベースにするイメージを指定

RUN set -x && curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
  echo 'deb http://dl.yarnpkg.com/debian/ stable main' > /etc/apt/sources.list.d/yarn.list

RUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs default-mysql-client vim yarn
# RailsのインストールやMySQLへの接続に必要なパッケージをインストール

RUN mkdir /nexpro-vonage-sample
# コンテナ内にnexpro-vonage-sampleディレクトリを作成

WORKDIR /nexpro-vonage-sample
# 作成したnexpro-vonage-sampleディレクトリを作業用ディレクトリとして設定

COPY Gemfile /nexpro-vonage-sample/Gemfile
COPY Gemfile.lock /nexpro-vonage-sample/Gemfile.lock
# ローカルの Gemfile と Gemfile.lock をコンテナ内のnexpro-vonage-sample配下にコピー

RUN bundle install
# コンテナ内にコピーした Gemfile の bundle install

COPY . /nexpro-vonage-sample
# ローカルのnexpro-vonage-sample配下のファイルをコンテナ内のnexpro-vonage-sample配下にコピー