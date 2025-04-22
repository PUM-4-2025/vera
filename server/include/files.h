#ifndef FILES_H
#define FILES_H

#include "http_server.h"

#include <filesystem>

std::string getUserMediaDir(UserSession &us);

int writeTextFile(const std::string &path, UserSession &us, const std::string &data);

std::string readTextFile(const std::string &path, UserSession &us);

std::filesystem::path getTestingDir();

#endif