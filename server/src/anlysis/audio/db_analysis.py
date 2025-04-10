import csv
import os
import sys
from path import path

PATH = path().PATH 

def find_threshold_crossings(in_csv, out_csv, threshold_db= 10, min_duration_seconds= 5):
    with open(PATH + in_csv, 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        data = [(float(row['Time (s)']), float(row['Amplitude (dB)'])) for row in reader]

    segments = []
    inside_segment = False
    segment_start = None
    previous_time = None

    for i in range(1, len(data)):
        time, db = data[i]
        prev_time, prev_db = data[i - 1]
        # Crossing UP
        if not inside_segment and prev_db <= float(threshold_db) < db:
            if not segments or time - segments[-1][1] >= float(min_duration_seconds):
                segment_start = time
                inside_segment = True

        # Crossing DOWN
        elif inside_segment and prev_db >= float(threshold_db) > db:
            segment_end = prev_time  # one step before going below
            segments.append((segment_start, segment_end))
            inside_segment = False

    # Om CSV slutar medan vi fortfarande är över tröskeln
    if inside_segment:
        segments.append((segment_start, data[-1][0]))

    # Skriv till CSV
    with open(PATH + out_csv, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Time (s)', 'Amplitude (dB)'])
        for start, end in segments:
            writer.writerow([start, end])

    sys.stdout.write(f"Saved dB_analysis data to: {PATH + out_csv}")

# Exempelanvändning
if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: python db_analysis.py input.csv output.csv threshold_db min_duration_seconds" )
        sys.exit(1)

    input_csv = sys.argv[1]
    threshold = sys.argv[2]
    min_duration_seconds = sys.argv[3]
    output_csv = sys.argv[4]

    if not os.path.exists(input_csv):
        print(f"File not found: {input_csv}")
        sys.exit(1)


    find_threshold_crossings(input_csv, output_csv, threshold, min_duration_seconds)