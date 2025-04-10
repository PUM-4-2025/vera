from extract import extract
from visual import wav_to_db_csv
from db_analysis import find_threshold_crossings
import sys
def run(in_video, out_csv):
    extract(input_video= in_video, output_audio= "output.wav", sample_rate= 16000)
    wav_to_db_csv(wav_path= "output.wav", csv_path= "visual.csv")
    find_threshold_crossings(in_csv= "visual.csv", out_csv= out_csv)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python run.py <input_video> <output_csv>")
        sys.exit(1)

    in_video = sys.argv[1]
    out_csv = sys.argv[2]

    run(in_video= in_video, out_csv= out_csv)