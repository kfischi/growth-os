"""The background music of the process film, composed here so it is ours to use: a calm pad, a soft bass and a felt
piano arpeggio in D major, 80 BPM, with a short intro and an ending that resolves. Deterministic: the same file every
run. scripts/process-voice.mjs lays it under the voice and ducks it while she speaks.
Run: python3 scripts/process-music.py [seconds] [out.wav]   Needs numpy."""
import sys, wave
import numpy as np

SR = 44100
LENGTH = float(sys.argv[1]) if len(sys.argv) > 1 else 266.0
OUT = sys.argv[2] if len(sys.argv) > 2 else "process-music.wav"
BPM = 80
BEAT = 60 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(7)

def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)

# Two bars per chord: Dmaj7, Bm7, Gmaj7, Asus4 -> A. MIDI notes: bass root, then the chord tones for pad and keys.
CHORDS = [
    (38, [62, 66, 69, 73]),   # Dmaj7
    (35, [59, 62, 66, 69]),   # Bm7
    (31, [59, 62, 66, 67]),   # Gmaj7 (B D F# G)
    (33, [57, 62, 64, 69]),   # Asus4
    (38, [62, 66, 69, 73]),
    (35, [59, 62, 66, 69]),
    (31, [59, 62, 66, 67]),
    (33, [57, 61, 64, 69]),   # A
]
n = int(LENGTH * SR)
t_all = np.arange(n) / SR
mix = np.zeros(n)

def env_adsr(length, a, r):
    e = np.ones(length)
    ai, ri = int(a * SR), int(r * SR)
    e[:ai] = np.linspace(0, 1, ai) ** 2
    e[-ri:] *= np.linspace(1, 0, ri) ** 2
    return e

def add(at, sig):
    i = int(at * SR)
    if i >= n:
        return
    sig = sig[: n - i]
    mix[i : i + len(sig)] += sig

def pad(notes, dur):
    m = int((dur + 1.6) * SR)
    t = np.arange(m) / SR
    s = np.zeros(m)
    for note in notes:
        for det in (-0.004, 0.0, 0.004):  # a slight chorus
            f = hz(note) * (1 + det)
            ph = rng.uniform(0, 2 * np.pi)
            for k, amp in ((1, 1.0), (2, 0.28), (3, 0.12), (4, 0.05)):
                s += amp * np.sin(2 * np.pi * f * k * t + ph * k)
    s *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t) ** 2  # slow breathing
    return s * env_adsr(m, 1.4, 1.6) / (len(notes) * 3)

def bass(note, dur):
    m = int((dur + 0.4) * SR)
    t = np.arange(m) / SR
    f = hz(note)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return s * env_adsr(m, 0.08, 0.5)

def key(note, vel):
    m = int(2.6 * SR)
    t = np.arange(m) / SR
    f = hz(note)
    s = np.zeros(m)
    for k, amp, dec in ((1, 1.0, 1.1), (2, 0.45, 1.8), (3, 0.2, 2.8), (4, 0.08, 4.0)):
        s += amp * np.sin(2 * np.pi * f * k * t) * np.exp(-dec * t)
    s *= np.minimum(1, t / 0.006)  # a soft hammer
    return s * vel

INTRO = 2 * BAR          # pad only
OUTRO_AT = LENGTH - 9.0  # the last chord rings out
ARP = [0, 2, 1, 3, 2, 1, 3, 2]  # eighth notes over the chord tones
step = 0
at = 0.0
while at < OUTRO_AT:
    root, notes = CHORDS[step % len(CHORDS)]
    dur = 2 * BAR
    add(at, pad(notes, dur) * 0.55)
    if at >= INTRO:
        add(at, bass(root, BAR * 0.98) * 0.32)
        add(at + BAR, bass(root, BAR * 0.98) * 0.28)
        for i in range(16):
            if (step // 4) % 2 == 1 and i % 2 == 1:
                continue  # every other phrase, sparser
            note = notes[ARP[i % 8]] + (12 if i in (6, 14) else 0)
            vel = 0.16 * (1.0 if i % 4 == 0 else 0.7) * rng.uniform(0.85, 1.0)
            add(at + i * BEAT / 2 + rng.uniform(0, 0.012), key(note, vel))
    at += dur
    step += 1
# the ending: D major with the ninth, ringing out
add(at, pad([62, 66, 69, 76], 7.0) * 0.6)
add(at, bass(38, 7.0) * 0.3)
for i, note in enumerate([62, 66, 69, 74, 76]):
    add(at + i * 0.18, key(note, 0.14))

# A room: convolution with a decaying noise tail (about 2 seconds), mixed in lightly.
ir_len = int(2.2 * SR)
ir = rng.standard_normal(ir_len) * np.exp(-np.arange(ir_len) / SR * 3.2)
ir[: int(0.012 * SR)] = 0
ir /= np.sqrt((ir ** 2).sum())
size = 1 << int(np.ceil(np.log2(n + ir_len)))
wet = np.fft.irfft(np.fft.rfft(mix, size) * np.fft.rfft(ir, size), size)[:n]
out = 0.78 * mix + 0.35 * wet
# gentle top cut: a one-pole low-pass at about 6 kHz
a = np.exp(-2 * np.pi * 6000 / SR)
y = np.empty_like(out)
acc = 0.0
for i in range(0, n, 4096):
    seg = out[i : i + 4096]
    res = np.empty_like(seg)
    for j, v in enumerate(seg):
        acc = (1 - a) * v + a * acc
        res[j] = acc
    y[i : i + 4096] = res
fade = np.ones(n)
fi, fo = int(2.0 * SR), int(4.0 * SR)
fade[:fi] = np.linspace(0, 1, fi)
fade[-fo:] = np.linspace(1, 0, fo)
y *= fade
y /= np.abs(y).max() / 0.89
with wave.open(OUT, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((y * 32767).astype("<i2").tobytes())
print(f"{OUT}: {LENGTH:.1f} s")
