#ifndef FILES_H
#define FILES_H

#include "http_server.h"

#include <filesystem>

std::string getUserMediaDir(UserSession &us);

bool fileExists(std::string path, UserSession &us);

int writeTextFile(std::string path, std::string data, UserSession &us);

std::string readTextFile(std::string path, UserSession &us);

std::filesystem::path getTestingDir();

std::string sanitizeName(std::string name);

void renameFile(std::string old_name, std::string new_name, UserSession &us);

void printVeraDir();

#endif
