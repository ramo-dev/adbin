// Package apk reads APK metadata and unpacks split-APK bundles.
//
// Inspection shells out to aapt2 because parsing the binary AndroidManifest
// by hand is not worth it here; aapt2 ships with the Android SDK build-tools
// and is already used by the icon fallback.
package apk

import (
	"archive/zip"
	"bufio"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

// Meta is the subset of an APK manifest the UI shows.
type Meta struct {
	Package     string   `json:"package"`
	Label       string   `json:"label"`
	VersionName string   `json:"versionName"`
	VersionCode int64    `json:"versionCode"`
	MinSDK      int      `json:"minSdk"`
	TargetSDK   int      `json:"targetSdk"`
	ABIs        []string `json:"abis"`
	Bundle      bool     `json:"bundle"`
	Parts       int      `json:"parts"`
	Icon        []byte   `json:"-"`
}

// IsBundle reports whether name looks like a split-APK container.
func IsBundle(name string) bool {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".xapk", ".apkm", ".apks", ".zip":
		return true
	}
	return false
}

// Inspect reads package, label, version, SDK levels and icon from an APK.
func Inspect(path, aapt2 string) (Meta, error) {
	var m Meta
	if aapt2 == "" {
		aapt2 = "aapt2"
	}
	out, err := exec.Command(aapt2, "dump", "badging", path).Output()
	if err != nil {
		return m, fmt.Errorf("aapt2: %w", err)
	}
	iconPath := ""
	sc := bufio.NewScanner(strings.NewReader(string(out)))
	sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for sc.Scan() {
		line := sc.Text()
		switch {
		case strings.HasPrefix(line, "package:"):
			m.Package = attr(line, "name")
			m.VersionName = attr(line, "versionName")
			if v := attr(line, "versionCode"); v != "" {
				m.VersionCode, _ = strconv.ParseInt(v, 10, 64)
			}
		case strings.HasPrefix(line, "sdkVersion:"):
			m.MinSDK = atoi(strings.Trim(strings.TrimPrefix(line, "sdkVersion:"), "'"))
		case strings.HasPrefix(line, "targetSdkVersion:"):
			m.TargetSDK = atoi(strings.Trim(strings.TrimPrefix(line, "targetSdkVersion:"), "'"))
		case strings.HasPrefix(line, "application-label:"):
			m.Label = strings.Trim(strings.TrimPrefix(line, "application-label:"), "'")
		case strings.HasPrefix(line, "application-icon-"):
			rest := strings.TrimPrefix(line, "application-icon-")
			dpiPart, p, ok := strings.Cut(rest, ":")
			if !ok {
				continue
			}
			p = strings.Trim(p, "'")
			if strings.HasSuffix(strings.ToLower(p), ".png") {
				if iconPath == "" || atoi(dpiPart) > iconDPI(iconPath) {
					iconPath = p
				}
			}
		case strings.HasPrefix(line, "native-code:"):
			m.ABIs = quotedList(strings.TrimPrefix(line, "native-code:"))
		}
	}
	if m.Label == "" {
		m.Label = m.Package
	}
	if iconPath != "" {
		m.Icon = extract(path, iconPath)
	}
	return m, nil
}

// Expand extracts every *.apk inside a bundle into dest and returns the paths,
// base.apk first. It errors when the archive holds no APKs.
func Expand(path, dest string) ([]string, error) {
	zr, err := zip.OpenReader(path)
	if err != nil {
		return nil, fmt.Errorf("bundle: %w", err)
	}
	defer zr.Close()

	if err := os.MkdirAll(dest, 0o755); err != nil {
		return nil, err
	}

	var names []string
	for _, f := range zr.File {
		if !strings.HasSuffix(strings.ToLower(f.Name), ".apk") || f.FileInfo().IsDir() {
			continue
		}
		names = append(names, f.Name)
	}
	if len(names) == 0 {
		return nil, errors.New("archive contains no apk files")
	}
	sort.SliceStable(names, func(i, j int) bool {
		return strings.EqualFold(filepath.Base(names[i]), "base.apk") && !strings.EqualFold(filepath.Base(names[j]), "base.apk")
	})

	var out []string
	for i, name := range names {
		src, err := zr.Open(name)
		if err != nil {
			return nil, err
		}
		base := filepath.Base(name)
		if !strings.HasSuffix(strings.ToLower(base), ".apk") {
			base = fmt.Sprintf("part-%d.apk", i)
		}
		dstPath := filepath.Join(dest, fmt.Sprintf("%02d-%s", i, base))
		dst, err := os.Create(dstPath)
		if err != nil {
			src.Close()
			return nil, err
		}
		_, cerr := io.Copy(dst, io.LimitReader(src, 1<<31))
		dst.Close()
		src.Close()
		if cerr != nil {
			return nil, cerr
		}
		out = append(out, dstPath)
	}
	return out, nil
}

// HasAPKs reports whether the zip file contains at least one apk entry.
func HasAPKs(path string) bool {
	zr, err := zip.OpenReader(path)
	if err != nil {
		return false
	}
	defer zr.Close()
	for _, f := range zr.File {
		if strings.HasSuffix(strings.ToLower(f.Name), ".apk") {
			return true
		}
	}
	return false
}

func iconDPI(path string) int {
	// res/mipmap-xxxhdpi-v4/ic_launcher.png → 640
	dpi := map[string]int{"ldpi": 120, "mdpi": 160, "hdpi": 240, "xhdpi": 320, "xxhdpi": 480, "xxxhdpi": 640}
	for k, v := range dpi {
		if strings.Contains(path, "mipmap-"+k) || strings.Contains(path, "drawable-"+k) {
			return v
		}
	}
	return 0
}

func attr(line, key string) string {
	needle := key + "='"
	i := strings.Index(line, needle)
	if i < 0 {
		return ""
	}
	rest := line[i+len(needle):]
	if j := strings.Index(rest, "'"); j >= 0 {
		return rest[:j]
	}
	return ""
}

func quotedList(s string) []string {
	var out []string
	for _, f := range strings.Fields(s) {
		f = strings.Trim(f, "'")
		if f != "" {
			out = append(out, f)
		}
	}
	return out
}

func atoi(s string) int {
	n, _ := strconv.Atoi(strings.TrimSpace(s))
	return n
}

func extract(apkPath, name string) []byte {
	zr, err := zip.OpenReader(apkPath)
	if err != nil {
		return nil
	}
	defer zr.Close()
	for _, f := range zr.File {
		if f.Name != name {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return nil
		}
		defer rc.Close()
		data, err := io.ReadAll(io.LimitReader(rc, 4<<20))
		if err != nil {
			return nil
		}
		return data
	}
	return nil
}
