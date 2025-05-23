
// Testfil där alla enhetstester för backend kommer skrivas mha catch2 framework.
// Här kan man skriva test cases på sättet du ser nedan.
// Två executables skapas när vera körs, en som kör hemsidan och en som
// Kör tester. För att det ska kompilera korrekt behöver du lägga till alla .cpp filer som
// ditt test använder i server/CMakeLists.txt add_executables(tests...) (rad 96) Observera ej
// server/tests/Cmakelists

#include "http_server.h"
#define CATCH_CONFIG_MAIN  // This creates a main() function automatically

#include "../extern/catch2/single_include/catch2/catch.hpp"
#include "audio.h"
#include "files.h"
#include "video.h"

#include <filesystem>
#include <fstream>

TEST_CASE("extract creates a .wav file from video input", "[extract]") {
  std::string video_file = "sample_video.mp4";

  std::filesystem::path path = getTestingDir();
  path.append(video_file);

  // Kör funktionen
  UserSession test_session = UserSession{"test"};
  std::string user_path = getUserMediaDir(test_session);

  user_path.append("sample_video.mp4");

  std::filesystem::copy_file(path, user_path);

  REQUIRE(std::filesystem::exists(user_path));

  extract(video_file, test_session);

  std::string wav_file_path = user_path + ".wav";

  // Verifiera att .wav-filen nu finns
  REQUIRE(std::filesystem::exists(wav_file_path));

  // Städa upp
  std::filesystem::remove(wav_file_path);
  std::filesystem::remove(user_path);
}

TEST_CASE("Kastar undantag om ROI är utanför bilden", "[error]") {
  std::vector<int> invalid_coords = {500, 2000, 500, 2000};  // Medvetet för stort ROI
  REQUIRE_THROWS_AS(analyse_video("", invalid_coords), std::invalid_argument);
}

TEST_CASE("Kastar undantag om ROI börjar utanför bilden", "[error]") {
  std::vector<int> invalid_coords = {-500, 500, -500,
                                     500};  // Medvetet ROI som börjar utanför bilden
  REQUIRE_THROWS_AS(analyse_video("", invalid_coords), std::invalid_argument);
}
TEST_CASE("db_analysis upptäcker högljudda segment från dB-textfil", "[audio-analysis]") {
  // Skapa testsession
  UserSession test_session{"test"};
  std::string session_dir = getUserMediaDir(test_session);

  // Definiera testfilens namn
  std::string txt_filename = "test_audio.wav.txt";
  std::string full_input_path = session_dir + txt_filename;

  // Skapa testdata med dB-värden som simulerar ljud (varje rad = 10 ms)
  std::ofstream input_file(full_input_path);
  REQUIRE(input_file.is_open());

  // Simulera dB-värden med ett högt ljudområde över tröskeln (40 dB)
  input_file
      << "30\n35\n42\n43\n45\n44\n41\n38\n30\n";  // högt ljud mellan rad 2-6 = 20ms till 60ms
  input_file.close();

  std::ifstream ifs(full_input_path);
  std::string testline;

  // Kontrollera att vi skriver till filen korrekt
  for (size_t i = 0; i < 9; i++) {
    std::getline(ifs, testline);
    std::cout << "Rad " << i << " är: " << testline << std::endl;
    REQUIRE(29 < std::stoi(testline));
    REQUIRE(std::stoi(testline) < 46);
  }

  // Parametrar: tröskel = 40 dB, minsta varaktighet = 0
  int threshold = 40;
  int min_duration = 0;  // tillåt även korta toppar

  // Anropa funktionen
  int result = db_analysis(txt_filename, threshold, min_duration, test_session);
  REQUIRE(result == 0);

  // Utdatafilen ska finnas
  std::string output_path = full_input_path + ".csv";
  REQUIRE(std::filesystem::exists(output_path));

  // Läs utdata och kontrollera innehållet
  std::ifstream output_file(output_path);
  REQUIRE(output_file.is_open());

  std::string line;
  std::getline(output_file, line);
  std::cout << "Raden är :::::" << line << std::endl;
  REQUIRE_FALSE(line.empty());
  REQUIRE(line == "2, 6");  // förväntat: högt ljud från rad 2 till 6 (dvs 20ms till 60ms)

  // Rensa upp efter testet
  std::filesystem::remove(full_input_path);
  std::filesystem::remove(output_path);
}
