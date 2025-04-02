/*
 * Abstraction class for building a webserver and handling web requests.
 */

#ifndef HTTPSERVER_H
#define HTTPSERVER_H

#include "../extern/mongoose/mongoose.h"

#include <string>

class HttpServer {
public:
  /**
   * Pass adress as a string to listen to, e.g. "localhost:8080"
   */
  HttpServer() = default;
  ~HttpServer() = default;

  void listenTo(std::string adress);
  void start();

  // TODO: Come back and iterate on function below. This is meant
  // to be a function to allow other modules, like the audio
  // analysis to register a handler for a specific api path,
  // e.g. ("/api/audio", audio_analysis_func).
  void registerHandler(std::string api_path, void (*f)(void)) {};

private:
  struct mg_mgr m_mgr;
  std::string m_adress;

  static void eventHandler(struct mg_connection *c, int ev, void *ev_data);
};

#endif