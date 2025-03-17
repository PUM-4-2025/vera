include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/helpers
)

# kind of bad practice, might change later
file(GLOB TEST_FILES "test_*.cpp")

# output dir for tests
file(MAKE_DIRECTORY ${CMAKE_BINARY_DIR}/bin/tests)

# individual file for each test, might change later
foreach(TEST_FILE ${TEST_FILES})
    # get file name
    get_filename_component(TEST_NAME ${TEST_FILE} NAME_WE)
    
    # create exe
    add_executable(${TEST_NAME} ${TEST_FILE})
    
    # linking against gtest and server lib
    target_link_libraries(${TEST_NAME} PRIVATE
        server_lib
        GTest::GTest
        GTest::Main
    )
    
    # setting output dir
    set_target_properties(${TEST_NAME} PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin/tests
    )
    
    # add to ctest
    add_test(NAME ${TEST_NAME} COMMAND ${CMAKE_BINARY_DIR}/bin/tests/${TEST_NAME})
    
    # temp, adding unit label to all tests
    set_tests_properties(${TEST_NAME} PROPERTIES LABELS "unit")
    
    # also temp, setting 1min timeout
    set_tests_properties(${TEST_NAME} PROPERTIES TIMEOUT 60)
    
    message(STATUS "Created test: ${TEST_NAME}")
endforeach()

message(STATUS "Test exe will be placed in: ${CMAKE_BINARY_DIR}/bin/tests")
message(STATUS "Run 'ctest' to execute all tests")