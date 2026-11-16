package server

import (
	"crypto/subtle"
	"io/fs"
	"net/http"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/annuar/adb-remote/internal/adb"
)

// maxUpload caps a single upload (APKs are big, but not this big).
const maxUpload = int64(2) << 30

type Server struct {
	ADB     *adb.Client
	Token   string
	Static  fs.FS
	Version string

	started time.Time

	appsMu   sync.Mutex
	apps     map[string]*appEntry
	icons    map[string][]byte
	indexing map[string]bool
	sem      chan struct{}
	cacheDir string

	upMu      sync.Mutex
	uploads   map[string]*uploadItem
	uploadDir string
}

func (s *Server) Handler() http.Handler {
	if s.started.IsZero() {
		s.started = time.Now()
	}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	})
	mux.HandleFunc("GET /api/status", s.handleStatus)
	mux.HandleFunc("POST /api/connect", s.handleConnect)
	mux.HandleFunc("POST /api/disconnect", s.handleDisconnect)
	mux.HandleFunc("GET /api/info", s.handleInfo)
	mux.HandleFunc("POST /api/key", s.handleKey)
	mux.HandleFunc("POST /api/text", s.handleText)
	mux.HandleFunc("POST /api/tap", s.handleTap)
	mux.HandleFunc("POST /api/swipe", s.handleSwipe)
	mux.HandleFunc("GET /api/apps", s.handleApps)
	mux.HandleFunc("GET /api/apps/icon", s.handleAppIcon)
	mux.HandleFunc("POST /api/apps/launch", s.handleLaunch)
	mux.HandleFunc("POST /api/apps/uninstall", s.handleUninstall)
	mux.HandleFunc("GET /api/screenshot", s.handleScreenshot)
	mux.HandleFunc("POST /api/install", s.handleInstall)
	mux.HandleFunc("POST /api/shell", s.handleShell)

	mux.HandleFunc("GET /api/ws/terminal", s.handleTerminal)
	mux.HandleFunc("POST /api/apk/upload", s.handleAPKUpload)
	mux.HandleFunc("POST /api/apk/url", s.handleAPKURL)
	mux.HandleFunc("POST /api/apk/install", s.handleAPKInstall)
	mux.HandleFunc("POST /api/apk/discard", s.handleAPKDiscard)
	mux.HandleFunc("POST /api/push", s.handlePush)
	mux.HandleFunc("GET /api/config", s.handleConfig)
	mux.HandleFunc("GET /api/discover", s.handleDiscover)
	mux.HandleFunc("POST /api/adb/restart", s.handleADBRestart)
	mux.HandleFunc("POST /api/device/reboot", s.handleReboot)
	mux.HandleFunc("POST /api/cache/clear", s.handleCacheClear)

	mux.Handle("/", s.staticHandler())

	return s.cors(s.auth(mux))
}

func (s *Server) auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.Token != "" && strings.HasPrefix(r.URL.Path, "/api/") {
			got := r.Header.Get("X-Auth-Token")
			if got == "" {
				got = r.URL.Query().Get("token")
			}
			if subtle.ConstantTimeCompare([]byte(got), []byte(s.Token)) != 1 {
				writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Auth-Token")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) staticHandler() http.Handler {
	fileServer := http.FileServer(http.FS(s.Static))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if p == "" || p == "." {
			p = "index.html"
		}
		if _, err := fs.Stat(s.Static, p); err != nil {
			r.URL.Path = "/"
			p = "index.html"
		}
		if p == "index.html" {
			w.Header().Set("Cache-Control", "no-cache")
		}
		fileServer.ServeHTTP(w, r)
	})
}
