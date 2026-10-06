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

export function ArduinoWizard({ board, libs, connected, onClose, log }: { board: Board; libs: string[]; connected: boolean; onClose: () => void; log: (s: string) => void }) {
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const fqbn = board.fqbn ?? "";
  const core = fqbn.split(":").slice(0, 2).join(":");
  const profile = serial.flashProfile(fqbn);
  const extLibs = libs.filter((l) => !BUILTIN.includes(l) && !l.includes("MicroPython") && !l.includes("micro:bit"));
  const needsUrl = core.startsWith("esp32") ? "https://espressif.github.io/arduino-esp32/package_esp32_index.json"
    : core.startsWith("esp8266") ? "https://arduino.esp8266.com/stable/package_esp8266com_index.json"
    : core.startsWith("rp2040") ? "https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json" : "";

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
