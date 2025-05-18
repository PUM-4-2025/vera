#include "files.h"

#include "http_server.h"

#include <filesystem>
#include <fstream>
#include <iostream>
#include <iterator>
#include <regex>
#include <sstream>

/**
 * Returns the VERA uses in temporary files directory to store
 * uploaded or generated files.
 */
std::filesystem::path getVeraPath() {
  std::filesystem::path path = std::filesystem::temp_directory_path();
  path.append("vera");
  return path;
}

/**
 * Function for verbosity
 */
void printVeraDir() {
  std::filesystem::path path = getVeraPath();
  std::cout << "Using directory: " << path.string() << "\n";
}

/**
 * Checks whether or not a session has permission to access
 * a file/directory.
 */
bool userHasPermission(UserSession &us, std::string path) {
    std::filesystem::path us_path = getVeraPath();
    us_path.append(us.session_id);
    return path.find(us_path.string()) != std::string::npos;
}

/**
 * Returns the temporary folder directroy that the
 * session has access to.
 */
std::string getUserMediaDir(UserSession &us) {
  std::filesystem::path path = getVeraPath();
  path.append(us.session_id);

  if (!std::filesystem::exists(path)) {
    std::filesystem::create_directories(path);
  }

  std::string path_str = path.string();
  return path_str.append("/");
}

/**
 * Checks if UserSession has file in it's directory.
 */
bool fileExists(std::string filename, UserSession &us) {
  std::string path = getUserMediaDir(us);
  path.append(filename);

  return std::filesystem::exists(path);
}

/**
 * Helper function for writing string/text data to a file.
 * Also handles permissions.
 */
int writeTextFile(std::string path, std::string data, UserSession &us) {
  if (!userHasPermission(us, path)) {
    return -1;
  }

  std::ofstream f(path);
  if (!f.is_open()) {
    return -1;
  }

  f.write(data.c_str(), data.size());
  f.close();

  return 0;
}

/**
 * Helper function for reading string/text data from a file.
 * Also handles permissions.
 */
std::string readTextFile(std::string path, UserSession &us) {
  if (!userHasPermission(us, path)) {
    std::cout << "Invalid permission!" << "\n";
    return "";
  }

  std::ifstream f(path);
  if (!f.is_open()) {
    std::cout << "File not opened! (" << path << ")" << "\n";
    return "";
  }

  std::ostringstream out_stream;
  out_stream << f.rdbuf();

  f.close();
  return out_stream.str();
}

/**
 * Santizises name for use in C++ backends filesystem.
 */
std::string sanitizeName(std::string name) {
  std::replace(name.begin(), name.end(), ' ', '_');
  std::string out;
  std::regex e("^[A-Za-z0-9_]+$");
  std::regex_replace(std::back_inserter(out), name.begin(), name.end(), e, "$2");
  return out;
}

/**
 * Renames a file of directory
 */
void renameFile(std::string old_name, std::string new_name, UserSession &us) {
  std::string old_path = getUserMediaDir(us);
  std::string new_path = old_path;

  old_path.append(old_name);
  new_path.append(new_name);

  std::cout << "Renaming: " << old_path << " -> " << new_path << "\n";

  std::filesystem::rename(old_path, new_path);
}

/**
 * Returns a filesize, can be used to verify an entire file exists in Vera server.
 */
unsigned long getFilesize(std::string filename, UserSession &us) {
  std::string path = getUserMediaDir(us);
  path.append(filename);
  return std::filesystem::file_size(path);
}

/**
 * Returns the VERA uses in temporary files directory to store
 * uploaded or generated files.
 */
std::filesystem::path getTestingDir() {
  std::filesystem::path path = std::filesystem::temp_directory_path();
  path.append("vera-testing");
  return path;
}
