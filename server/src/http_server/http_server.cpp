#include "../../include/http_server.h"
#include "project_config.h"

#include <iostream>
void HttpServer::listenTo(std::string adress) {
  m_adress_ = adress;
}

void HttpServer::start() {
  mg_mgr_init(&m_mgr_);
  mg_http_listen(&m_mgr_, m_adress_.c_str(), eventHandler, nullptr);

  std::cout << "Webserver running on: " << m_adress_ << std::endl;

  for (;;) {
    // Using 1000 from mongooses own example:
    // https://mongoose.ws/documentation/#2-minute-integration-guide
    mg_mgr_poll(&m_mgr_, 1000);
  }
}

/**
 * Currently the eventhandler can only server static index.html for VERA.
 */
void HttpServer::eventHandler(struct mg_connection *c, int ev, void *ev_data) {
  if (ev == MG_EV_HTTP_MSG) {                                       // New HTTP request received
    auto *hm = (struct mg_http_message *)ev_data;                   // Parsed HTTP request
    struct mg_http_serve_opts opts = {.root_dir = TOSTRING(STATIC_FILES_PATH)};// For all other URLs,
    mg_http_serve_dir(c, hm, &opts);                                // Serve static files
  }
}