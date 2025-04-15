#include <iostream>
#include <fstream>
#include <vector>
#include <cstdint>
#include <cmath>

#pragma pack(push, 1)

struct RIFFHeader {
    char riff[4];
    uint32_t chunkSize;
    char wave[4];
};

struct FMTSubchunk {
    char fmt[4];
    uint32_t subchunk1Size;
    uint16_t audioFormat;
    uint16_t numChannels;
    uint32_t sampleRate;
    uint32_t byteRate;
    uint16_t blockAlign;
    uint16_t bitsPerSample;
};

#pragma pack(pop)

int main() {
    const std::string inputPath = "C:\\Users\\oscar\\Desktop\\PUM4\\ljud\\Nature.webm.wav";
    const std::string outputPath = inputPath + ".txt";

    std::ifstream file(inputPath, std::ios::binary);
    if (!file) {
        std::cerr << "Failed to open " << inputPath << "\n";
        return 1;
    }

    RIFFHeader riffHeader;
    FMTSubchunk fmtChunk;

    file.read(reinterpret_cast<char*>(&riffHeader), sizeof(riffHeader));
    file.read(reinterpret_cast<char*>(&fmtChunk), sizeof(fmtChunk));

    if (std::string(riffHeader.riff, 4) != "RIFF" ||
        std::string(riffHeader.wave, 4) != "WAVE" ||
        std::string(fmtChunk.fmt, 4) != "fmt " ||
        fmtChunk.audioFormat != 1 ||
        fmtChunk.numChannels != 1 ||
        fmtChunk.sampleRate != 16000 ||
        fmtChunk.bitsPerSample != 16) {
        std::cerr << "Unsupported WAV format.\n";
        return 1;
    }

    if (fmtChunk.subchunk1Size > 16) {
        file.seekg(fmtChunk.subchunk1Size - 16, std::ios::cur);
    }

    char chunkId[4];
    uint32_t chunkSize;
    while (file.read(chunkId, 4)) {
        file.read(reinterpret_cast<char*>(&chunkSize), sizeof(chunkSize));
        if (std::string(chunkId, 4) == "data") {
            break;
        }
        file.seekg(chunkSize, std::ios::cur);
    }

    size_t totalSamples = chunkSize / sizeof(int16_t);
    std::vector<int16_t> samples(totalSamples);
    file.read(reinterpret_cast<char*>(samples.data()), chunkSize);
    file.close();

    const int groupSize = 160;
    size_t numGroups = totalSamples / groupSize;

    std::ofstream outFile(outputPath);
    if (!outFile) {
        std::cerr << "Failed to write to " << outputPath << "\n";
        return 1;
    }

    for (size_t i = 0; i < numGroups; ++i) {
        double sumSquares = 0.0;
        for (int j = 0; j < groupSize; ++j) {
            int16_t sample = samples[i * groupSize + j];
            sumSquares += sample * sample;
        }
        double rms = std::sqrt(sumSquares / groupSize);
        double db = (rms > 0.0) ? 20.0 * std::log10(rms / 32768.0) : -100.0;
        double roundedDb = std::round(db * 10.0) / 10.0 + 100;
        outFile << roundedDb << "\n";
    }

    outFile.close();
    std::cout << "Wrote " << numGroups << " rounded dB values to " << outputPath << "\n";
    return 0;
}
