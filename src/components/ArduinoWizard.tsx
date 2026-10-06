import { useEffect, useRef, useState } from "react";
import { Copy, Download, FileUp, Terminal, X } from "lucide-react";
import type { Board } from "@/lib/boards";
import * as serial from "@/lib/serial";

const BUILTIN = ["Wire (I2C)", "SPI", "SoftwareSerial", "EEPROM", "WiFi", "ESP8266WiFi", "HTTPClient", "WebServer", "BLE"];
const cliLib = (l: string) => l.replace(/\s*\(.*\)/, "").replace(/_/g, " ");

function Cmd({ c }: { c: string }) {
  return (
    <div className="flex items-start gap-1 rounded bg-background border border-border p-2">
      <code className="flex-1 whitespace-pre-wrap break-all text-[11px] text-accent">{c}</code>
      <button className="text-muted-foreground hover:text-primary" onClick={() => navigator.clipboard.writeText(c)} aria-label="Copy"><Copy className="h-3 w-3" /></button>
    </div>
  );
}

function save(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

export function ArduinoWizard({ board, libs, code, serialLog, clearLog, connected, onClose, log }: { board: Board; libs: string[]; code: string; serialLog: string; clearLog: () => void; connected: boolean; onClose: () => void; log: (s: string) => void }) {
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [built, setBuilt] = useState("");
  const [line, setLine] = useState("");
  const monRef = useRef<HTMLPreElement>(null);
  useEffect(() => { monRef.current?.scrollTo(0, 1e9); }, [serialLog]);
  const fqbn = board.fqbn ?? "";
  const core = fqbn.split(":").slice(0, 2).join(":");
  const profile = serial.flashProfile(fqbn);
  const extLibs = libs.filter((l) => !BUILTIN.includes(l) && !l.includes("MicroPython") && !l.includes("micro:bit"));
  const needsUrl = core.startsWith("esp32") ? "https://espressif.github.io/arduino-esp32/package_esp32_index.json"
    : core.startsWith("esp8266") ? "https://arduino.esp8266.com/stable/package_esp8266com_index.json"
    : core.startsWith("rp2040") ? "https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json" : "";
  const libCmd = extLibs.length ? `arduino-cli lib install ${extLibs.map((l) => `"${cliLib(l)}"`).join(" ")}` : "";
  const setupCmds = [
    needsUrl && `arduino-cli config add board_manager.additional_urls ${needsUrl}`,
    "arduino-cli core update-index", `arduino-cli core install ${core}`, libCmd,
  ].filter(Boolean) as string[];

  function downloadInstaller(os: "win" | "unix") {
    if (os === "win") {
      save("install-board-support.bat", ["@echo off", "echo Installing Arduino CLI, board support and libraries for " + board.name,
        "where arduino-cli >nul 2>nul || winget install -e --id ArduinoSA.CLI --accept-source-agreements --accept-package-agreements",
        "echo Installing USB drivers (CH340 / CP210x) if needed...",
        "winget install -e --id WCH.CH341SER --accept-source-agreements --accept-package-agreements 2>nul",
        "arduino-cli config init 2>nul", ...setupCmds, "echo Done! You can close this window.", "pause"].join("\r\n"));
    } else {
      save("install-board-support.sh", ["#!/bin/sh", "set -e", `echo "Installing board support for ${board.name}"`,
        'if ! command -v arduino-cli >/dev/null; then',
        '  if command -v brew >/dev/null; then brew install arduino-cli; else curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=$HOME/.local/bin sh; export PATH=$HOME/.local/bin:$PATH; fi',
        "fi", "arduino-cli config init 2>/dev/null || true", ...setupCmds,
        '[ "$(uname)" = Linux ] && sudo usermod -aG dialout "$USER" && echo "Log out and back in for USB access."',
        'echo "Done!"'].join("\n") + "\n");
    }
  }

  function buildCommand() {
    const ino = code.replace(/'/g, "'\\''");
    const unix = [
      "mkdir -p sketch", `cat > sketch/sketch.ino <<'EOF'\n${code}\nEOF`, ...setupCmds,
      `arduino-cli compile --fqbn ${fqbn} --output-dir build sketch`,
      `arduino-cli upload -p $(arduino-cli board list | awk 'NR==2{print $1}') --fqbn ${fqbn} sketch`,
    ].join(" && \\\n");
    void ino;
    setBuilt(unix);
  }

  async function sendMon() {
    try { await serial.sendLine(line); setLine(""); } catch (e) { setErr(serial.explainSerialError(e)); }
  }

  async function flash(f: File) {
    setErr(""); setPct(0);
    try {
      if (!connected) throw new Error("Connect the board with Connect USB first.");
      const hex = serial.parseHex(await f.text());
      log(`\n[flashing ${f.name} — ${hex.length} bytes]\n`);
      await serial.flashHex(hex, profile!, setPct);
      log("\n[✓ upload complete — board restarted]\n");
    } catch (e) { const m = serial.explainSerialError(e); setErr(m); log(`\n[!] ${m}\n`); setPct(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-3">
      <div className="w-full max-w-xl max-h-[90vh] overflow-auto rounded border border-border bg-card p-4 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Arduino upload — {board.name}</h2>
          <button onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-muted-foreground">C++ sketches must be compiled once on your computer (browsers can't run the compiler). Then the website uploads the result over USB.</p>

        <ol className="space-y-3 list-decimal pl-4">
          <li><b>Install board support automatically</b> (one time) — download and double-click/run. It installs Arduino CLI, USB drivers, the {board.name} core{extLibs.length ? " and your libraries" : ""}.
            <div className="mt-1 flex flex-wrap gap-1">
              <button className="cf-btn-primary" onClick={() => downloadInstaller("win")}><Download className="h-4 w-4" />Windows installer</button>
              <button className="cf-btn-primary" onClick={() => downloadInstaller("unix")}><Download className="h-4 w-4" />Mac / Linux installer</button>
            </div>
            <p className="mt-1 text-muted-foreground">Mac/Linux: run <code>sh install-board-support.sh</code> in Terminal.</p></li>
          <li><b>Save the sketch</b> — press Download, put <code>sketch.ino</code> in a folder named <code>sketch</code>.</li>
          <li><b>Compile</b>
            <div className="mt-1"><Cmd c={`arduino-cli compile --fqbn ${fqbn} --output-dir build sketch`} /></div></li>
          <li><b>Upload from this website</b>
            {profile ? (
              <div className="mt-1 space-y-2">
                <p className="text-muted-foreground">Press Connect USB, then choose <code>build/sketch.ino.hex</code> (not the "with_bootloader" file).</p>
                <label className={`cf-btn-primary w-fit cursor-pointer ${!connected ? "opacity-60" : ""}`}>
                  <FileUp className="h-4 w-4" />Choose .hex and upload
                  <input type="file" accept=".hex" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) flash(f); e.target.value = ""; }} />
                </label>
                {!connected && <p className="text-destructive">Board not connected — close this, press Connect USB, then come back.</p>}
                {pct !== null && <div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary transition-all" style={{ width: `${pct}%` }} /></div>}
                {err && <p className="text-destructive">{err}</p>}
              </div>
            ) : (
              <div className="mt-1 space-y-1">
                <p className="text-muted-foreground">Direct website upload supports Uno, Nano, Mega and Pro Mini. For this board use:</p>
                <Cmd c={`arduino-cli upload -p <PORT> --fqbn ${fqbn} sketch`} />
                <Cmd c="arduino-cli board list" />
              </div>
            )}</li>
        </ol>

        <div className="space-y-2 border-t border-border pt-3">
          <b>Build the Arduino CLI command</b>
          <p className="text-muted-foreground">One command that saves your current code, installs the board + libraries, compiles and uploads (Mac/Linux terminal).</p>
          <button className="cf-btn-primary w-fit" onClick={buildCommand}><Terminal className="h-4 w-4" />Build command</button>
          {built && <Cmd c={built} />}
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <b>Serial monitor {connected ? <span className="text-primary">● live</span> : <span className="text-muted-foreground">(not connected)</span>}</b>
            <button className="text-muted-foreground hover:text-primary" onClick={clearLog}>Clear</button>
          </div>
          <pre ref={monRef} className="h-40 overflow-auto rounded border border-border bg-background p-2 text-[11px] whitespace-pre-wrap">{serialLog || "Board output will appear here after upload…"}</pre>
          <div className="flex gap-1">
            <input className="cf-input flex-1" value={line} onChange={(e) => setLine(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMon()} placeholder="Send text to board" disabled={!connected} />
            <button className="cf-btn-primary" onClick={sendMon} disabled={!connected}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
