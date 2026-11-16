package adb

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// Info is a small device report used by the UI.
type Info struct {
	Model         string `json:"model"`
	Manufacturer  string `json:"manufacturer"`
	Android       string `json:"android"`
	SDK           string `json:"sdk"`
	ABI           string `json:"abi"`
	Serial        string `json:"serial"`
	Width         int    `json:"width"`
	Height        int    `json:"height"`
	Density       string `json:"density"`
	BatteryLevel  string `json:"batteryLevel"`
	BatteryStatus string `json:"batteryStatus"`
	Uptime        string `json:"uptime"`
	StorageTotal  string `json:"storageTotal"`
	StorageFree   string `json:"storageFree"`
}

// Info collects a compact device report.
func (c *Client) Info() (Info, error) {
	var in Info
	get := func(prop string) string {
		out, _ := c.ShellTimeout("getprop "+prop, 10*time.Second)
		return strings.TrimSpace(out)
	}
	in.Model = get("ro.product.model")
	in.Manufacturer = get("ro.product.manufacturer")
	in.Android = get("ro.build.version.release")
	in.SDK = get("ro.build.version.sdk")
	in.ABI = get("ro.product.cpu.abi")
	in.Serial = get("ro.serialno")
	if in.Serial == "" {
		in.Serial, _ = c.target()
	}

	if out, err := c.ShellTimeout("wm size", 10*time.Second); err == nil {
		in.Width, in.Height = parseSize(out)
	}
	if out, err := c.ShellTimeout("wm density", 10*time.Second); err == nil {
		in.Density = strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(out), "Physical density:"))
	}
	if out, err := c.ShellTimeout("dumpsys battery", 10*time.Second); err == nil {
		for _, line := range strings.Split(out, "\n") {
			line = strings.TrimSpace(line)
			if v, ok := strings.CutPrefix(line, "level:"); ok {
				in.BatteryLevel = strings.TrimSpace(v)
			}
			if v, ok := strings.CutPrefix(line, "status:"); ok {
				in.BatteryStatus = batteryStatus(strings.TrimSpace(v))
			}
		}
	}
	if out, err := c.ShellTimeout("uptime", 10*time.Second); err == nil {
		in.Uptime = strings.TrimSpace(out)
	}
	if out, err := c.ShellTimeout("df -k /data", 10*time.Second); err == nil {
		in.StorageTotal, in.StorageFree = parseDF(out)
	}
	return in, nil
}

// parseDF reads `df -k /data` (1K blocks) and returns human-readable totals.
func parseDF(out string) (total, free string) {
	for _, line := range strings.Split(out, "\n") {
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}
		// Filesystem 1K-blocks Used Available Use% Mounted
		size, err1 := strconv.ParseInt(fields[1], 10, 64)
		avail, err2 := strconv.ParseInt(fields[3], 10, 64)
		if err1 != nil || err2 != nil {
			continue
		}
		return humanBytes(size * 1024), humanBytes(avail * 1024)
	}
	return "", ""
}

func humanBytes(n int64) string {
	const unit = 1024
	if n < unit {
		return fmt.Sprintf("%d B", n)
	}
	div, exp := int64(unit), 0
	for x := n / unit; x >= unit; x /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(n)/float64(div), "KMGTPE"[exp])
}

func parseSize(out string) (int, int) {
	// "Physical size: 1280x720" or "Override size: 1280x720"
	for _, line := range strings.Split(out, "\n") {
		line = strings.TrimSpace(line)
		if strings.Contains(line, ":") {
			_, v, _ := strings.Cut(line, ":")
			v = strings.TrimSpace(v)
			w, h, ok := strings.Cut(v, "x")
			if !ok {
				continue
			}
			wi, err1 := strconv.Atoi(strings.TrimSpace(w))
			hi, err2 := strconv.Atoi(strings.TrimSpace(h))
			if err1 == nil && err2 == nil {
				return wi, hi
			}
		}
	}
	return 0, 0
}

func batteryStatus(v string) string {
	switch v {
	case "1":
		return "unknown"
	case "2":
		return "charging"
	case "3":
		return "discharging"
	case "4":
		return "not charging"
	case "5":
		return "full"
	default:
		return v
	}
}
