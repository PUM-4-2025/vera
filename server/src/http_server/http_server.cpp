#include "../../include/http_server.h"

#include <iostream>

void HttpServer::listenTo(std::string adress) {
  m_adress = adress;
}

void HttpServer::start() {
  mg_mgr_init(&m_mgr);
  mg_http_listen(&m_mgr, m_adress.c_str(), eventHandler, nullptr);

  std::cout << "Webserver running on: " << m_adress << std::endl;

  for (;;) {
    // Using 1000 from mongooses own example:
    // https://mongoose.ws/documentation/#2-minute-integration-guide
    mg_mgr_poll(&m_mgr, 1000);
  }
}

void HttpServer::eventHandler(struct mg_connection *c, int ev, void *ev_data) {}