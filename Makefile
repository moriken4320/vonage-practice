.PHONY: init
init:
	docker-compose up -d --build
	cp .env.example .env
	@make reset
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

.PHONY: seed
seed:
	docker-compose exec web rails db:seed

.PHONY: c
c:
	docker-compose exec web rails c

.PHONY: bundle
bundle:
	docker-compose exec web bundle install

.PHONY: yarn
yarn:
	docker-compose exec web yarn install

.PHONY: format-asset
format-asset:
	$(info Start formatting...)
	# @echo 'eslint auto fix:'
	# docker-compose exec web yarn run lint:js:fix
	@echo 'prettier js auto fix:'
	docker-compose exec web yarn run format:js:fix
	# @echo 'stylelint auto fix:'
	# docker-compose exec web yarn run lint:scss:fix
	# @echo 'prettier scss auto fix:'
	# docker-compose exec web yarn run format:scss:fix