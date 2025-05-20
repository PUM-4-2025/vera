#include "audio.h"
#include "files.h"
#include "http_server.h"
#include "project_config.h"
#include "upload_media.h"

#include <iostream>

int main() {
#ifdef __cplusplus
  std::cout << 'C++ version: ' << __cplusplus << std::endl;
#endif

  const char *portEnv = std::getenv("PORT");
  int port = std::stoi(portEnv);

  std::string url = "http://127.0.0.1:" + std::to_string(port);

  // Set up server properties
  HttpServer server;
  server.listenTo(url);

  if (STATIC_FILES_PATH != "") {
    std::cout << "Static files: " << STATIC_FILES_PATH << "\n";
    server.setStaticFilesPath(STATIC_FILES_PATH);
  }

  // Register relevant handlers
  registerMediaHandlers(server);
  registerAudioHandlers(server);
  registerUserSessionHandlers(server);  // I just assume we need to do this here and not later

  // Print directory that Vera will use for verbosity
  printVeraDir();

  // Run server
  server.start();

  return 0;
}
