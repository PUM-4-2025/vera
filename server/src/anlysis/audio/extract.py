import subprocess
import sys

def extract(input_video, output_audio, sample_rate=16000):
    cmd = [
        "ffmpeg",
        "-i", input_video,
        "-vn",  # ingen video
        "-ac", "1",  # mono
        "-ar", str(sample_rate),  # sample rate
        "-y",  # skriv över om filen finns
        output_audio
    ]
    subprocess.run(cmd, check=True)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_audio.py <input_video> <output_audio> [sample_rate]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    rate = int(sys.argv[3]) if len(sys.argv) >= 4 else 16000

    extract(input_path, output_path, rate)
