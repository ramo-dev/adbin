.PHONY: build web run dev clean

web:
	cd web && pnpm install && pnpm build

build: web
	go build -o bin/adb-remote .

run: build
	DEVICE=$(DEVICE) TOKEN=$(TOKEN) ./bin/adb-remote

dev:
	cd web && pnpm dev

clean:
	rm -rf bin web/dist web/node_modules
