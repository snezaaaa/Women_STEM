"""Original, synthesized background track for the trailer (no samples, no copyrighted music).

    python3 tools/trailer/music.py out.wav [seconds]

Upbeat pop-style loop at 112 BPM: soft pad, plucked arpeggio, light kick and hi-hat,
a short lift before the finale and a held final chord for the end card.
"""
import sys
import wave
import numpy as np

SR = 44100
BPM = 112
BEAT = 60 / BPM
out = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 34.0
N = int(SR * DUR)
mix = np.zeros((N, 2))
rng = np.random.default_rng(7)


def note_hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def env(length, a=0.01, r=0.3):
    t = np.arange(length) / SR
    e = np.minimum(1, t / a) * np.exp(-t / r)
    return e


def add(sig, start_s, pan=0.0, gain=1.0):
    i = int(start_s * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    mix[i : i + len(sig), 0] += sig * (1 - pan) * 0.5 * 2 ** 0.5
    mix[i : i + len(sig), 1] += sig * (1 + pan) * 0.5 * 2 ** 0.5


def pluck(n, length_s=0.45):
    L = int(length_s * SR)
    t = np.arange(L) / SR
    f = note_hz(n)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    return s * env(L, 0.004, 0.18)


def pad(notes, length_s):
    L = int(length_s * SR)
    t = np.arange(L) / SR
    s = np.zeros(L)
    for n in notes:
        f = note_hz(n)
        for det in (-0.12, 0.0, 0.12):
            s += np.sin(2 * np.pi * f * (1 + det / 100) * t + rng.uniform(0, 6))
    a = np.minimum(1, t / 0.35) * np.minimum(1, (length_s - t) / 0.4)
    return s * np.clip(a, 0, 1) / (len(notes) * 3)


def kick():
    L = int(0.3 * SR)
    t = np.arange(L) / SR
    f = 110 * np.exp(-t * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def hat():
    L = int(0.06 * SR)
    s = rng.standard_normal(L)
    s = np.diff(np.concatenate([[0], s]))  # brighten
    return s * np.exp(-np.arange(L) / SR * 60)


def bass(n, length_s):
    L = int(length_s * SR)
    t = np.arange(L) / SR
    f = note_hz(n)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return s * np.minimum(1, t / 0.01) * np.exp(-t / 0.5)


# C – G – Am – F  (one chord per bar of 4 beats)
CHORDS = [
    (48, [60, 64, 67, 72]),  # C
    (43, [59, 62, 67, 71]),  # G
    (45, [60, 64, 69, 72]),  # Am
    (41, [60, 65, 69, 72]),  # F
]
BAR = 4 * BEAT
end_card = DUR - 3.6
finale = end_card - 7.0
bar = 0
t = 0.0
while t < end_card - 0.01:
    root, ch = CHORDS[bar % 4]
    length = min(BAR, end_card - t)
    add(pad(ch, length + 0.3), t, gain=0.22)
    add(bass(root, BEAT * 2), t, gain=0.35)
    add(bass(root, BEAT * 2), t + BEAT * 2, gain=0.3)
    intro = t < 3.0
    for k in range(8):
        st = t + k * BEAT / 2
        if st >= end_card:
            break
        n = ch[[0, 1, 2, 3, 2, 1, 2, 3][k]] + (12 if bar % 2 and k in (3, 7) else 0)
        add(pluck(n), st, pan=-0.3 if k % 2 else 0.3, gain=0.16 if intro else 0.22)
        if not intro:
            if k % 2 == 1:
                add(hat(), st, pan=0.2, gain=0.08)
            if k in (0, 4):
                add(kick(), st, gain=0.55)
    # lift into the finale: add a high sparkle line
    if t >= finale:
        for k in range(4):
            add(pluck(ch[3] + 12, 0.6), t + k * BEAT, pan=0.1, gain=0.12)
    t += BAR
    bar += 1

# end card: held, bright C chord with a sparkle
add(pad([48, 60, 64, 67, 72, 76], DUR - end_card + 0.2), end_card, gain=0.35)
for k, n in enumerate([72, 76, 79, 84]):
    add(pluck(n, 1.2), end_card + k * 0.12, pan=(k - 1.5) * 0.2, gain=0.2)
add(kick(), end_card, gain=0.6)

# fades + normalise
fade = np.ones(N)
fi, fo = int(0.6 * SR), int(1.2 * SR)
fade[:fi] = np.linspace(0, 1, fi)
fade[-fo:] = np.linspace(1, 0, fo)
mix *= fade[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.89
pcm = (mix * 32767).astype(np.int16)
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {out} ({DUR:.1f} s)")
