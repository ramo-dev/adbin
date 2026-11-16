package adb

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// Client talks to one adb server. If Serial is empty the first connected
// device is used.
type Client struct {
	Path   string
	Serial string
	AAPT2  string
}

// Device is a row from `adb devices -l`.
type Device struct {
	Serial    string `json:"serial"`
	State     string `json:"state"`
	Model     string `json:"model"`
	Product   string `json:"product"`
	Device    string `json:"device"`
	Transport string `json:"transport"`
}

func New(path string) *Client {
	if strings.TrimSpace(path) == "" {
		path = "adb"
	}
	return &Client{Path: path}
}

func (c *Client) target() (string, error) {
	if c.Serial != "" {
		return c.Serial, nil
	}
	devs, err := c.Devices()
	if err != nil {
		return "", err
	}
	for _, d := range devs {
		if d.State == "device" {
			return d.Serial, nil
		}
	}
	return "", errors.New("no adb device connected")
}

func (c *Client) exec(ctx context.Context, args ...string) (string, string, error) {
	cmd := exec.CommandContext(ctx, c.Path, args...)
	var out, errb bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errb
	err := cmd.Run()
	return out.String(), errb.String(), err
}

// Devices lists every device known to the adb server.
func (c *Client) Devices() ([]Device, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	out, errs, err := c.exec(ctx, "devices", "-l")
	if err != nil {
		return nil, fmt.Errorf("adb devices: %v %s", err, strings.TrimSpace(errs))
	}
	var devs []Device
	for _, line := range strings.Split(out, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "List of devices") || strings.HasPrefix(line, "*") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		d := Device{Serial: fields[0], State: fields[1]}
		for _, f := range fields[2:] {
			k, v, ok := strings.Cut(f, ":")
			if !ok {
				continue
			}
			switch k {
			case "model":
				d.Model = v
			case "product":
				d.Product = v
			case "device":
				d.Device = v
			case "transport_id":
				d.Transport = v
			}
		}
		devs = append(devs, d)
	}
	return devs, nil
}

// Connect attaches to a device over TCP, e.g. 192.168.100.9:5555.
func (c *Client) Connect(addr string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	out, errs, err := c.exec(ctx, "connect", addr)
	res := strings.TrimSpace(out + errs)
	if err != nil {
		return res, errors.New(res)
	}
	return res, nil
}

// Disconnect detaches a TCP device.
func (c *Client) Disconnect(addr string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	out, errs, err := c.exec(ctx, "disconnect", addr)
	res := strings.TrimSpace(out + errs)
	if err != nil {
		return res, errors.New(res)
	}
	return res, nil
}

// Target returns the serial of the device commands run against.
func (c *Client) Target() (string, error) {
	return c.target()
}

func shellQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", `'\''`) + "'"
}
