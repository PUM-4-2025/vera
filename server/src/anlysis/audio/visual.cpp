#include <iostream>
#include <fstream>
#include <vector>
#include <cstdint>
#include <cmath>
#include "audio.h"

#pragma pack(push, 1)

std::string V_PATH;

struct RIFFHeader {
    char riff[4];
    uint32_t chunk_size;
    char wave[4];
};

struct FMTSubchunk {
    char fmt[4];
    uint32_t subchunk1_size;
    uint16_t audio_format;
    uint16_t num_channels;
    uint32_t sample_rate;
    uint32_t byte_rate;
    uint16_t block_align;
    uint16_t bits_per_sample;
};

#pragma pack(pop)

int visual(const std::string in_wav){
    const std::string input_path = V_PATH + "Nature.webm.wav";
    const std::string output_path = input_path + ".txt";

    std::ifstream input_file(input_path, std::ios::binary);
    if (!input_file) {
        std::cerr << "Failed to open " << input_path << "\n";
        return 1;
    }

    RIFFHeader riff_header;
    FMTSubchunk fmt_chunk;

    input_file.read(reinterpret_cast<char*>(&riff_header), sizeof(riff_header));
    input_file.read(reinterpret_cast<char*>(&fmt_chunk), sizeof(fmt_chunk));

    if (std::string(riff_header.riff, 4) != "RIFF" ||
        std::string(riff_header.wave, 4) != "WAVE" ||
        std::string(fmt_chunk.fmt, 4) != "fmt " ||
        fmt_chunk.audio_format != 1 ||
        fmt_chunk.num_channels != 1 ||
        fmt_chunk.sample_rate != 16000 ||
        fmt_chunk.bits_per_sample != 16) {
        std::cerr << "Unsupported WAV format.\n";
        return 1;
    }

    if (fmt_chunk.subchunk1_size > 16) {
        input_file.seekg(fmt_chunk.subchunk1_size - 16, std::ios::cur);
    }

    char chunkId[4];
    uint32_t chunk_size;
    while (input_file.read(chunkId, 4)) {
        input_file.read(reinterpret_cast<char*>(&chunk_size), sizeof(chunk_size));
        if (std::string(chunkId, 4) == "data") {
            break;
        }
        input_file.seekg(chunk_size, std::ios::cur);
    }

    size_t total_samples = chunk_size / sizeof(int16_t);
    std::vector<int16_t> samples(total_samples);
    input_file.read(reinterpret_cast<char*>(samples.data()), chunk_size);
    input_file.close();

    const int group_size = 160;
    size_t num_groups = total_samples / group_size;

    std::ofstream output_file(output_path);
    if (!output_file) {
        std::cerr << "Failed to write to " << output_path << "\n";
        return 1;
    }

    for (size_t i = 0; i < num_groups; ++i) {
        double sum_squares = 0.0;
        for (int j = 0; j < group_size; ++j) {
            int16_t sample = samples[i * group_size + j];
            sum_squares += sample * sample;
        }
        double rms = std::sqrt(sum_squares / group_size);
        double db = (rms > 0.0) ? 20.0 * std::log10(rms / 32768.0) : -100.0;
        double rounded_db = std::round(db * 10.0) / 10.0 + 100;
        output_file << rounded_db << "\n";
    }

    output_file.close();
    std::cout << "Wrote " << num_groups << " rounded dB values to " << output_path << "\n";
    return 0;
}
