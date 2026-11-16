package server

import (
	"net/http"
	"strings"
	"time"
)

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	devs, err := s.ADB.Devices()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	target := s.ADB.Serial
	if target == "" {
		for _, d := range devs {
			if d.State == "device" {
				target = d.Serial
				break
			}
		}
	}
	model := ""
	for _, d := range devs {
		if d.Serial == target {
			model = d.Model
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"devices": devs,
		"target":  target,
		"model":   model,
		"ok":      target != "",
	})
}

func (s *Server) handleConnect(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Addr string `json:"addr"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	body.Addr = strings.TrimSpace(body.Addr)
	if body.Addr == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "addr is required"})
		return
	}
	out, err := s.ADB.Connect(body.Addr)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "output": out})
		return
	}
	devs, _ := s.ADB.Devices()
	writeJSON(w, http.StatusOK, map[string]any{"output": out, "devices": devs})
}

func (s *Server) handleDisconnect(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Addr string `json:"addr"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	out, err := s.ADB.Disconnect(strings.TrimSpace(body.Addr))
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "output": out})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"output": out})
}

func (s *Server) handleInfo(w http.ResponseWriter, r *http.Request) {
	info, err := s.ADB.Info()
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, info)
}

func (s *Server) handleKey(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Key string `json:"key"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	key := strings.TrimSpace(body.Key)
	if key == "" || len(key) > 40 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid key"})
		return
	}
	for _, ch := range key {
		if !(ch >= 'A' && ch <= 'Z') && !(ch >= '0' && ch <= '9') && ch != '_' {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid key"})
			return
		}
	}
	if err := s.ADB.Key(key); err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleText(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Text string `json:"text"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	if err := s.ADB.Text(body.Text); err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleTap(w http.ResponseWriter, r *http.Request) {
	var body struct {
		X int `json:"x"`
		Y int `json:"y"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	if body.X < 0 || body.Y < 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid coordinates"})
		return
	}
	if err := s.ADB.Tap(body.X, body.Y); err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleSwipe(w http.ResponseWriter, r *http.Request) {
	var body struct {
		X1       int `json:"x1"`
		Y1       int `json:"y1"`
		X2       int `json:"x2"`
		Y2       int `json:"y2"`
		Duration int `json:"duration"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	if err := s.ADB.Swipe(body.X1, body.Y1, body.X2, body.Y2, body.Duration); err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleScreenshot(w http.ResponseWriter, r *http.Request) {
	png, err := s.ADB.Screenshot()
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "no-store")
	w.Write(png)
}

func (s *Server) handleShell(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Cmd string `json:"cmd"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	cmd := strings.TrimSpace(body.Cmd)
	if cmd == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "cmd is required"})
		return
	}
	out, err := s.ADB.ShellTimeout(cmd, 2*time.Minute)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "output": out})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"output": out})
}

// --- terminal ---------------------------------------------------------------
