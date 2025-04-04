cmake_minimum_required(VERSION 3.10)
project(server)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

option(BUILD_TESTING "Build the tests" OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

if(WIN32)
  set(PLATFORM_SPECIFIC_LIBS ws2_32)
else()
  set(PLATFORM_SPECIFIC_LIBS)
endif()

if(MSVC) # disable warnings for mongoose
    set(MONGOOSE_WARNINGS 
        /W0
        /D_CRT_SECURE_NO_WARNINGS
        /D_SILENCE_ALL_CXX17_DEPRECATION_WARNINGS
    )
else()
    set(MONGOOSE_WARNINGS 
        -w
        -Wno-everything
        -Wno-pedantic
        -Wno-conversion
    )
endif()

if(DEFINED BACKEND_PORT)
    message(STATUS "Using specified backend port: ${BACKEND_PORT}")
    add_definitions(-DBACKEND_PORT=${BACKEND_PORT})
else()
    message(STATUS "Using default backend port: 8000")
    add_definitions(-DBACKEND_PORT=8000)
endif()

if(DEFINED STATIC_FILES_PATH)
  message(STATUS "Static files will be served in dir: ${STATIC_FILES_PATH}")
  add_definitions(-DSTATIC_FILES_PATH="${STATIC_FILES_PATH}")
endif()

configure_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/include/project_config.h.in"
    "${CMAKE_CURRENT_SOURCE_DIR}/include/project_config.h"
)


include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/extern/mongoose
    ${CMAKE_CURRENT_SOURCE_DIR}/extern/json
)

add_library(mongoose STATIC 
    ${CMAKE_CURRENT_SOURCE_DIR}/extern/mongoose/mongoose.c
)

target_compile_options(mongoose PRIVATE 
    ${MONGOOSE_WARNINGS}
)

add_library(mongoose_includes INTERFACE)
target_include_directories(mongoose_includes INTERFACE 
    ${CMAKE_CURRENT_SOURCE_DIR}/extern/mongoose
)

target_compile_options(mongoose_includes INTERFACE 
    ${MONGOOSE_WARNINGS}
)

set(CORE_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/src/main.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/http_server/http_server.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/media_handler/upload_media.cpp
    # Add more source files here
)

set(UTIL_SOURCES
    # logger?
    # config?
)

set(ALL_SOURCES
    ${CORE_SOURCES}
    ${UTIL_SOURCES}
)



add_executable(server ${ALL_SOURCES})

target_compile_options(server PRIVATE -Wall -Wextra)


target_link_libraries(server 
    mongoose 
    mongoose_includes
    ${PLATFORM_SPECIFIC_LIBS}
)

# debug config (default)
set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -Wpedantic -Wshadow -Wconversion -g")

# Release config
set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -O3 -DNDEBUG")


if(BUILD_TESTING)
    set(LIB_SOURCES ${ALL_SOURCES})
    list(REMOVE_ITEM LIB_SOURCES ${CMAKE_CURRENT_SOURCE_DIR}/src/main.cpp)

    #add_library(server_lib STATIC ${LIB_SOURCES})
    enable_testing()
    find_package(GTest REQUIRED)
    add_subdirectory(tests)
endif()