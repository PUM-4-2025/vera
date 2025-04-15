#include <cstdlib>
#include <fstream>
#include <iostream>
#include "extract.h"
using namespace std;

void extract(const string in_video){
    string cmd = "ffmpeg -i " + PATH + in_video +  " -vn -ac 1 -ar 16000 -y " + PATH + in_video + ".wav"; 
    system(cmd.c_str());
}