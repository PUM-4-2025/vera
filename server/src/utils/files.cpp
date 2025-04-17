#include "files.h"
#include "http_server.h"

#include <fstream>


#include <iostream>

/**
 * Returns the VERA uses in temporary files directory to store 
 * uploaded or generated files.
 */
std::filesystem::path getVeraPath() {
    std::filesystem::path path = std::filesystem::temp_directory_path();
    path.append("vera");
    return path;
}

/**
 * Checks whether or not a session has permission to access
 * a file/directory.
 */
bool userHasPermission(UserSession &us, std::string path) {
    std::filesystem::path us_path = getVeraPath();
    us_path.append(us.session_id);
    return path.find(us_path) != std::string::npos;
}

/**
 * Returns the temporary folder directroy that the 
 * session has access to.
 */
std::string getUserMediaDir(UserSession &us) {
    std::filesystem::path path = getVeraPath();
    path.append(us.session_id);

    if (!std::filesystem::exists(path)) {
        std::filesystem::create_directories(path);
    }

    return path.string();
}

/**
 * Helper function for writing string/text data to a file.
 * Also handles permissions.
 */
int writeTextFile(std::string path, std::string data, UserSession &us) {
    if (!userHasPermission(us, path)) {
        return -1;
    }

    std::ofstream f(path);
    if (!f.is_open()) {
        return -1;
    }

    f.write(data.c_str(), data.size());
    f.close();

    return 0;
}

/**
 * Helper function for reading string/text data from a file.
 * Also handles permissions.
 */
std::string readTextFile(std::string path, UserSession &us) {
    if (!userHasPermission(us, path)) {
        return "";
    }

    std::ifstream f(path);
    if (!f.is_open()) {
        return "";
    }

    std::string out((std::istreambuf_iterator<char>(f)),
                    std::istreambuf_iterator<char>());
    f.close();
    return out;
}


/**
 * Returns the VERA uses in temporary files directory to store 
 * uploaded or generated files.
 */
std::filesystem::path getTestingDir() {
    std::filesystem::path path = std::filesystem::temp_directory_path();
    path.append("vera-testing");
    return path;
}