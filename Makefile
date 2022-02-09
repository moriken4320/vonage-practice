.PHONY: init
init:
	docker-compose up -d --build
	cp .env.example .env
	@make reset
	@make migrate
	@make yarn

.PHONY: up
up:
	docker-compose up -d

.PHONY: stop
stop:
	docker-compose stop

.PHONY: down
down:
	docker-compose down

.PHONY: ps
ps:
	docker ps


.PHONY: rails
rails:
	docker-compose exec web bash

.PHONY: mysql
mysql:
	docker-compose exec db bash


.PHONY: migrate
migrate:
	docker-compose exec web rails db:migrate

.PHONY: rollback
rollback:
	docker-compose exec web rails db:rollback

.PHONY: reset
reset:
	docker-compose exec web rails db:reset

.PHONY: c
c:
	docker-compose exec web rails c

.PHONY: bundle
bundle:
	docker-compose exec web bundle install

.PHONY: yarn
yarn:
	docker-compose exec web yarn install