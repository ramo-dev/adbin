package server

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type appEntry struct {
	Label    string `json:"label"`
	Version  int64  `json:"version"`
	Resolved bool   `json:"resolved"`
}

type appDTO struct {
	Package     string `json:"package"`
	Label       string `json:"label"`
	HasIcon     bool   `json:"hasIcon"`
	IconVersion int64  `json:"iconVersion"`
	Resolved    bool   `json:"resolved"`
}

func (s *Server) handleApps(w http.ResponseWriter, r *http.Request) {
	all := r.URL.Query().Get("all") == "1"
	pkgs, err := s.ADB.Apps(all)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}

	s.appsMu.Lock()
	s.ensureApps()
	out := make([]appDTO, 0, len(pkgs))
	var toIndex []string
	pending := 0
	for _, p := range pkgs {
		e := s.apps[p]
		if e == nil {
			e = &appEntry{Label: prettifyPackage(p)}
			s.apps[p] = e
			toIndex = append(toIndex, p)
		}
		hasIcon := len(s.icons[p]) > 0
		if !e.Resolved {
			pending++
		}
		out = append(out, appDTO{Package: p, Label: e.Label, HasIcon: hasIcon, IconVersion: e.Version, Resolved: e.Resolved})
	}
	s.appsMu.Unlock()

	for _, p := range toIndex {
		s.enqueueApp(p)
	}

	writeJSON(w, http.StatusOK, map[string]any{"apps": out, "pending": pending})
}

func (s *Server) handleAppIcon(w http.ResponseWriter, r *http.Request) {
	pkg := strings.TrimSpace(r.URL.Query().Get("pkg"))
	if pkg == "" {
		http.Error(w, "pkg is required", http.StatusBadRequest)
		return
	}
	s.appsMu.Lock()
	icon := s.icons[pkg]
	s.appsMu.Unlock()
	if len(icon) == 0 {
		http.Error(w, "icon not ready", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Write(icon)
}

func (s *Server) ensureApps() {
	if s.apps == nil {
		s.apps = map[string]*appEntry{}
		s.icons = map[string][]byte{}
		s.indexing = map[string]bool{}
		s.sem = make(chan struct{}, 2)
		s.cacheDir = defaultCacheDir()
		s.loadCacheLocked()
	}
}

func defaultCacheDir() string {
	dir, err := os.UserCacheDir()
	if err != nil {
		return ""
	}
	p := filepath.Join(dir, "adb-remote", "apps")
	_ = os.MkdirAll(filepath.Join(p, "icons"), 0o755)
	return p
}

func (s *Server) loadCacheLocked() {
	if s.cacheDir == "" {
		return
	}
	data, err := os.ReadFile(filepath.Join(s.cacheDir, "meta.json"))
	if err != nil {
		return
	}
	var m map[string]appEntry
	if json.Unmarshal(data, &m) != nil {
		return
	}
	for p, e := range m {
		entry := e
		s.apps[p] = &entry
		if icon, err := os.ReadFile(filepath.Join(s.cacheDir, "icons", p+".png")); err == nil {
			s.icons[p] = icon
		}
	}
}

func (s *Server) saveCacheLocked() {
	if s.cacheDir == "" {
		return
	}
	m := make(map[string]appEntry, len(s.apps))
	for p, e := range s.apps {
		m[p] = *e
	}
	data, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(filepath.Join(s.cacheDir, "meta.json"), data, 0o644)
}

func (s *Server) enqueueApp(pkg string) {
	s.appsMu.Lock()
	if s.indexing[pkg] {
		s.appsMu.Unlock()
		return
	}
	s.indexing[pkg] = true
	s.appsMu.Unlock()

	go func() {
		s.sem <- struct{}{}
		defer func() {
			<-s.sem
			s.appsMu.Lock()
			s.indexing[pkg] = false
			s.appsMu.Unlock()
		}()

		meta, err := s.ADB.AppMeta(pkg)
		s.appsMu.Lock()
		e := s.apps[pkg]
		if e == nil {
			e = &appEntry{Label: prettifyPackage(pkg)}
			s.apps[pkg] = e
		}
		if err == nil {
			if meta.Label != "" {
				e.Label = meta.Label
			}
			if len(meta.Icon) > 0 {
				s.icons[pkg] = meta.Icon
				if s.cacheDir != "" {
					_ = os.WriteFile(filepath.Join(s.cacheDir, "icons", pkg+".png"), meta.Icon, 0o644)
				}
			}
		}
		e.Resolved = true
		e.Version = time.Now().UnixNano()
		s.saveCacheLocked()
		s.appsMu.Unlock()
	}()
}

func prettifyPackage(pkg string) string {
	parts := strings.Split(pkg, ".")
	name := parts[len(parts)-1]
	if name == "" {
		return pkg
	}
	return strings.ToUpper(name[:1]) + name[1:]
}

func (s *Server) handleLaunch(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Package string `json:"package"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	out, err := s.ADB.Launch(body.Package)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "output": out})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"output": out})
}

func (s *Server) handleUninstall(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Package string `json:"package"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	out, err := s.ADB.Uninstall(body.Package)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"output": out})
}
