#include "audio.h"
#include "files.h"
#include "http_server.h"
#include <cmath>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <vector>

#pragma pack(push, 1)

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

/**
 * ### Parameters:
 * `in_wav` - Path to a .wav file.
 * `&us` - UserSession.
 * `fps` - Frames per second from corresponding video.
 * ### Returns:
 * A validation int, 0 if success else 1
 * 
 * ### Creates:
 * A line seperated .txt file with the audio dB, 
 * where the amount of lines are the same as frames
 */
int visual(const std::string in_wav, UserSession &us, float fps) {
  std::string session_path = getUserMediaDir(us);
  const std::string input_path = session_path + in_wav;
  const std::string output_path = input_path + ".txt";

  std::ifstream input_file(input_path, std::ios::binary);
  if (!input_file) {
    std::cerr << "Failed to open " << input_path << "\n";
    return 1;
  }

  RIFFHeader riff_header;
  FMTSubchunk fmt_chunk;

  input_file.read(reinterpret_cast<char *>(&riff_header), sizeof(riff_header));
  input_file.read(reinterpret_cast<char *>(&fmt_chunk), sizeof(fmt_chunk));

  if (std::string(riff_header.riff, 4) != "RIFF" || std::string(riff_header.wave, 4) != "WAVE" ||
      std::string(fmt_chunk.fmt, 4) != "fmt " || fmt_chunk.audio_format != 1 ||
      fmt_chunk.num_channels != 1 || fmt_chunk.sample_rate != 16000 ||
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
    input_file.read(reinterpret_cast<char *>(&chunk_size), sizeof(chunk_size));
    if (std::string(chunkId, 4) == "data") {
      break;
    }
    input_file.seekg(chunk_size, std::ios::cur);
  }

  size_t total_samples = chunk_size / sizeof(int16_t);
  std::vector<int16_t> samples(total_samples);
  input_file.read(reinterpret_cast<char *>(samples.data()), chunk_size);
  input_file.close();

  const int group_size = (int)(fmt_chunk.sample_rate/fps); // this will make num_groups = No. frames
  size_t num_groups = total_samples / group_size;

  std::string data = "";
  for (size_t i = 0; i < num_groups; ++i) {
    double biggest_sample = 0.0;
    for (int j = 0; j < group_size; ++j) {
      int16_t sample = samples[i * group_size + j];
      if(sample > biggest_sample){
        biggest_sample = sample;
      }
    }
    double db = (biggest_sample > 0.0) ? 20.0 * std::log10(biggest_sample / 32768.0) : -100.0;
    double rounded_db = std::round(db * 10.0) / 10.0 + 100;
    data.append(std::to_string(rounded_db) + "\n");
  }
  writeTextFile(output_path, data);
  std::cout << "Wrote " << num_groups << " rounded dB values to " << output_path << "\n";
  return 0;
}
