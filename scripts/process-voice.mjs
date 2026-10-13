// The narration of the process film: lays one audio file per line of scripts/process-voice.json at its time, writes
// the film with sound and the captions (WebVTT) from the same text.
//   node scripts/process-voice.mjs <voice-dir> [out-dir]
// <voice-dir> holds 01.mp3, 02.mp3 ... (or .wav/.m4a), one per line in order: recorded by a person or made with a
// text-to-speech service from the "say" (or "text") of each line. A line that runs into the next one is sped up a
// little (up to 12%); beyond that the script stops and names the line to shorten.
// Writes process-voice.mp4 and process.vtt to out-dir (default demos/shared/video/process). Needs ffmpeg.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const FILM = path.join(ROOT, "demos/shared/video/process/process.mp4");
const { lines } = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/process-voice.json"), "utf8"));
const [voiceDir, outDir = path.join(ROOT, "demos/shared/video/process")] = process.argv.slice(2);
if (!voiceDir) { console.error("usage: node scripts/process-voice.mjs <voice-dir> [out-dir]"); process.exit(1); }

const probe = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const filmEnd = probe(FILM);
const files = lines.map((_, i) => {
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
const out = path.join(outDir, "process-voice.mp4");
const mix = parts.join(";") + ";" + lines.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${lines.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]`;
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", FILM, ...files.flatMap((f) => ["-i", f]),
  "-filter_complex", mix, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "96k", "-ac", "1", "-shortest", "-movflags", "+faststart", out]);

const ts = (s) => new Date(Math.max(0, s) * 1000).toISOString().slice(11, 23);
fs.writeFileSync(path.join(outDir, "process.vtt"), "WEBVTT\n\n" + cues.map((c, i) => `${i + 1}\n${ts(c.from)} --> ${ts(Math.min(c.to + 0.4, i + 1 < cues.length ? cues[i + 1].from : filmEnd))}\n${c.text}\n`).join("\n"));
console.log(`\n${out} · ${(fs.statSync(out).size / 1e6).toFixed(1)} MB · captions process.vtt`);
