package server

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/annuar/adb-remote/internal/apk"
)

type uploadItem struct {
	ID      string
	Name    string
	Path    string
	Parts   []string
	Bundle  bool
	Size    int64
	Meta    apk.Meta
	MetaErr string
	Created time.Time
}

type uploadDTO struct {
	ID      string   `json:"id"`
	Name    string   `json:"name"`
	Size    int64    `json:"size"`
	Bundle  bool     `json:"bundle"`
	Parts   int      `json:"parts"`
	Meta    apk.Meta `json:"meta"`
	Icon    string   `json:"icon,omitempty"`
	MetaErr string   `json:"metaError,omitempty"`
}

func (s *Server) ensureUploadsLocked() {
	if s.uploads != nil {
		return
	}
	s.uploads = map[string]*uploadItem{}
	if dir, err := os.MkdirTemp("", "adb-remote-uploads-*"); err == nil {
		s.uploadDir = dir
	}
	go s.sweepUploads()
}

func (s *Server) sweepUploads() {
	t := time.NewTicker(10 * time.Minute)
	defer t.Stop()
	for range t.C {
		cutoff := time.Now().Add(-time.Hour)
		s.upMu.Lock()
		for id, it := range s.uploads {
			if it.Created.Before(cutoff) {
				removeUpload(it)
				delete(s.uploads, id)
			}
		}
		s.upMu.Unlock()
	}
}

func removeUpload(it *uploadItem) {
	if it == nil {
		return
	}
	_ = os.RemoveAll(it.Path)
	if len(it.Parts) > 0 {
		_ = os.RemoveAll(filepath.Dir(it.Parts[0]))
	}
}

func (s *Server) saveUpload(name string, src io.Reader) (*uploadItem, error) {
	s.upMu.Lock()
	s.ensureUploadsLocked()
	dir := s.uploadDir
	s.upMu.Unlock()
	if dir == "" {
		return nil, errors.New("upload directory unavailable")
	}

	id := newID()
	name = filepath.Base(strings.TrimSpace(name))
	if name == "" || name == "." || name == "/" {
		name = "upload"
	}
	if ext := filepath.Ext(name); ext == "" {
		name += ".apk"
	}

	dstPath := filepath.Join(dir, id+strings.ToLower(filepath.Ext(name)))
	dst, err := os.Create(dstPath)
	if err != nil {
		return nil, err
	}
	n, err := io.Copy(dst, io.LimitReader(src, maxUpload))
	if cerr := dst.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		_ = os.Remove(dstPath)
		return nil, err
	}

	item := &uploadItem{ID: id, Name: name, Path: dstPath, Size: n, Created: time.Now()}
	if apk.IsBundle(name) && apk.HasAPKs(dstPath) {
		if parts, xerr := apk.Expand(dstPath, filepath.Join(dir, id)); xerr == nil && len(parts) > 0 {
			item.Bundle = true
			item.Parts = parts
		}
	}

	inspectPath := item.Path
	if item.Bundle {
		inspectPath = item.Parts[0]
	}
	meta, ierr := apk.Inspect(inspectPath, s.ADB.AAPT2)
	if ierr != nil {
		item.MetaErr = ierr.Error()
	} else {
		meta.Bundle = item.Bundle
		meta.Parts = len(item.Parts)
		if meta.Parts == 0 {
			meta.Parts = 1
		}
		item.Meta = meta
	}

	s.upMu.Lock()
	s.uploads[id] = item
	s.upMu.Unlock()
	return item, nil
}

func uploadToDTO(it *uploadItem) uploadDTO {
	d := uploadDTO{
		ID:      it.ID,
		Name:    it.Name,
		Size:    it.Size,
		Bundle:  it.Bundle,
		Parts:   it.Meta.Parts,
		Meta:    it.Meta,
		MetaErr: it.MetaErr,
	}
	if d.Parts == 0 {
		d.Parts = 1
	}
	if len(it.Meta.Icon) > 0 {
		d.Icon = "data:image/png;base64," + base64.StdEncoding.EncodeToString(it.Meta.Icon)
	}
	return d
}

func newID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}
