TARGET_DIR = build/
C_OBJS=$(wildcard src/*.cpp src/**/*.cpp)

debug: | $(TARGET_DIR)
	g++ $(C_OBJS) -o $(TARGET_DIR)server

release: | $(TARGET_DIR)
	g++ -O3 $(C_OBJS) -o $(TARGET_DIR)server

clean:
	rm -rf $(TARGET_DIR)

$(TARGET_DIR):
	@mkdir -p $(TARGET_DIR)
