from extract import extract
from visual import wav_to_db_csv
from db_analysis import find_threshold_crossings
import sys
def run(in_video, threshold_db, min_sec):
    extract(in_video= in_video)
    wav_to_db_csv(in_wav= in_video + ".wav")
    find_threshold_crossings(in_csv= in_video + ".wav.txt", threshold_db= threshold_db, min_duration_seconds= min_sec)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python run.py <input_video> [threshold_db] [min_sec]")
        sys.exit(1)

    in_video = sys.argv[1]
    threshold_db = sys.argv[2]
    min_sec = sys.argv[3]

    run(in_video= in_video, threshold_db= threshold_db, min_sec= min_sec)
