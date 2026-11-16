package adb

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

// Apps lists installed packages.
func (c *Client) Apps(all bool) ([]string, error) {
	flag := "-3"
	if all {
		flag = ""
	}
	out, err := c.ShellTimeout("pm list packages "+flag, 30*time.Second)
	if err != nil {
		return nil, err
	}
	var pkgs []string
	for _, line := range strings.Split(out, "\n") {
		line = strings.TrimSpace(line)
		if p, ok := strings.CutPrefix(line, "package:"); ok && p != "" {
			pkgs = append(pkgs, p)
		}
	}
	return pkgs, nil
}

// Launch opens an app, trying leanback, then launcher, then the resolved activity.
func (c *Client) Launch(pkg string) (string, error) {
	pkg = strings.TrimSpace(pkg)
	if pkg == "" {
		return "", errors.New("empty package")
	}
	for _, cat := range []string{"android.intent.category.LEANBACK_LAUNCHER", "android.intent.category.LAUNCHER"} {
		out, err := c.ShellTimeout("monkey -p "+shellQuote(pkg)+" -c "+cat+" 1", 20*time.Second)
		if err == nil && !strings.Contains(out, "No activities found") {
			return strings.TrimSpace(out), nil
		}
	}
	out, err := c.ShellTimeout("cmd package resolve-activity --brief "+shellQuote(pkg), 15*time.Second)
	if err == nil {
		for _, line := range strings.Split(out, "\n") {
			line = strings.TrimSpace(line)
			if strings.Contains(line, "/") && !strings.HasPrefix(line, "priority=") {
				if start, serr := c.ShellTimeout("am start -n "+shellQuote(line), 20*time.Second); serr == nil {
					return strings.TrimSpace(start), nil
				}
			}
		}
	}
	return "", fmt.Errorf("could not launch %s", pkg)
}
