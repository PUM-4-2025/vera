import subprocess
import sys
from pathlib import Path

def run_command(cmd):
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error: Command failed with return code {e.returncode}")
        sys.exit(e.returncode)
    except FileNotFoundError:
        print(f"Error: Command not found: {cmd[0]}")
        sys.exit(1)


def main():    
    script_dir = Path(__file__).parent.absolute()
    
    build_dir = script_dir / "build"

    if build_dir.exists():
        import shutil
        shutil.rmtree(build_dir)
    build_dir.mkdir()
    
    cmake_config_cmd = [
        "cmake", 
        "-B", str(build_dir), 
        "-S", str(script_dir)
    ]

    # behövs inte
    cmake_config_cmd.append("-DCMAKE_EXPORT_COMPILE_COMMANDS=ON")
    cmake_config_cmd.append("-DBUILD_TESTING=ON")

    run_command(cmake_config_cmd)
    
    cmake_build_cmd = ["cmake", "--build", str(build_dir)]
    run_command(cmake_build_cmd)


if __name__ == "__main__":
    main()