// The sound of the explainer film. Takes the silent master (scripts/process-voice/film.mp4, recorded by
// process-video.mjs, with its beats, captions and cuts in film.json) and writes the film the site plays and its
// captions (WebVTT).
// Music only, until the narration is recorded: the music composed for the film's length, with an accent on every cut,
// and captions of the titles on screen:
//   node scripts/process-voice.mjs --no-voice [--music=auto|file.wav] [out-dir]
// With the narration: one piece of voice per line of scripts/process-voice.json at its beat, and where a line is
// longer than its beat the beat is slowed down to fit (the picture waits for the voice, never the other way round).
// The music goes under the voice, ducked while she speaks, and the captions are the lines:
//   node scripts/process-voice.mjs [--music=auto|file.wav] [--cuts=t1,t2,...] <voice-dir | one-recording> [out-dir]
// <voice-dir> holds 01.mp3, 02.mp3 ... one per line. Or one recording of the whole script read in order with a pause
// between lines (a blank line between them in ElevenLabs): it is cut at the pauses that best match the length of each
// line, or at the --cuts times when its pauses are too even to tell apart.
// Writes process.mp4 and process.vtt to out-dir (default demos/shared/video/process). Needs ffmpeg.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const FILM = path.join(ROOT, "scripts/process-voice/film.mp4");
const META = path.join(ROOT, "scripts/process-voice/film.json");
const { lines } = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/process-voice.json"), "utf8"));
const args = process.argv.slice(2);
const opt = (k) => (args.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const given = opt("cuts").split(",").filter(Boolean).map(Number);
const noVoice = args.includes("--no-voice");
const music = opt("music") || (noVoice ? "auto" : "");
const rest = args.filter((a) => !a.startsWith("--"));
const [voiceIn, outDir = path.join(ROOT, "demos/shared/video/process")] = noVoice ? [null, rest[0]] : rest;
if (!voiceIn && !noVoice) { console.error("usage: node scripts/process-voice.mjs --no-voice [--music=file] [out-dir]\n   or: node scripts/process-voice.mjs [--music=file] [--cuts=...] <voice-dir | recording> [out-dir]"); process.exit(1); }

const probe = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const filmEnd = probe(FILM);
const ts = (s) => new Date(Math.max(0, s) * 1000).toISOString().slice(11, 23);
// The music for a length: composed (scripts/process-music.py), with the film's cuts when the timing is the film's own.
function compose(total, withHits) {
  const out = path.join(os.tmpdir(), "process-music.wav");
  execFileSync("python3", [path.join(ROOT, "scripts/process-music.py"), total.toFixed(1), out, ...(withHits && fs.existsSync(META) ? [META] : [])], { stdio: "inherit" });
  return out;
}

if (noVoice) {
  // The film as recorded, the music under it, and one caption per title on screen (from film.json).
  const meta = JSON.parse(fs.readFileSync(META, "utf8"));
  const bed = music === "auto" ? compose(filmEnd, true) : music;
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, "process.mp4");
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", FILM, "-i", bed,
    "-filter_complex", `[1:a]aresample=48000,apad,loudnorm=I=-17:TP=-1.5:LRA=7,afade=t=out:st=${(filmEnd - 2.5).toFixed(2)}:d=2.5[a]`,
    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-t", filmEnd.toFixed(3), "-movflags", "+faststart", out]);
  fs.writeFileSync(path.join(outDir, "process.vtt"), "WEBVTT\n\n" + meta.cues.map((c, i) => `${i + 1}\n${ts(c.from)} --> ${ts(c.to)}\n${c.text}\n`).join("\n"));
  console.log(`${out} · ${filmEnd.toFixed(1)} s · ${(fs.statSync(out).size / 1e6).toFixed(1)} MB · music only · ${meta.cues.length} captions in process.vtt`);
  process.exit(0);
}
const said = (l) => l.say || l.text;

// One recording of the whole script: where each line ends.
function split(file) {
  const total = probe(file);
  if (given.length) {
    if (given.length !== lines.length - 1) throw new Error(`--cuts needs ${lines.length - 1} times, got ${given.length}`);
    return cut(file, given, total);
  }
  const log = execFileSync("sh", ["-c", 'ffmpeg -hide_banner -i "$0" -af silencedetect=noise=-38dB:d=0.2 -f null - 2>&1', file]).toString();
  const gaps = [];
  let start = null;
  for (const m of log.matchAll(/silence_(start|end): ([\d.]+)/g)) {
    if (m[1] === "start") start = Number(m[2]);
    else if (start !== null) { gaps.push({ at: (start + Number(m[2])) / 2, len: Number(m[2]) - start }); start = null; }
  }
  const inner = gaps.filter((g) => g.at > 0.5 && g.at < total - 0.5).sort((a, b) => a.at - b.at);
  const n = lines.length - 1;
  if (inner.length < n) throw new Error(`found ${inner.length + 1} parts in ${file}, the script has ${lines.length} lines: read it with a pause between lines`);
  // Where each cut would fall at an even pace (by the letters), then the long pauses closest to those places, in order.
  const size = lines.map((l) => said(l).replace(/\s/g, "").length);
  const sum = size.reduce((a, b) => a + b, 0);
  const want = size.slice(0, -1).map((_, k) => total * size.slice(0, k + 1).reduce((a, b) => a + b, 0) / sum);
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
  console.log("cut at " + cuts.map((c) => c.toFixed(2)).join(","));
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

const files = fs.statSync(voiceIn).isFile() ? split(voiceIn) : lines.map((_, i) => {
  const base = path.join(voiceIn, String(i + 1).padStart(2, "0"));
  const f = [".mp3", ".wav", ".m4a"].map((x) => base + x).find((x) => fs.existsSync(x));
  if (!f) throw new Error("missing voice file for line " + (i + 1) + ": " + base + ".mp3");
  return f;
});

// The picture in pieces: before the first line, then one piece per line, from its start to the next line's.
// A piece that is shorter than its line (plus a breath after it) is slowed down to that length.
const BREATH = 0.6, MAX_TEMPO = 1.08;
const segs = [{ from: 0, to: lines[0].at, factor: 1 }];
const cues = [];
let now = lines[0].at; // where the current piece starts in the new film
lines.forEach((l, i) => {
  const to = i + 1 < lines.length ? lines[i + 1].at : filmEnd;
  // A line a little too long is read a little faster (up to 8%); only beyond that does the picture slow down.
  const raw = probe(files[i]);
  const tempo = Math.min(MAX_TEMPO, Math.max(1, (raw + BREATH) / (to - l.at)));
  const len = raw / tempo;
  const fit = (len + BREATH) / (to - l.at), factor = fit > 1.005 ? fit : 1;
  segs.push({ from: l.at, to, factor, voiceAt: now, len, tempo });
  // One caption per sentence, timed by its share of the letters.
  const sentences = l.text.match(/[^.?!]+[.?!]*/g).map((x) => x.trim()).filter(Boolean);
  const size = (x) => x.replace(/\s/g, "").length, all = sentences.reduce((a, x) => a + size(x), 0);
  let from = now;
  for (const x of sentences) { const end = from + len * size(x) / all; cues.push({ from, to: end, text: x }); from = end; }
  console.log(`${String(i + 1).padStart(2)}  ${now.toFixed(1).padStart(6)} s  voice ${len.toFixed(1).padStart(4)} s  step ${(to - l.at).toFixed(1).padStart(4)} s${tempo > 1 ? `  read x${tempo.toFixed(2)}` : ""}${factor > 1.005 ? `  PICTURE SLOWED x${factor.toFixed(2)}: shorten this line to keep the film's length` : ""}`);
  now += (to - l.at) * factor;
});
const total = now;
// --music=auto composes the music for the film's new length (scripts/process-music.py).
let bedFile = music;
// Its accents follow the film's cuts only when no beat was slowed down (then the film keeps its own timing).
if (music === "auto") bedFile = compose(total, !segs.some((g) => g.factor > 1.005));

// The picture: copied as is when every step fits (the aim), else slowed piece by piece and joined.
let picture = FILM;
if (segs.some((g) => g.factor > 1.005)) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "film-"));
  const pieces = segs.map((g, i) => {
    const f = path.join(dir, `${i}.mp4`);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", g.from.toFixed(3), "-to", g.to.toFixed(3), "-i", FILM,
      "-vf", `setpts=PTS*${g.factor.toFixed(4)},fps=30,format=yuv420p`, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-tune", "animation", f]);
    return f;
  });
  fs.writeFileSync(path.join(dir, "list.txt"), pieces.map((f) => `file '${f}'`).join("\n"));
  picture = path.join(dir, "film.mp4");
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"), "-c", "copy", picture]);
}
const voice = lines.map((_, i) => { const ms = Math.round(segs[i + 1].voiceAt * 1000); const t = segs[i + 1].tempo; return `[${i + 1}:a]aresample=48000,${t > 1 ? `atempo=${t.toFixed(3)},` : ""}adelay=${ms}|${ms}[a${i}]`; }).join(";")
  + ";" + lines.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${lines.length}:normalize=0,apad`;
const m = files.length + 1;
// The voice is levelled alone, so the pauses stay quiet; the music sits under it and ducks while she speaks.
const audio = music
  ? `${voice},loudnorm=I=-16:TP=-1.5:LRA=11,asplit[vo][key];[${m}:a]aresample=48000,apad,volume=0.22[bed];[bed][key]sidechaincompress=threshold=0.02:ratio=4:attack=40:release=600[duck];[vo][duck]amix=inputs=2:normalize=0,alimiter=limit=0.9[a]`
  : `${voice},loudnorm=I=-16:TP=-1.5:LRA=11[a]`;

fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "process.mp4");
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", picture, ...files.flatMap((f) => ["-i", f]), ...(music ? ["-i", bedFile] : []),
  "-filter_complex", audio, "-map", "0:v", "-map", "[a]", "-c:v", "copy",
  "-c:a", "aac", "-b:a", "96k", "-ac", "1", "-t", total.toFixed(3), "-movflags", "+faststart", out]);

fs.writeFileSync(path.join(outDir, "process.vtt"), "WEBVTT\n\n" + cues.map((c, i) => `${i + 1}\n${ts(c.from)} --> ${ts(Math.min(c.to + 0.3, i + 1 < cues.length ? cues[i + 1].from : total))}\n${c.text}\n`).join("\n"));
console.log(`\n${out} · ${total.toFixed(1)} s · ${(fs.statSync(out).size / 1e6).toFixed(1)} MB · captions process.vtt`);
