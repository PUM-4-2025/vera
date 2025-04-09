#ifndef UPLOADHANDLER_H
#define UPLOADHANDLER_H

#include "upload_media.h"

#include <mutex>
#include <vector>

class UploadHandler {
public:
  UploadHandler();
  ~UploadHandler();

  void newSession(const UploadSession &session);
  void removeSession(const UploadSession &session);
  UploadSession* getSession(int upload_id);
  bool isUniqueId(int id);
  void incrementChunk(UploadSession &session);
  bool sessionCompleted(const UploadSession &session);

private:
  std::vector<UploadSession> m_uploads_;
  std::mutex m_uploads_guard_;
};

#endif