#include "audio.h"
#include "files.h"
#include "http_server.h"

#include <cstdlib>

void extract(std::string in_video, UserSession &us) {
  std::string session_path = getUserMediaDir(us);
  std::string cmd = "ffmpeg -i " + session_path + in_video + " -vn -ac 1 -ar 16000 -y " +
                    session_path + in_video + ".wav";
  system(cmd.c_str());
}
