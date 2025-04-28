#include "http_server.h"
#include "upload_media.h"
#include "user_session.h"
#include "audio.h"

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
  server.setStaticFilesPath(STATIC_FILES_PATH);

  // TODO: Replace with proper user session handling
  UserSession test_us = UserSession{"abc123"};
  server.appendUserSession(test_us);

  // Register relevant handlers
  registerMediaHandlers(server);
  registerAudioHandlers(server);
  registerUserSessionHandlers(server); //I just assume we need to do this here and not later

  // Run server
  server.start();

  return 0;
}