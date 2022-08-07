run:
	web-ext run \
		--firefox-profile default-release \
		--source-dir=${PWD}/src/ \
		--ignore-files='test/** README.md'

lint:
	web-ext lint --warnings-as-errors --source-dir=${PWD}/src/ --ignore-files='test/** README.md'

build: lint
	web-ext build --overwrite-dest --source-dir=${PWD}/src/ --ignore-files='test/** README.md'

deploy: lint
	web-ext sign \
		--api-key=$$(cat secrets/api-key) \
		--api-secret=$$(cat secrets/api-secret) \
		--channel=listed \
		--source-dir=${PWD}/src/ \
		--ignore-files='test/** README.md'

.PHONY: run lint build deploy
