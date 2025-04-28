#ifndef FILES_H
#define FILES_H

#include "http_server.h"

#include <filesystem>

std::string getUserMediaDir(UserSession &us);

int writeTextFile(std::string path, std::string data);

std::string readTextFile(std::string path);

std::filesystem::path getTestingDir();

#endif