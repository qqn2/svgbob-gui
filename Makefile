.PHONY: install dev build preview test typecheck check svg svg-all

ASCII_SRC ?= examples/diagram.txt
SVG_OUT ?= examples/diagram.svg

install:
	npm install

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

test:
	npm test

typecheck:
	npm run typecheck

check: typecheck test build

svg:
	@test -f "$(ASCII_SRC)" || (echo "Missing $(ASCII_SRC)"; exit 1)
	npx vite-node scripts/render-cli.ts "$(ASCII_SRC)" "$(SVG_OUT)"

svg-all:
	@for f in examples/*.txt docs/engdoc/img/ascii/*.txt; do \
	  if [ -f "$$f" ]; then \
	    out="$${f%.txt}.svg"; \
	    echo "$$f -> $$out"; \
	    npx vite-node scripts/render-cli.ts "$$f" "$$out"; \
	  fi; \
	done
