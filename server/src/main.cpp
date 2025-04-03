#include "http_server.h"
#include "project_config.h"
#include <iostream>

int main() {
  const char *portEnv = std::getenv("PORT");
  int port = std::stoi(portEnv);

  std::string url = "http://127.0.0.1:" + std::to_string(port);

  HttpServer server;
  server.listenTo(url);
  server.setStaticFilesPath(STATIC_FILES_PATH);
  server.start();


  return 0;
}