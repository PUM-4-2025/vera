#include "common.h"
#include "audio_handler.h"
#include "http_server.h"
#include "upload_media.h"
#include "project_config.h"

#include <iostream>

int main() {
  #ifdef __cplusplus
  std::cout << 'C++ version: ' << __cplusplus << std::endl;
  #endif

  const char *portEnv = std::getenv("PORT");
  int port = std::stoi(portEnv);

  std::string url = "http://127.0.0.1:" + std::to_string(port);

  // Set up server properties
  server.listenTo(url);
  server.setStaticFilesPath(STATIC_FILES_PATH);

  // Register relevant handlers
  registerMediaHandlers(server);
  registerAudioHandlers(server);

  // Run server
  server.start();

  return 0;
}