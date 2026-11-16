package server

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"

	"github.com/annuar/adb-remote/internal/adb"
)

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  32 << 10,
	WriteBufferSize: 32 << 10,
	// The API is same-origin in production; when TOKEN is set the middleware
	// has already authenticated the query string by the time we get here.
	CheckOrigin: func(r *http.Request) bool { return true },
}

type termMessage struct {
	Type string `json:"type"`
	Data string `json:"data,omitempty"`
	Cols int    `json:"cols,omitempty"`
	Rows int    `json:"rows,omitempty"`
}

// handleTerminal bridges a browser WebSocket to an adb shell running on a
// local pty, so job control, colours, less-ish pagers and su all behave.
func (s *Server) handleTerminal(w http.ResponseWriter, r *http.Request) {
	cols := atoiDefault(r.URL.Query().Get("cols"), 100)
	rows := atoiDefault(r.URL.Query().Get("rows"), 30)
	root := r.URL.Query().Get("root") == "1"

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	conn.SetReadLimit(1 << 20)

	cmd, f, err := s.ADB.InteractiveShell(root, cols, rows)
	if err != nil {
		_ = conn.WriteJSON(termMessage{Type: "error", Data: err.Error()})
		return
	}

	var writeMu sync.Mutex
	send := func(m termMessage) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		return conn.WriteJSON(m)
	}

	go func() {
		buf := make([]byte, 32<<10)
		for {
			n, rerr := f.Read(buf)
			if n > 0 {
				if send(termMessage{Type: "output", Data: string(buf[:n])}) != nil {
					break
				}
			}
			if rerr != nil {
				break
			}
		}
		_ = send(termMessage{Type: "exit"})
		_ = conn.Close()
	}()

	defer func() {
		_ = f.Close()
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		_ = cmd.Wait()
	}()

	for {
		_, data, rerr := conn.ReadMessage()
		if rerr != nil {
			return
		}
		var m termMessage
		if json.Unmarshal(data, &m) != nil {
			continue
		}
		switch m.Type {
		case "input":
			if _, werr := f.Write([]byte(m.Data)); werr != nil {
				return
			}
		case "resize":
			_ = adb.ResizePTY(f, m.Cols, m.Rows)
		case "ping":
			_ = send(termMessage{Type: "pong"})
		}
	}
}

// --- uploads ----------------------------------------------------------------
