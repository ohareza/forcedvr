.PHONY: test lint build run package

test:
	npm test

lint:
	npm run lint

build:
	npm run build

run: build
	npm exec -- web-ext run --source-dir dist/firefox

package:
	npm run package
