#include "../include/http_server.h"

int main() {
  HttpServer server;
  server.listenTo("http://127.0.0.1:8080");
  server.start();

  return 0;
}
