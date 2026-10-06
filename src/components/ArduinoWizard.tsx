import { useState } from "react";
import { Copy, FileUp, X } from "lucide-react";
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
          <li><b>Install Arduino CLI</b> (one time)
            <div className="mt-1 space-y-1">
              <Cmd c="winget install ArduinoSA.CLI" /><Cmd c="brew install arduino-cli" />
              <Cmd c="curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh" />
            </div></li>
          <li><b>Install board core{extLibs.length ? " + your libraries" : ""}</b>
            <div className="mt-1 space-y-1">
              {needsUrl && <Cmd c={`arduino-cli config add board_manager.additional_urls ${needsUrl}`} />}
              <Cmd c={`arduino-cli core update-index && arduino-cli core install ${core}`} />
              {extLibs.length > 0 && <Cmd c={`arduino-cli lib install ${extLibs.map((l) => `"${cliLib(l)}"`).join(" ")}`} />}
            </div></li>
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
      </div>
    </div>
  );
}
