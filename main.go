package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"time"

	"github.com/annuar/adb-remote/internal/adb"
	"github.com/annuar/adb-remote/internal/server"
)

//go:embed all:web/dist
var dist embed.FS

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func main() {
	addr := env("ADDR", ":8080")
	client := adb.New(env("ADB_PATH", "adb"))
	client.Serial = os.Getenv("DEVICE")
	client.AAPT2 = env("AAPT2", detectAAPT2())

	static, err := fs.Sub(dist, "web/dist")
	if err != nil {
		log.Fatal(err)
	}

	s := &server.Server{
		ADB:    client,
		Token:  os.Getenv("TOKEN"),
		Static: static,
	}

	srv := &http.Server{
		Addr:              addr,
		Handler:           s.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	log.Printf("ADBIN listening on %s (device=%q)", addr, client.Serial)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func detectAAPT2() string {
	if p, err := exec.LookPath("aapt2"); err == nil {
		return p
	}
	var roots []string
	if sdk := os.Getenv("ANDROID_HOME"); sdk != "" {
		roots = append(roots, filepath.Join(sdk, "build-tools"))
	}
	if sdk := os.Getenv("ANDROID_SDK_ROOT"); sdk != "" {
		roots = append(roots, filepath.Join(sdk, "build-tools"))
	}
	if home, err := os.UserHomeDir(); err == nil {
		roots = append(roots,
			filepath.Join(home, "Library/Android/sdk/build-tools"),
			filepath.Join(home, "Android/Sdk/build-tools"),
		)
	}
	for _, root := range roots {
		entries, err := os.ReadDir(root)
		if err != nil {
			continue
		}
		names := make([]string, 0, len(entries))
		for _, e := range entries {
			if e.IsDir() {
				names = append(names, e.Name())
			}
		}
		sort.Sort(sort.Reverse(sort.StringSlice(names)))
		for _, name := range names {
			p := filepath.Join(root, name, "aapt2")
			if _, err := os.Stat(p); err == nil {
				return p
			}
		}
	}
	return ""
}
