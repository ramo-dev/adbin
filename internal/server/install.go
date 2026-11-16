package server

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/annuar/adb-remote/internal/adb"
)

func (s *Server) handleInstall(w http.ResponseWriter, r *http.Request) {
	ct := r.Header.Get("Content-Type")
	var tmpPath string
	defer func() {
		if tmpPath != "" {
			os.Remove(tmpPath)
		}
	}()

	if strings.HasPrefix(ct, "multipart/form-data") {
		if err := r.ParseMultipartForm(64 << 20); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
			return
		}
		file, hdr, err := r.FormFile("apk")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "apk file is required"})
			return
		}
		defer file.Close()
		tmp, err := os.CreateTemp("", "adb-remote-*.apk")
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		tmpPath = tmp.Name()
		if _, err := io.Copy(tmp, io.LimitReader(file, 1<<30)); err != nil {
			tmp.Close()
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		tmp.Close()
		_ = hdr
	} else {
		var body struct {
			URL string `json:"url"`
		}
		if !readJSON(w, r, &body) {
			return
		}
		if strings.TrimSpace(body.URL) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "url is required"})
			return
		}
		client := &http.Client{Timeout: 10 * time.Minute}
		resp, err := client.Get(body.URL)
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			writeJSON(w, http.StatusBadGateway, map[string]any{"error": fmt.Sprintf("download failed: %s", resp.Status)})
			return
		}
		tmp, err := os.CreateTemp("", "adb-remote-*.apk")
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		tmpPath = tmp.Name()
		if _, err := io.Copy(tmp, io.LimitReader(resp.Body, 1<<30)); err != nil {
			tmp.Close()
			writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
			return
		}
		tmp.Close()
	}

	out, err := s.ADB.Install(tmpPath)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "output": out})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"output": out})
}

func (s *Server) handleAPKUpload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUpload+(16<<20))
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	defer r.MultipartForm.RemoveAll()

	files := r.MultipartForm.File["apk"]
	if len(files) == 0 {
		files = r.MultipartForm.File["file"]
	}
	if len(files) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "apk file is required"})
		return
	}

	out := make([]uploadDTO, 0, len(files))
	for _, hdr := range files {
		f, err := hdr.Open()
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
			return
		}
		item, serr := s.saveUpload(hdr.Filename, f)
		f.Close()
		if serr != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": serr.Error()})
			return
		}
		out = append(out, uploadToDTO(item))
	}
	writeJSON(w, http.StatusOK, map[string]any{"files": out})
}

func (s *Server) handleAPKURL(w http.ResponseWriter, r *http.Request) {
	var body struct {
		URL string `json:"url"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	body.URL = strings.TrimSpace(body.URL)
	if body.URL == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "url is required"})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Minute)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, body.URL, nil)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "download failed: " + resp.Status})
		return
	}

	name := path.Base(resp.Request.URL.Path)
	if name == "" || name == "." || name == "/" || name == "download" {
		name = "download.apk"
	}
	item, err := s.saveUpload(name, resp.Body)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"file": uploadToDTO(item)})
}

func (s *Server) handleAPKInstall(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID string `json:"id"`
		adb.InstallOptions
	}
	if !readJSON(w, r, &body) {
		return
	}

	s.upMu.Lock()
	it := s.uploads[body.ID]
	s.upMu.Unlock()
	if it == nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "upload not found or expired"})
		return
	}

	paths := it.Parts
	if len(paths) == 0 {
		paths = []string{it.Path}
	}

	start := time.Now()
	out, err := s.ADB.InstallFiles(paths, body.InstallOptions)
	res := map[string]any{
		"ok":      err == nil,
		"output":  out,
		"package": it.Meta.Package,
		"label":   it.Meta.Label,
		"name":    it.Name,
		"ms":      time.Since(start).Milliseconds(),
	}
	if err != nil {
		res["error"] = err.Error()
	}
	writeJSON(w, http.StatusOK, res)
}

func (s *Server) handleAPKDiscard(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID string `json:"id"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	s.upMu.Lock()
	it := s.uploads[body.ID]
	delete(s.uploads, body.ID)
	s.upMu.Unlock()
	removeUpload(it)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handlePush(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUpload+(16<<20))
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	defer r.MultipartForm.RemoveAll()

	dir := strings.TrimSpace(r.FormValue("dir"))
	if dir == "" {
		dir = "/sdcard/Download"
	}

	files := r.MultipartForm.File["file"]
	if len(files) == 0 {
		files = r.MultipartForm.File["files"]
	}
	if len(files) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "file is required"})
		return
	}

	type pushed struct {
		Name   string `json:"name"`
		Remote string `json:"remote"`
		Output string `json:"output"`
	}
	out := make([]pushed, 0, len(files))
	for _, hdr := range files {
		src, err := hdr.Open()
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
			return
		}
		tmp, err := os.CreateTemp("", "adb-remote-push-*")
		if err != nil {
			src.Close()
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		_, cerr := io.Copy(tmp, io.LimitReader(src, maxUpload))
		tmp.Close()
		src.Close()
		if cerr != nil {
			os.Remove(tmp.Name())
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": cerr.Error()})
			return
		}
		name := filepath.Base(hdr.Filename)
		remote := path.Join(dir, name)
		output, perr := s.ADB.Push(tmp.Name(), remote)
		os.Remove(tmp.Name())
		if perr != nil {
			writeJSON(w, http.StatusBadGateway, map[string]any{"error": perr.Error(), "output": output})
			return
		}
		out = append(out, pushed{Name: name, Remote: remote, Output: output})
	}
	writeJSON(w, http.StatusOK, map[string]any{"pushed": out})
}

// --- diagnostics & device control --------------------------------------------
