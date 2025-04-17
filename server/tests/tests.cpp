
// Testfil där alla enhetstester för backend kommer skrivas mha catch2 framework.
// Här kan man skriva test cases på sättet du ser nedan.
// Två executables skapas när vera körs, en som kör hemsidan och en som 
// Kör tester. För att det ska kompilera korrekt behöver du lägga till alla .cpp filer som 
// ditt test använder i server/CMakeLists.txt add_executables(tests...) (rad 96) Observera ej server/tests/Cmakelists
// tests.o körs ej automatiskt, du kör samtliga tester genom
// ./server/build/bin/tests    efter du kört Vera med python3 run.py


#define CATCH_CONFIG_MAIN  // This creates a main() function automatically

#include "../extern/catch2/single_include/catch2/catch.hpp"
#include "../src/anlysis/audio/extract.h"

#include <filesystem>

std::string PATH;

TEST_CASE("extract creates a .wav file from video input", "[extract]") {
    std::string video_file = "sample_video";
    std::string input_path = video_file + ".mp4";
    std::string wav_file = input_path + ".wav";

    // Kör funktionen
    extract(input_path);

    std::cout << "TEEEEESSSSSSTTTTTAAAAAAARRRRRR-------" << std::endl;
 
    // Verifiera att .wav-filen nu finns
    REQUIRE(std::filesystem::exists(PATH + wav_file));

    // Städa upp
    std::filesystem::remove(wav_file);
}
