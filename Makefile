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

.PHONY: console
console:
	docker-compose exec web rails c

.PHONY: bundle
bundle:
	docker-compose exec web bundle install

.PHONY: yarn
yarn:
	docker-compose exec web yarn install