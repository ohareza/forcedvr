build:
	web-ext lint --warnings-as-errors --source-dir ${PWD}/src/ --ignore-files='test/**/* README.md'
	web-ext build --overwrite-dest --source-dir ${PWD}/src/ --ignore-files='test/**/* README.md'

run:
	web-ext run --source-dir ${PWD}/src/ --ignore-files='test/**/* README.md'