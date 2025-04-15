#include <cstdlib>
#include <fstream>
#include <iostream>
#include "run.h"
using namespace std;

void run(string in_video, int threshold_db, int min_sec){
    string prefix = "py run.py ";
    string run = prefix + in_video + " " + to_string(threshold_db) + " " + to_string(min_sec);
    system(run.c_str());
}
