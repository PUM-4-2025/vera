#include <iostream>
#include <fstream>
#include "audio.h"
#include "files.h"
#include "http_server.h"

int db_analysis(const std::string in_txt, int threshold_db, int min_duration_seconds, UserSession &us){
    std::string session_path = getUserMediaDir(us);

    std::string input_path = session_path + in_txt;
    std::string output_path = input_path + ".csv";
    std::ifstream input_file(input_path, std::ios::binary);
    if (!input_file) {
        std::cerr << "Failed to open " << input_path << "\n";
        return 1;
    }
    std::ofstream output_file(output_path);
    if (!output_file) {
        std::cerr << "Failed to write to " << output_path << "\n";
        return 1;
    }
    int start_time = 0;
    int stop_time = 0;
    float db;
    int time = 0; // time in 10ms
    bool cros_down = false;
    bool cros_up = false;
    int no_crossings = 0;
    while(input_file >> db){
        time++; // every line is 10 ms time/100 = time in seconds
        stop_time = time;
        if(!cros_up && db > threshold_db){cros_up = true; start_time = time; std::cout << "start: " << start_time/100 << ", db: " << db << std::endl;}
        if(min_duration_seconds < (stop_time-start_time)/100 && !cros_down && db < threshold_db){cros_down = true; std::cout << "stop: " << stop_time/100 << ", db: " << db << std::endl;}

        if (cros_up && cros_down)
        {
            no_crossings++;
            cros_up = false;
            cros_down = false;
            std::cout << "-------\nWrite: " << start_time/100 << ", " << stop_time/100 << output_path << std::endl;
            std::cout << "time difference: " << (stop_time-start_time)/100 <<"\n-------" << std::endl; 
            output_file << start_time/100 << ", " << stop_time/100 << "\n"; // pipe to output_file
            start_time = stop_time;
        }
        
    }
    std::cout <<  "wrote " << no_crossings << " times" << std::endl; 
    return 0;
}