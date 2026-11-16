package adb

import (
	"archive/zip"
	"bufio"
	"context"
	_ "embed"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"
)

//go:embed IconDump.dex
var iconDumpDex []byte

var (
	iconDexOnce sync.Once
	iconDexErr  error
	iconMu      sync.Mutex
)

// AppMeta is a resolved app label and launcher icon.
type AppMeta struct {
	Label string
	Icon  []byte
}

// AppMeta resolves an app's launcher label and icon. It renders the icon on
// the device itself (PackageManager), which works for adaptive/vector icons
// too, then falls back to parsing the APK with aapt2.
func (c *Client) AppMeta(pkg string) (AppMeta, error) {
	label, icon, err := c.AppIcon(pkg)
	if err == nil {
		return AppMeta{Label: label, Icon: icon}, nil
	}
	return c.appMetaFromAPK(pkg)
}

// AppIcon renders the launcher icon on the device and returns its PNG bytes.
func (c *Client) AppIcon(pkg string) (string, []byte, error) {
	if err := c.ensureIconDex(); err != nil {
		return "", nil, err
	}

	iconMu.Lock()
	defer iconMu.Unlock()

	remote := fmt.Sprintf("/data/local/tmp/adb-remote-icon-%d.png", time.Now().UnixNano())
	defer func() {
		_, _ = c.ShellTimeout("rm -f "+shellQuote(remote), 10*time.Second)
	}()

	cmd := fmt.Sprintf(
		"app_process -Djava.class.path=/data/local/tmp/adb-remote-icondump.dex /system/bin IconDump %s %s 192",
		shellQuote(pkg), shellQuote(remote),
	)
	out, err := c.ShellTimeout(cmd, 30*time.Second)
	if err != nil {
		return "", nil, err
	}

	label := ""
	for _, line := range strings.Split(out, "\n") {
		if l, ok := strings.CutPrefix(strings.TrimSpace(line), "label:"); ok {
			label = l
			break
		}
	}

	icon, err := c.ShellBytes("cat "+shellQuote(remote), 15*time.Second)
	if err != nil {
		return label, nil, err
	}
	if len(icon) == 0 {
		return label, nil, errors.New("empty icon")
	}
	return label, icon, nil
}

func (c *Client) ensureIconDex() error {
	iconDexOnce.Do(func() {
		t, err := c.target()
		if err != nil {
			iconDexErr = err
			return
		}
		tmp, err := os.CreateTemp("", "icondump-*.dex")
		if err != nil {
			iconDexErr = err
			return
		}
		defer os.Remove(tmp.Name())
		if _, err := tmp.Write(iconDumpDex); err != nil {
			tmp.Close()
			iconDexErr = err
			return
		}
		tmp.Close()

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if _, errs, err := c.exec(ctx, "-s", t, "push", tmp.Name(), "/data/local/tmp/adb-remote-icondump.dex"); err != nil {
			iconDexErr = fmt.Errorf("push icon dex: %v %s", err, strings.TrimSpace(errs))
		}
	})
	return iconDexErr
}

// appMetaFromAPK pulls the package APK and resolves its label and icon with aapt2.
func (c *Client) appMetaFromAPK(pkg string) (AppMeta, error) {
	var meta AppMeta
	t, err := c.target()
	if err != nil {
		return meta, err
	}

	out, err := c.ShellTimeout("pm path "+shellQuote(pkg), 20*time.Second)
	if err != nil {
		return meta, err
	}
	apkPath := ""
	for _, line := range strings.Split(out, "\n") {
		if p, ok := strings.CutPrefix(strings.TrimSpace(line), "package:"); ok {
			apkPath = p
			break
		}
	}
	if apkPath == "" {
		return meta, fmt.Errorf("no apk for %s", pkg)
	}

	tmp, err := os.CreateTemp("", "adb-remote-*.apk")
	if err != nil {
		return meta, err
	}
	tmpPath := tmp.Name()
	tmp.Close()
	defer os.Remove(tmpPath)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()
	if _, errs, err := c.exec(ctx, "-s", t, "pull", apkPath, tmpPath); err != nil {
		return meta, fmt.Errorf("pull: %v %s", err, strings.TrimSpace(errs))
	}

	aapt := c.AAPT2
	if aapt == "" {
		aapt = "aapt2"
	}
	badging, err := exec.Command(aapt, "dump", "badging", tmpPath).Output()
	if err != nil {
		return meta, fmt.Errorf("aapt2: %v", err)
	}

	label, iconPath := parseBadging(string(badging))
	meta.Label = label
	if iconPath != "" {
		meta.Icon = extractZipFile(tmpPath, iconPath)
	}
	return meta, nil
}

func parseBadging(out string) (string, string) {
	label := ""
	fallback := ""
	icons := map[int]string{}

	sc := bufio.NewScanner(strings.NewReader(out))
	for sc.Scan() {
		line := sc.Text()
		if strings.HasPrefix(line, "application-label:") {
			label = strings.Trim(strings.TrimPrefix(line, "application-label:"), "'")
		}
		if strings.HasPrefix(line, "application-icon-") {
			rest := strings.TrimPrefix(line, "application-icon-")
			dpiPart, pathPart, ok := strings.Cut(rest, ":")
			if !ok {
				continue
			}
			dpi, err := strconv.Atoi(dpiPart)
			if err != nil {
				continue
			}
			p := strings.Trim(pathPart, "'")
			if strings.HasSuffix(strings.ToLower(p), ".png") {
				icons[dpi] = p
			}
		}
		if strings.HasPrefix(line, "application:") {
			if i := strings.Index(line, "icon='"); i >= 0 {
				rest := line[i+len("icon='"):]
				if j := strings.Index(rest, "'"); j >= 0 {
					p := rest[:j]
					if strings.HasSuffix(strings.ToLower(p), ".png") {
						fallback = p
					}
				}
			}
		}
	}

	best := fallback
	bestDPI := -1
	for dpi, p := range icons {
		if dpi > bestDPI {
			bestDPI = dpi
			best = p
		}
	}
	return label, best
}

func extractZipFile(apk, name string) []byte {
	zr, err := zip.OpenReader(apk)
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
