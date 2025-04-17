#include <cstdlib>
#include "audio.h"

std::string E_PATH;

void extract(std::string in_video){
    std::string cmd = "ffmpeg -i " + E_PATH + in_video +  " -vn -ac 1 -ar 16000 -y " + E_PATH + in_video + ".wav"; 
    system(cmd.c_str());
}