
# Denna fil kompilerar och kör back-end testerna i server/tests/tests.cpp.
# I den filen finns närmare beskrivning hur man skriver sina egna tester.

import subprocess
import os

# Spara absolute paths
root_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.join(root_dir, "server")
build_dir = os.path.join(server_dir, "build")

# Steg 1: Konfigurera Cmake
if not os.path.exists(build_dir):
    os.makedirs(build_dir)
    subprocess.run(["cmake", ".."], cwd=build_dir, check=True)

# Steg 2: Bygg (endast tests)
subprocess.run(["cmake", "--build", ".", "--target", "tests"], cwd=build_dir, check=True)

# Steg 3: Kör binary filen
test_binary = os.path.join(build_dir, "bin", "tests")
subprocess.run([test_binary], check=True)
