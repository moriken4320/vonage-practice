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

.PHONY: redis
redis:
	docker-compose exec redis redis-cli


.PHONY: migrate
migrate:
	docker-compose exec web php artisan migrate

.PHONY: rollback
rollback:
	docker-compose exec web php artisan migrate:rollback

.PHONY: fresh
fresh:
	docker-compose exec web php artisan migrate:fresh

.PHONY: seed
seed:
	@make fresh
	docker-compose exec web php artisan db:seed

.PHONY: tinker
tinker:
	docker-compose exec web php artisan tinker

.PHONY: bundle
bundle:
	docker-compose exec web bundle install

.PHONY: yarn
yarn:
	docker-compose exec web yarn install