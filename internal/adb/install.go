package adb

import (
	"context"
	"errors"
	"strings"
	"time"
)

// InstallOptions controls how `adb install` behaves.
type InstallOptions struct {
	Reinstall bool `json:"reinstall"`
	Downgrade bool `json:"downgrade"`
	GrantAll  bool `json:"grantAll"`
}

// InstallFiles installs one APK or a split bundle via install-multiple.
func (c *Client) InstallFiles(paths []string, opt InstallOptions) (string, error) {
	if len(paths) == 0 {
		return "", errors.New("no apk to install")
	}
	t, err := c.target()
	if err != nil {
		return "", err
	}
	sub := "install"
	if len(paths) > 1 {
		sub = "install-multiple"
	}
	args := []string{"-s", t, sub}
	if opt.Reinstall {
		args = append(args, "-r")
	}
	if opt.Downgrade {
		args = append(args, "-d")
	}
	if opt.GrantAll {
		args = append(args, "-g")
	}
	args = append(args, paths...)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()
	out, errs, err := c.exec(ctx, args...)
	res := strings.TrimSpace(out + errs)
	if err != nil {
		if res == "" {
			res = err.Error()
		}
		return res, errors.New(res)
	}
	if !strings.Contains(res, "Success") {
		if res == "" {
			return res, errors.New("install did not report success")
		}
		return res, errors.New(res)
	}
	return res, nil
}

// Install installs a single APK, keeping the previous reinstall behaviour.
func (c *Client) Install(path string) (string, error) {
	return c.InstallFiles([]string{path}, InstallOptions{Reinstall: true})
}

// Push copies a local file to a path on the device.
func (c *Client) Push(local, remote string) (string, error) {
	t, err := c.target()
	if err != nil {
		return "", err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	out, errs, err := c.exec(ctx, "-s", t, "push", local, remote)
	res := strings.TrimSpace(out + errs)
	if err != nil {
		if res == "" {
			res = err.Error()
		}
		return res, errors.New(res)
	}
	return res, nil
}

// Reboot reboots the device. mode may be empty, "recovery" or "bootloader".
func (c *Client) Reboot(mode string) (string, error) {
	t, err := c.target()
	if err != nil {
		return "", err
	}
	args := []string{"-s", t, "reboot"}
	if mode != "" {
		args = append(args, mode)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	out, errs, err := c.exec(ctx, args...)
	res := strings.TrimSpace(out + errs)
	if err != nil {
		if res == "" {
			res = err.Error()
		}
		return res, errors.New(res)
	}
	return res, nil
}

// Version returns the first line of `adb version`.
func (c *Client) Version() string {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	out, _, err := c.exec(ctx, "version")
	if err != nil {
		return ""
	}
	line, _, _ := strings.Cut(strings.TrimSpace(out), "\n")
	return strings.TrimSpace(line)
}

// RestartServer kills and restarts the adb server.
func (c *Client) RestartServer() (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	var log strings.Builder
	if out, errs, err := c.exec(ctx, "kill-server"); err != nil {
		log.WriteString(strings.TrimSpace(out + errs))
		log.WriteString("\n")
	}
	out, errs, err := c.exec(ctx, "start-server")
	log.WriteString(strings.TrimSpace(out + errs))
	if err != nil {
		return strings.TrimSpace(log.String()), errors.New(strings.TrimSpace(log.String()))
	}
	return strings.TrimSpace(log.String()), nil
}

// Uninstall removes a package.
func (c *Client) Uninstall(pkg string) (string, error) {
	_, err := c.ShellTimeout("pm uninstall "+shellQuote(pkg), 60*time.Second)
	if err != nil {
		return "", err
	}
	return "uninstalled " + pkg, nil
}

// MdnsService is a row from `adb mdns services`.
type MdnsService struct {
	Name    string `json:"name"`
	Service string `json:"service"`
	Addr    string `json:"addr"`
}

// Mdns lists devices advertising ADB over mDNS.
func (c *Client) Mdns() ([]MdnsService, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	out, errs, err := c.exec(ctx, "mdns", "services")
	if err != nil {
		msg := strings.TrimSpace(out + errs)
		if msg == "" {
			msg = err.Error()
		}
		return nil, errors.New(msg)
	}
	var svcs []MdnsService
	for _, line := range strings.Split(out, "\n") {
		fields := strings.Fields(line)
		if len(fields) < 3 || strings.HasPrefix(line, "List of") {
			continue
		}
		svcs = append(svcs, MdnsService{Name: fields[0], Service: fields[1], Addr: fields[2]})
	}
	return svcs, nil
}
