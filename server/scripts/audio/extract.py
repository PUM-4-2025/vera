import subprocess
import sys
from path import path

PATH = path().PATH
def extract(in_video):
    cmd = [
        "ffmpeg",
        "-i", PATH + in_video,
        "-vn",  # ingen video
        "-ac", "1",  # mono
        "-ar", "16000",  # sample rate
        "-y",  # skriv över om filen finns
        PATH + in_video + ".wav"
    ]
    subprocess.run(cmd, check=True)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 extract.py <input_video>")
        sys.exit(1)

    input_path = sys.argv[1]

    extract(input_path)
