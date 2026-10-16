"""The background music of the explainer film, composed here so it is ours to use. Fast and light, to match the film's
cuts: 124 BPM in D major, a soft kick and clap, offbeat hats and a shaker, a pulsing bass, a plucked sixteenth-note
arpeggio and a pad underneath. It opens with one bar of pad and hats under the hook, gives the groove a breath every
eight bars, and ends on a ringing chord. With a hits file (the "hits" of scripts/process-voice/film.json, written by
process-video.mjs) it marks the film's cuts: a low swell and boom on every new step ("big"), a whoosh on every new
feature ("cut"), a click on the hook's flashes ("tick"). Deterministic: the same file every run.
scripts/process-voice.mjs lays it under the film (and under the voice, ducked while she speaks).
Run: python3 scripts/process-music.py [seconds] [out.wav] [hits.json]   Needs numpy."""
import sys, wave, json
import numpy as np

SR = 44100
LENGTH = float(sys.argv[1]) if len(sys.argv) > 1 else 266.0
OUT = sys.argv[2] if len(sys.argv) > 2 else "process-music.wav"
HITS = json.load(open(sys.argv[3]))["hits"] if len(sys.argv) > 3 else []
BPM = 124
BEAT = 60 / BPM
BAR = 4 * BEAT
S16 = BEAT / 4
rng = np.random.default_rng(11)

def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)

# One bar per chord: D, Bm7, G(add9), A(sus4 -> 3). Bass root, then the chord tones.
CHORDS = [
    (38, [62, 66, 69, 74]),
    (35, [59, 62, 66, 69]),
    (31, [59, 62, 67, 69]),
    (33, [57, 62, 64, 69]),
    (38, [62, 66, 69, 73]),
    (35, [59, 62, 66, 71]),
    (31, [59, 62, 67, 71]),
    (33, [57, 61, 64, 69]),
]
n = int(LENGTH * SR)
mix = np.zeros(n)

def add(at, sig, gain=1.0):
    i = int(at * SR)
    if i >= n or i < 0:
        return
    sig = sig[: n - i]
    mix[i : i + len(sig)] += sig * gain

def ramp(m, a, r):
    e = np.ones(m)
    ai, ri = max(1, int(a * SR)), max(1, int(r * SR))
    e[:ai] = np.linspace(0, 1, ai)
    e[-ri:] *= np.linspace(1, 0, ri)
    return e

def highpass(x, k=3):
    return x - np.convolve(x, np.ones(k) / k, mode="same")

def kick():
    m = int(0.42 * SR)
    t = np.arange(m) / SR
    f = 45 + 85 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7.5)
    s[: int(0.003 * SR)] += rng.uniform(-0.4, 0.4, int(0.003 * SR))  # the beater
    return s

def clap():
    m = int(0.3 * SR)
    t = np.arange(m) / SR
    s = np.zeros(m)
    for d in (0.0, 0.011, 0.022):  # three hands, the clap's flutter
        i = int(d * SR)
        burst = highpass(rng.standard_normal(m - i), 5) * np.exp(-np.arange(m - i) / SR * 26)
        s[i:] += burst
    return s * 0.5

def hat(open_=False):
    m = int((0.16 if open_ else 0.05) * SR)
    t = np.arange(m) / SR
    s = highpass(highpass(rng.standard_normal(m), 2), 2)
    return s * np.exp(-t * (18 if open_ else 70))

def shaker():
    m = int(0.07 * SR)
    t = np.arange(m) / SR
    s = highpass(rng.standard_normal(m), 3)
    return s * np.sin(np.pi * np.minimum(1, t / 0.07)) * np.exp(-t * 30)

def bass(note, dur):
    m = int(dur * SR)
    t = np.arange(m) / SR
    f = hz(note)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    return s * np.exp(-t * 3.0) * ramp(m, 0.004, 0.03)

def pluck(note, vel):
    m = int(0.9 * SR)
    t = np.arange(m) / SR
    f = hz(note)
    s = np.zeros(m)
    for k, amp, dec in ((1, 1.0, 6.0), (2, 0.5, 9.0), (3, 0.22, 13.0), (5, 0.08, 20.0)):
        s += amp * np.sin(2 * np.pi * f * k * t) * np.exp(-dec * t)
    return s * np.minimum(1, t / 0.003) * vel

def pad(notes, dur):
    m = int((dur + 0.8) * SR)
    t = np.arange(m) / SR
    s = np.zeros(m)
    for note in notes:
        for det in (-0.005, 0.005):
            f = hz(note) * (1 + det)
            ph = rng.uniform(0, 2 * np.pi)
            s += np.sin(2 * np.pi * f * t + ph) + 0.18 * np.sin(4 * np.pi * f * t + ph)
    return s * ramp(m, 0.25, 0.8) / (len(notes) * 2)

INTRO = 1 * BAR
END_AT = LENGTH - 6.5
ARP = [0, 1, 2, 3, 2, 1, 3, 2, 0, 2, 1, 3, 2, 3, 1, 2]
BASS = [0, None, 0, 0, None, 0, 12, 0]  # eighth notes: root, rests, an octave jump
bar = 0
at = 0.0
while at + BAR <= END_AT:
    root, notes = CHORDS[bar % len(CHORDS)]
    add(at, pad(notes, BAR), 0.30)
    groove = at >= INTRO
    breath = groove and bar % 8 == 7  # the last bar of every eight: no kick, no bass, the arpeggio alone
    for b in range(4):
        x = at + b * BEAT
        if groove and not breath:
            add(x, kick(), 0.55)
            if b in (1, 3):
                add(x, clap(), 0.20)
        add(x + BEAT / 2, hat(open_=(b == 3 and bar % 2 == 1)), 0.09 if groove else 0.06)
    if groove:
        for i in range(16):
            add(at + i * S16 + rng.uniform(0, 0.004), shaker(), 0.035 * (1.0 if i % 2 else 0.6))
            note = notes[ARP[i] % 4] + (12 if i in (7, 15) else 0)
            vel = 0.13 * (1.0 if i % 4 == 0 else 0.72) * rng.uniform(0.9, 1.0)
            add(at + i * S16, pluck(note, vel))
        if not breath:
            for i, step in enumerate(BASS):
                if step is not None:
                    add(at + i * BEAT / 2, bass(root + step, BEAT / 2 * 0.95), 0.30)
    at += BAR
    bar += 1
# the ending: D with the ninth, one last kick, ringing out
add(at, kick(), 0.5)
add(at, pad([62, 66, 69, 76], 5.0), 0.38)
add(at, bass(38, 2.5), 0.3)
for i, note in enumerate([62, 66, 69, 74, 76, 81]):
    add(at + i * S16, pluck(note, 0.12))

# The cuts: a swell into a low boom for a new step, a whoosh for a new feature, a click for a flash of the hook.
def boom():
    m = int(0.9 * SR)
    t = np.arange(m) / SR
    f = 38 + 60 * np.exp(-t * 18)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5)

def swell(dur):
    m = int(dur * SR)
    t = np.arange(m) / SR
    s = highpass(rng.standard_normal(m), 4)
    return s * (t / dur) ** 2.2 * 0.6

def whoosh():
    m = int(0.32 * SR)
    t = np.arange(m) / SR
    s = highpass(highpass(rng.standard_normal(m), 3), 3)
    return s * np.sin(np.pi * t / 0.32) ** 2

def click():
    m = int(0.04 * SR)
    t = np.arange(m) / SR
    return (np.sin(2 * np.pi * 1800 * t) + 0.5 * np.sin(2 * np.pi * 2900 * t)) * np.exp(-t * 120)

for h in HITS:
    x, k = float(h["t"]), h["k"]
    if x > LENGTH - 7:  # the ending has its own chord
        continue
    if k == "big":
        add(x - 0.45, swell(0.45), 0.10)
        add(x, boom(), 0.42)
        add(x, hat(open_=True), 0.10)
    elif k == "cut":
        add(x - 0.16, whoosh(), 0.07)
        add(x, kick(), 0.25)
    else:
        add(x, click(), 0.06)

# A small room, then a gentle top cut (about 7 kHz) and the fades.
ir_len = int(1.2 * SR)
ir = rng.standard_normal(ir_len) * np.exp(-np.arange(ir_len) / SR * 5.0)
ir[: int(0.01 * SR)] = 0
ir /= np.sqrt((ir ** 2).sum())
size = 1 << int(np.ceil(np.log2(n + ir_len)))
spec = np.fft.rfft(mix, size)
wet = np.fft.irfft(spec * np.fft.rfft(ir, size), size)
f = np.fft.rfftfreq(size, 1 / SR)
out = np.fft.irfft((spec + 0.3 * np.fft.rfft(wet, size)) / np.sqrt(1 + (f / 7000) ** 4), size)[:n]
fade = np.ones(n)
fi, fo = int(1.0 * SR), int(3.0 * SR)
fade[:fi] = np.linspace(0, 1, fi)
fade[-fo:] = np.linspace(1, 0, fo)
out *= fade
out /= np.abs(out).max() / 0.89
with wave.open(OUT, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype("<i2").tobytes())
print(f"{OUT}: {LENGTH:.1f} s, {BPM} BPM, {len(HITS)} accents")
