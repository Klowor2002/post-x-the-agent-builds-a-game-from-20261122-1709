import math, random, struct, wave

SR = 22050
DUR = 50.47
N = int(SR * DUR)
buf = [0.0] * N
random.seed(4)

def add(idx_gain_pairs):
    pass

def tone(t0, freq, dur, gain=0.15, kind='square', decay=6.0):
    s = int(t0 * SR); L = int(dur * SR)
    for i in range(L):
        idx = s + i
        if idx >= N: break
        tt = i / SR
        ph = 2 * math.pi * freq * tt
        if kind == 'square':
            v = 0.6 * (1.0 if math.sin(ph) >= 0 else -1.0) + 0.25 * math.sin(ph * 2)
        elif kind == 'tri':
            v = math.sin(ph) + 0.3 * math.sin(ph * 3)
        else:
            v = math.sin(ph)
        buf[idx] += gain * v * math.exp(-decay * tt)

def click(t0, gain=0.10):
    s = int(t0 * SR); L = int(0.014 * SR)
    for i in range(L):
        idx = s + i
        if idx >= N: break
        buf[idx] += gain * random.uniform(-1, 1) * math.exp(-160 * (i / SR))

def coin(t0):
    tone(t0, 987.77, 0.07, gain=0.10, kind='sine', decay=2.0)
    tone(t0 + 0.07, 1318.5, 0.22, gain=0.10, kind='sine', decay=6.0)

# chiptune bed: C Am F G, 2s per chord
CH = [(261.63, 329.63, 392.0, 523.25), (220.0, 261.63, 329.63, 440.0),
      (174.61, 220.0, 261.63, 349.23), (196.0, 246.94, 293.66, 392.0)]
t = 0.0
bar = 0
while t < 48.0:
    chord = CH[bar % 4]
    for step in range(8):
        tone(t + step * 0.25, chord[step % 4], 0.22, gain=0.055, kind='square', decay=3.0)
    tone(t, chord[0] / 2, 0.5, gain=0.10, kind='tri', decay=2.0)
    tone(t + 1.0, chord[0] / 2, 0.5, gain=0.09, kind='tri', decay=2.0)
    t += 2.0; bar += 1

# typing clicks during the coding beat (7-23s)
tt = 7.2
while tt < 22.8:
    click(tt, gain=random.uniform(0.05, 0.11))
    tt += random.uniform(0.09, 0.30)
    if random.random() < 0.18:
        tt += random.uniform(0.25, 0.5)

# gameplay star blips (23-48s)
tt = 23.6
while tt < 47.5:
    coin(tt)
    tt += random.uniform(0.55, 1.15)

# end-card jingle (48.2s)
for i, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
    tone(48.2 + i * 0.17, f, 0.5, gain=0.11, kind='tri', decay=3.5)

peak = max(abs(v) for v in buf) or 1.0
scale = 0.80 / peak
with wave.open('/home/hatch/workspace/makefun/entries/post-x-the-agent-builds-a-game-from-20261122-1709/work/postx-audio.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<h', int(max(-1.0, min(1.0, v * scale)) * 32767)) for v in buf))
print('audio ok, peak', round(peak, 3))
