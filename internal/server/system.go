package server

import (
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	s.appsMu.Lock()
	s.ensureApps()
	icons := len(s.icons)
	cacheDir := s.cacheDir
	s.appsMu.Unlock()

	s.upMu.Lock()
	s.ensureUploadsLocked()
	uploadDir := s.uploadDir
	s.upMu.Unlock()

	version := s.Version
	if version == "" {
		version = "dev"
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"version":       version,
		"goVersion":     runtime.Version(),
		"os":            runtime.GOOS,
		"arch":          runtime.GOARCH,
		"uptimeSeconds": int64(time.Since(s.started).Seconds()),
		"adbPath":       s.ADB.Path,
		"adbVersion":    s.ADB.Version(),
		"aapt2":         s.ADB.AAPT2,
		"tokenRequired": s.Token != "",
		"device":        s.ADB.Serial,
		"cacheDir":      cacheDir,
		"iconCount":     icons,
		"uploadDir":     uploadDir,
	})
}

func (s *Server) handleDiscover(w http.ResponseWriter, r *http.Request) {
	svcs, err := s.ADB.Mdns()
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"services": svcs})
}

func (s *Server) handleADBRestart(w http.ResponseWriter, r *http.Request) {
	out, err := s.ADB.RestartServer()
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "output": out})
		return
	}
	if addr := s.ADB.Serial; strings.Contains(addr, ":") {
		if conn, cerr := s.ADB.Connect(addr); cerr == nil {
			out = strings.TrimSpace(out + "\n" + conn)
		} else {
			out = strings.TrimSpace(out + "\n" + conn)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"output": out})
}

func (s *Server) handleReboot(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Mode string `json:"mode"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	mode := strings.TrimSpace(body.Mode)
	switch mode {
	case "", "recovery", "bootloader", "sideload":
	default:
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid reboot mode"})
		return
	}
	out, err := s.ADB.Reboot(mode)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "output": out})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"output": out})
}

func (s *Server) handleCacheClear(w http.ResponseWriter, r *http.Request) {
	s.appsMu.Lock()
	if s.cacheDir != "" {
		_ = os.RemoveAll(filepath.Join(s.cacheDir, "icons"))
		_ = os.Remove(filepath.Join(s.cacheDir, "meta.json"))
	}
	s.apps = nil
	s.icons = nil
	s.indexing = nil
	s.sem = nil
	s.appsMu.Unlock()
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
