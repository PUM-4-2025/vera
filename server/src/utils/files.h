#include "http_server.h"

std::string getUserMediaDir(UserSession &us);

int writeTextFile(std::string path, std::string data);

std::string readTextFile(std::string path);