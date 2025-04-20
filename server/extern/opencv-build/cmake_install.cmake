# Install script for directory: C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv

# Set the install prefix
if(NOT DEFINED CMAKE_INSTALL_PREFIX)
  set(CMAKE_INSTALL_PREFIX "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-install")
endif()
string(REGEX REPLACE "/$" "" CMAKE_INSTALL_PREFIX "${CMAKE_INSTALL_PREFIX}")

# Set the install configuration name.
if(NOT DEFINED CMAKE_INSTALL_CONFIG_NAME)
  if(BUILD_TYPE)
    string(REGEX REPLACE "^[^A-Za-z0-9_]+" ""
           CMAKE_INSTALL_CONFIG_NAME "${BUILD_TYPE}")
  else()
    set(CMAKE_INSTALL_CONFIG_NAME "Release")
  endif()
  message(STATUS "Install configuration: \"${CMAKE_INSTALL_CONFIG_NAME}\"")
endif()

# Set the component getting installed.
if(NOT CMAKE_INSTALL_COMPONENT)
  if(COMPONENT)
    message(STATUS "Install component: \"${COMPONENT}\"")
    set(CMAKE_INSTALL_COMPONENT "${COMPONENT}")
  else()
    set(CMAKE_INSTALL_COMPONENT)
  endif()
endif()

# Is this installation the result of a crosscompile?
if(NOT DEFINED CMAKE_CROSSCOMPILING)
  set(CMAKE_CROSSCOMPILING "FALSE")
endif()

# Set path to fallback-tool for dependency-resolution.
if(NOT DEFINED CMAKE_OBJDUMP)
  set(CMAKE_OBJDUMP "C:/msys64/ucrt64/bin/llvm-objdump.exe")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "licenses" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/etc/licenses" TYPE FILE RENAME "flatbuffers-LICENSE.txt" FILES "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv/3rdparty/flatbuffers/LICENSE.txt")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "licenses" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/etc/licenses" TYPE FILE RENAME "opencl-headers-LICENSE.txt" FILES "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv/3rdparty/include/opencl/LICENSE.txt")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "dev" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/x64/mingw/staticlib" TYPE STATIC_LIBRARY OPTIONAL FILES "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/3rdparty/lib/libade.a")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "licenses" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/etc/licenses" TYPE FILE RENAME "ade-LICENSE" FILES "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/3rdparty/ade/ade-0.1.2e/LICENSE")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "licenses" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/etc/licenses" TYPE FILE RENAME "ffmpeg-license.txt" FILES "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv/3rdparty/ffmpeg/license.txt")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "licenses" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/etc/licenses" TYPE FILE RENAME "ffmpeg-readme.txt" FILES "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv/3rdparty/ffmpeg/readme.txt")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "dev" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/opencv2" TYPE FILE FILES "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/cvconfig.h")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "dev" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/opencv2" TYPE FILE FILES "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/opencv2/opencv_modules.hpp")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "dev" OR NOT CMAKE_INSTALL_COMPONENT)
  if(EXISTS "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/x64/mingw/staticlib/OpenCVModules.cmake")
    file(DIFFERENT _cmake_export_file_changed FILES
         "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/x64/mingw/staticlib/OpenCVModules.cmake"
         "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/CMakeFiles/Export/c5d088fd7c4fe89440a4935f44291ba9/OpenCVModules.cmake")
    if(_cmake_export_file_changed)
      file(GLOB _cmake_old_config_files "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/x64/mingw/staticlib/OpenCVModules-*.cmake")
      if(_cmake_old_config_files)
        string(REPLACE ";" ", " _cmake_old_config_files_text "${_cmake_old_config_files}")
        message(STATUS "Old export file \"$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/x64/mingw/staticlib/OpenCVModules.cmake\" will be replaced.  Removing files [${_cmake_old_config_files_text}].")
        unset(_cmake_old_config_files_text)
        file(REMOVE ${_cmake_old_config_files})
      endif()
      unset(_cmake_old_config_files)
    endif()
    unset(_cmake_export_file_changed)
  endif()
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/x64/mingw/staticlib" TYPE FILE FILES "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/CMakeFiles/Export/c5d088fd7c4fe89440a4935f44291ba9/OpenCVModules.cmake")
  if(CMAKE_INSTALL_CONFIG_NAME MATCHES "^([Rr][Ee][Ll][Ee][Aa][Ss][Ee])$")
    file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/x64/mingw/staticlib" TYPE FILE FILES "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/CMakeFiles/Export/c5d088fd7c4fe89440a4935f44291ba9/OpenCVModules-release.cmake")
  endif()
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "dev" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/x64/mingw/staticlib" TYPE FILE FILES
    "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/win-install/OpenCVConfig-version.cmake"
    "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/win-install/x64/mingw/staticlib/OpenCVConfig.cmake"
    )
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "dev" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/." TYPE FILE FILES
    "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/win-install/OpenCVConfig-version.cmake"
    "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/win-install/OpenCVConfig.cmake"
    )
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "libs" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/." TYPE FILE PERMISSIONS OWNER_READ OWNER_WRITE GROUP_READ WORLD_READ FILES "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv/LICENSE")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "scripts" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/." TYPE FILE PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE GROUP_READ GROUP_EXECUTE WORLD_READ WORLD_EXECUTE FILES "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/CMakeFiles/install/setup_vars_opencv4.cmd")
endif()

if(NOT CMAKE_INSTALL_LOCAL_ONLY)
  # Include the install script for each subdirectory.
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/3rdparty/zlib/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/3rdparty/libjpeg-turbo/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/3rdparty/libtiff/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/3rdparty/libwebp/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/3rdparty/openjpeg/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/3rdparty/libpng/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/3rdparty/openexr/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/3rdparty/protobuf/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/include/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/calib3d/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/core/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/dnn/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/features2d/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/flann/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/gapi/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/highgui/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/imgcodecs/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/imgproc/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/java/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/js/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/ml/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/objc/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/objdetect/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/photo/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/python/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/stitching/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/ts/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/video/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/videoio/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/.firstpass/world/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/core/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/imgproc/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/imgcodecs/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/modules/highgui/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/doc/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/data/cmake_install.cmake")
  include("C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/apps/cmake_install.cmake")

endif()

string(REPLACE ";" "\n" CMAKE_INSTALL_MANIFEST_CONTENT
       "${CMAKE_INSTALL_MANIFEST_FILES}")
if(CMAKE_INSTALL_LOCAL_ONLY)
  file(WRITE "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/install_local_manifest.txt"
     "${CMAKE_INSTALL_MANIFEST_CONTENT}")
endif()
if(CMAKE_INSTALL_COMPONENT)
  if(CMAKE_INSTALL_COMPONENT MATCHES "^[a-zA-Z0-9_.+-]+$")
    set(CMAKE_INSTALL_MANIFEST "install_manifest_${CMAKE_INSTALL_COMPONENT}.txt")
  else()
    string(MD5 CMAKE_INST_COMP_HASH "${CMAKE_INSTALL_COMPONENT}")
    set(CMAKE_INSTALL_MANIFEST "install_manifest_${CMAKE_INST_COMP_HASH}.txt")
    unset(CMAKE_INST_COMP_HASH)
  endif()
else()
  set(CMAKE_INSTALL_MANIFEST "install_manifest.txt")
endif()

if(NOT CMAKE_INSTALL_LOCAL_ONLY)
  file(WRITE "C:/Users/oscar/Desktop/PUM4/vera/server/extern/opencv-build/${CMAKE_INSTALL_MANIFEST}"
     "${CMAKE_INSTALL_MANIFEST_CONTENT}")
endif()
