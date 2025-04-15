import csv
import os
import sys
from path import path

PATH = path().PATH 

def find_threshold_crossings(in_csv, threshold_db, min_duration_seconds):
    with open(PATH + in_csv, 'r') as txt:
        #reader = csv.DictReader(csvfile)
        data = [float(value) for value in txt.read().split(", ") if value.strip()]
        #data = [float(value) for value in txt.read().split(", ")]
        #data = [(float(row['Time (s)']), float(row['Amplitude (dB)'])) for row in reader]

    segments = []
    inside_segment = False
    segment_start = None
    previous_time = None
    time = 0.00
    for i in range(1, len(data)):
        db = data[i]
        prev_db = data[i - 1]
        prev_time = time
        time += 0.01
        # Crossing UP
        if not inside_segment and prev_db <= float(threshold_db) < db:
            if not segments or time - segments[-1][1] >= float(min_duration_seconds):
                segment_start = time
                inside_segment = True

        # Crossing DOWN
        elif inside_segment and prev_db >= float(threshold_db) > db:
            segment_end = prev_time  # one step before going below
            segments.append((round(segment_start, 4), round(segment_end, 4)))
            inside_segment = False

    # Om CSV slutar medan vi fortfarande är över tröskeln
    if inside_segment:
        segments.append((segment_start, data[-1][0]))

    # Skriv till CSV
    with open(PATH + in_csv + ".csv", 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Start', 'Stop'])
        for start, end in segments:
            writer.writerow([start, end])

    sys.stdout.write(f"Saved dB_analysis data to: {PATH + in_csv + ".csv"}")

# Exempelanvändning
if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python3 db_analysis.py input.csv threshold_db min_duration_seconds" )
        sys.exit(1)

    input_csv = sys.argv[1]
    threshold = sys.argv[2]
    min_duration_seconds = sys.argv[3]


    if not os.path.exists(input_csv):
        print(f"File not found: {input_csv}")
        sys.exit(1)


    find_threshold_crossings(input_csv, threshold, min_duration_seconds)