package adb

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/creack/pty"
)

// Shell runs a command through the device shell and returns stdout.
func (c *Client) Shell(cmd string) (string, error) {
	return c.ShellTimeout(cmd, 60*time.Second)
}

// ShellTimeout is Shell with an explicit timeout.
func (c *Client) ShellTimeout(cmd string, d time.Duration) (string, error) {
	t, err := c.target()
	if err != nil {
		return "", err
	}
	ctx, cancel := context.WithTimeout(context.Background(), d)
	defer cancel()
	out, errs, err := c.exec(ctx, "-s", t, "shell", cmd)
	if err != nil {
		msg := strings.TrimSpace(errs)
		if msg == "" {
			msg = strings.TrimSpace(out)
		}
		if msg == "" {
			msg = err.Error()
		}
		return out, errors.New(msg)
	}
	return out, nil
}

// InteractiveShell starts `adb shell` on a local pty. With root it runs a
// root shell through `su 0`. The caller owns the returned file and process.
func (c *Client) InteractiveShell(root bool, cols, rows int) (*exec.Cmd, *os.File, error) {
	t, err := c.target()
	if err != nil {
		return nil, nil, err
	}
	args := []string{"-s", t, "shell"}
	if root {
		args = append(args, "-t", "su 0 sh")
	}
	cmd := exec.Command(c.Path, args...)
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")
	if cols <= 0 {
		cols = 100
	}
	if rows <= 0 {
		rows = 30
	}
	f, err := pty.StartWithSize(cmd, &pty.Winsize{Cols: uint16(cols), Rows: uint16(rows)})
	if err != nil {
		return nil, nil, fmt.Errorf("start pty: %w", err)
	}
	return cmd, f, nil
}

// ResizePTY sets the terminal window size of a running shell.
func ResizePTY(f *os.File, cols, rows int) error {
	if f == nil || cols <= 0 || rows <= 0 {
		return nil
	}
	return pty.Setsize(f, &pty.Winsize{Cols: uint16(cols), Rows: uint16(rows)})
}

// ShellBytes runs a command with exec-out and returns raw bytes.
func (c *Client) ShellBytes(cmd string, d time.Duration) ([]byte, error) {
	t, err := c.target()
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), d)
	defer cancel()
	cmdObj := exec.CommandContext(ctx, c.Path, "-s", t, "exec-out", cmd)
	var out, errb bytes.Buffer
	cmdObj.Stdout = &out
	cmdObj.Stderr = &errb
	if err := cmdObj.Run(); err != nil {
		return nil, fmt.Errorf("%v %s", err, strings.TrimSpace(errb.String()))
	}
	return out.Bytes(), nil
}

// Screenshot returns a PNG of the current display.
func (c *Client) Screenshot() ([]byte, error) {
	return c.ShellBytes("screencap -p", 20*time.Second)
}

// Key sends an input key event, e.g. KEYCODE_DPAD_UP or 19.
func (c *Client) Key(code string) error {
	code = strings.TrimSpace(code)
	if code == "" {
		return errors.New("empty key")
	}
	_, err := c.ShellTimeout("input keyevent "+shellQuote(code), 15*time.Second)
	return err
}

// Text types text into the focused field.
func (c *Client) Text(s string) error {
	if s == "" {
		return nil
	}
	// `input text` uses %s for spaces.
	esc := strings.ReplaceAll(s, " ", "%s")
	_, err := c.ShellTimeout("input text "+shellQuote(esc), 30*time.Second)
	return err
}

// Tap sends a touch tap.
func (c *Client) Tap(x, y int) error {
	_, err := c.ShellTimeout(fmt.Sprintf("input tap %d %d", x, y), 15*time.Second)
	return err
}

// Swipe sends a touch swipe.
func (c *Client) Swipe(x1, y1, x2, y2, durationMS int) error {
	if durationMS <= 0 {
		durationMS = 300
	}
	_, err := c.ShellTimeout(fmt.Sprintf("input swipe %d %d %d %d %d", x1, y1, x2, y2, durationMS), 20*time.Second)
	return err
}
