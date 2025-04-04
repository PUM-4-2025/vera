#include <mongoose.h>
#include "http_server.h"
#include "project_config.h"
#include <iostream>
#include <utility>

HttpServer::HttpServer() {
  mg_mgr_init(&m_mgr_);
}

HttpServer::~HttpServer() {
  stop();
  mg_mgr_free(&m_mgr_);
}

void HttpServer::listenTo(std::string address) {
  m_address_ = std::move(address);
}

void HttpServer::setStaticFilesPath(std::string path) {
  m_static_dir_ = std::move(path);
}

void HttpServer::start() {
  mg_http_listen(&m_mgr_, m_address_.c_str(), eventHandler, this);

  std::cout << "Webserver running on: " << m_address_ << std::endl;
  std::cout << "Serving static files from: " << m_static_dir_ << std::endl;

  m_running_ = true;
  while (m_running_) {
    mg_mgr_poll(&m_mgr_, 1000);
  }
}

void HttpServer::stop() {
  m_running_ = false;
  std::cout << "Shutting down the servr..." << std::endl;
}

void HttpServer::registerHandler(const std::string &api_path, RequestHandler handler) {
  m_handlers_.push_back({api_path, handler});
}

/**
 */
void HttpServer::eventHandler(struct mg_connection *c, int ev, void *ev_data) {
  auto *server = static_cast<HttpServer *>(c->fn_data);

  if (ev == MG_EV_HTTP_MSG) {
    auto *hm = (struct mg_http_message *)ev_data;  // Parsed HTTP request

    bool handled = false;
    for (const auto &handler_info : server->m_handlers_) {
      std::string uri(hm->uri.buf, hm->uri.len);
      if (uri == handler_info.path || uri.find(handler_info.path + "/") == 0) {
        handler_info.handler(c, hm);
        handled = true;
        break;
      }
    }

    if (!handled) {
      struct mg_http_serve_opts opts = {};                                                   // Zero-initialize all fields
      opts.root_dir = server->m_static_dir_.c_str();                                        // For all other URLs,
      mg_http_serve_dir(c, hm, &opts);                                                      // Serve static files
    }
  }
}