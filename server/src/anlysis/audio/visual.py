import numpy as np
import wave
import csv
import sys
import os
from path import path

PATH = path().PATH

# === Konfiguration ===
WINDOW_DURATION = 0.01  # sekunder
EPSILON = 1e-10
MAX_AMPLITUDE = 32767  # För 16-bit PCM
DB_REF = 30

def wav_to_db_csv(in_wav):
    with wave.open(PATH + in_wav, 'rb') as wav_file:
        sample_rate = wav_file.getframerate()
        n_channels = wav_file.getnchannels()
        n_frames = wav_file.getnframes()
        raw_signal = np.frombuffer(wav_file.readframes(n_frames), dtype=np.int16)

    # Om ljudet är stereo -> konvertera till mono
    if n_channels > 1:
        raw_signal = raw_signal[::n_channels]

    window_size = int(sample_rate * WINDOW_DURATION)
    num_windows = len(raw_signal) // window_size

    time_axis = []
    db_values = []

    for i in range(num_windows):
        window = raw_signal[i * window_size : (i + 1) * window_size]
        if len(window) == 0:
            continue

        amplitude = np.max(np.abs(window)) / MAX_AMPLITUDE
        amplitude = max(amplitude, EPSILON)
        db = 20 * np.log10(amplitude) + DB_REF
        t = round(i * WINDOW_DURATION, 4)

        db_values.append(db if amplitude >= 1e-4 else np.nan)
        time_axis.append(t)

    # Skriv till CSV
    with open(PATH + in_wav + ".csv", 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Time (s)', 'Amplitude (dB)'])
        for t, db in zip(time_axis, db_values):
            writer.writerow([t, db])

    sys.stdout.write(f"Saved dB data to: {PATH + in_wav + ".csv"}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 visual.py input.wav")
        sys.exit(1)

    input_wav = sys.argv[1]

    if not os.path.exists(input_wav):
        print(f"File not found: {input_wav}")
        sys.exit(1)

    wav_to_db_csv(input_wav)
