// The narration of the process film: lays one audio file per line of scripts/process-voice.json at its time, writes
// the film with sound and the captions (WebVTT) from the same text.
//   node scripts/process-voice.mjs <voice-dir | one-file> [out-dir]
// <voice-dir> holds 01.mp3, 02.mp3 ... (or .wav/.m4a), one per line in order: recorded by a person or made with a
// text-to-speech service from the "say" (or "text") of each line. Or one file with the whole script read in order,
// a pause between lines (a blank line between them in ElevenLabs is enough): it is cut at its longest pauses. A line that runs into the next one is sped up a
// little (up to 12%); beyond that the script stops and names the line to shorten.
// Writes process.mp4 (the film with the voice) and process.vtt to out-dir (default demos/shared/video/process). Needs ffmpeg.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const FILM = path.join(ROOT, "demos/shared/video/process/process.mp4");
const { lines } = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/process-voice.json"), "utf8"));
const args = process.argv.slice(2);
// --cuts=7.0,14.2,... : where each line ends in a single recording, when its pauses are too even to find them
// (for example from aligning it to a reading of the same text). Otherwise they are found from the pauses.
const given = (args.find((a) => a.startsWith("--cuts=")) || "").slice(7).split(",").filter(Boolean).map(Number);
const [voiceDir, outDir = path.join(ROOT, "demos/shared/video/process")] = args.filter((a) => !a.startsWith("--"));
if (!voiceDir) { console.error("usage: node scripts/process-voice.mjs <voice-dir> [out-dir]"); process.exit(1); }

const probe = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const filmEnd = probe(FILM);

// One recording of the whole script: cut it in the middle of its longest pauses, one piece per line.
function split(file) {
  const total = probe(file);
  if (given.length) {
    if (given.length !== lines.length - 1) throw new Error(`--cuts needs ${lines.length - 1} times, got ${given.length}`);
    return cut(file, given, total);
  }
  const err = execFileSync("sh", ["-c", 'ffmpeg -hide_banner -i "$0" -af silencedetect=noise=-38dB:d=0.35 -f null - 2>&1', file]).toString();
  const gaps = [];
  let start = null;
  for (const m of err.matchAll(/silence_(start|end): ([\d.]+)/g)) {
    if (m[1] === "start") start = Number(m[2]);
    else if (start !== null) { gaps.push({ at: (start + Number(m[2])) / 2, len: Number(m[2]) - start }); start = null; }
  }
  const inner = gaps.filter((g) => g.at > 0.5 && g.at < total - 0.5).sort((a, b) => a.at - b.at);
  const n = lines.length - 1;
  if (inner.length < n) throw new Error(`found ${inner.length + 1} parts in ${file}, the script has ${lines.length} lines: read it with a pause between lines`);
  // Where each cut should fall if speech ran at an even pace (by the length of the text), then the pauses that sit
  // closest to those places and are long, in order (a small dynamic programme: pauses inside a sentence lose).
  const said = lines.map((l) => (l.say || l.text).length);
  const sum = said.reduce((a, b) => a + b, 0);
  const want = said.slice(0, -1).map((_, k) => total * said.slice(0, k + 1).reduce((a, b) => a + b, 0) / sum);
  const unit = total / lines.length;
  const cost = (k, g) => Math.abs(g.at - want[k]) / unit - 2 * Math.min(g.len, 1.5);
  const best = inner.map(() => Array(n).fill(Infinity)), from = inner.map(() => Array(n).fill(-1));
  inner.forEach((g, j) => {
    best[j][0] = cost(0, g);
    for (let k = 1; k < n; k++) for (let i = 0; i < j; i++) {
      const c = best[i][k - 1] + cost(k, g);
      if (c < best[j][k]) { best[j][k] = c; from[j][k] = i; }
    }
  });
  let j = inner.reduce((b, _, i) => (best[i][n - 1] < best[b][n - 1] ? i : b), 0);
  const cuts = [];
  for (let k = n - 1; k >= 0; k--) { cuts.unshift(inner[j].at); j = from[j][k]; }
  return cut(file, cuts, total);
}

function cut(file, cuts, total) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-"));
  const edges = [0, ...cuts, total];
  return lines.map((_, i) => {
    const out = path.join(dir, String(i + 1).padStart(2, "0") + ".wav");
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", file, "-ss", String(edges[i]), "-to", String(edges[i + 1]),
      "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse", out]);
    return out;
  });
}

const files = fs.statSync(voiceDir).isFile() ? split(voiceDir) : lines.map((_, i) => {
  const base = path.join(voiceDir, String(i + 1).padStart(2, "0"));
  const f = [".mp3", ".wav", ".m4a"].map((x) => base + x).find((x) => fs.existsSync(x));
  if (!f) throw new Error("missing voice file for line " + (i + 1) + ": " + base + ".mp3");
  return f;
});

const GAP = 0.25, MAX_TEMPO = 1.12;
const parts = [], cues = [];
lines.forEach((l, i) => {
  const room = (i + 1 < lines.length ? lines[i + 1].at : filmEnd) - l.at - GAP;
  const len = probe(files[i]);
  const tempo = len > room ? len / room : 1;
  if (tempo > MAX_TEMPO) throw new Error(`line ${i + 1} is ${len.toFixed(1)} s and has ${room.toFixed(1)} s: shorten it or move the next line`);
  const ms = Math.round(l.at * 1000);
  parts.push(`[${i + 1}:a]aresample=48000,${tempo > 1 ? `atempo=${tempo.toFixed(3)},` : ""}adelay=${ms}|${ms}[a${i}]`);
  cues.push({ from: l.at, to: l.at + len / tempo, text: l.text });
  console.log(`${String(i + 1).padStart(2)}  ${l.at.toFixed(1).padStart(5)} s  ${(len / tempo).toFixed(1).padStart(4)} of ${room.toFixed(1)} s${tempo > 1 ? `  (x${tempo.toFixed(2)})` : ""}`);
});

fs.mkdirSync(outDir, { recursive: true });
// The film keeps its name: the picture is copied as is, the sound replaced (a new recording by process-video.mjs is
// silent again, so run this after it). Written next to it first, then moved over it.
const out = path.join(outDir, "process.mp4"), tmp = out + ".tmp.mp4";
const mix = parts.join(";") + ";" + lines.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${lines.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]`;
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", FILM, ...files.flatMap((f) => ["-i", f]),
  "-filter_complex", mix, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "96k", "-ac", "1", "-shortest", "-movflags", "+faststart", tmp]);
fs.renameSync(tmp, out);

const ts = (s) => new Date(Math.max(0, s) * 1000).toISOString().slice(11, 23);
fs.writeFileSync(path.join(outDir, "process.vtt"), "WEBVTT\n\n" + cues.map((c, i) => `${i + 1}\n${ts(c.from)} --> ${ts(Math.min(c.to + 0.4, i + 1 < cues.length ? cues[i + 1].from : filmEnd))}\n${c.text}\n`).join("\n"));
console.log(`\n${out} · ${(fs.statSync(out).size / 1e6).toFixed(1)} MB · captions process.vtt`);
