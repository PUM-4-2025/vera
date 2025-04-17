#include <cstdlib>
#include <string>

void run(std::string in_video, int threshold_db, int min_sec){
    std::string prefix = "py run.py ";
    std::string run = prefix + in_video + " " + std::to_string(threshold_db) + " " + std::to_string(min_sec);
    system(run.c_str());
}
