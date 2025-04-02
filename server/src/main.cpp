#include "../include/http_server.h"

#include <iostream>

int main() {
  const char *portEnv = std::getenv("PORT");
  int port = std::stoi(portEnv);

  std::string url = "http://127.0.0.1:" + std::to_string(port);

  HttpServer server;
  server.listenTo(url);
  server.start();

  std::cout << "Server listening at " << url << '\n';

  return 0;
}