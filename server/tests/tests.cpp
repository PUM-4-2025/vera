
// Testfil där alla enhetstester för backend kommer skrivas mha catch2 framework.
// Här kan man skriva test cases på sättet du ser nedan.
// Två executables skapas när vera körs, en som kör hemsidan och en som 
// Kör tester. För att det ska kompilera korrekt behöver du lägga till alla .cpp filer som 
// ditt test använder i server/CMakeLists.txt add_executables(tests...) (rad 96) Observera ej server/tests/Cmakelists


#include "http_server.h"
#define CATCH_CONFIG_MAIN  // This creates a main() function automatically

#include "../extern/catch2/single_include/catch2/catch.hpp"
#include "audio.h"
#include "files.h"
#include "video.h"

#include <filesystem>


TEST_CASE("extract creates a .wav file from video input", "[extract]") {
    std::string video_file = "sample_video.mp4";

    std::filesystem::path path = getTestingDir();
    path.append(video_file);

    // Kör funktionen
    UserSession test_session = UserSession { "test" };
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
    std::vector<int> invalid_coords = {1000, 500, 1000, 500}; // Medvetet för stort ROI
    

    REQUIRE_THROWS_AS(analyse_video(invalid_coords), std::invalid_argument);
}

