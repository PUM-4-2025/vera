#include <cstdlib>
#include <fstream>
#include <iostream>
using namespace std;

int main(const char* in_video, int threshold_db, int min_sec){
    string prefix = "py run.py ";
    string run = prefix + in_video + " " + to_string(threshold_db) + " " + to_string(min_sec);
    std::system(run.c_str());
}
