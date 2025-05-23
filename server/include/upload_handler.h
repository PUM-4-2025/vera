#ifndef UPLOADHANDLER_H
#define UPLOADHANDLER_H

#include "upload_media.h"

#include <mutex>
#include <optional>
#include <vector>

class UploadHandler {
public:
  UploadHandler();
  ~UploadHandler();

  void newSession(UploadSession session);
  void removeSession(const UploadSession &session);
  std::optional<UploadSession> getSession(int upload_id);
  bool isUniqueId(int id);
  void incrementChunk(UploadSession &session);
  bool sessionCompleted(const UploadSession &session);

private:
  std::vector<UploadSession> m_uploads_;
  std::mutex m_uploads_guard_;
};

#endif
