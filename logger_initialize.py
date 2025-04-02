import logging
from pathlib import Path

# ANSI color codes for terminal output
class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

# behövs för att färger inte syns i logfilen
class ColoredFormatter(logging.Formatter):
    def __init__(self, fmt=None, datefmt=None, style='%'):
        super().__init__(fmt, datefmt, style)
        self.COLORS = {
            'DEBUG': Colors.BLUE,
            'INFO': Colors.GREEN,
            'WARNING': Colors.YELLOW,
            'ERROR': Colors.RED,
            'CRITICAL': Colors.RED + Colors.BOLD
        }

    def format(self, record):
        levelname = record.levelname
        levelcolor = self.COLORS.get(levelname, '')
        message = super().format(record)
        message = f'{levelcolor}{message}{Colors.ENDC}'
        return message


def setup_logger(name):
    logger = logging.getLogger()
    if logger.handlers:
        for handler in logger.handlers:
            logger.removeHandler(handler)
    
    console_handler = logging.StreamHandler()
    console_format = '%(levelname)s - %(message)s'
    console_handler.setFormatter(ColoredFormatter(console_format))
    
    file_handler = logging.FileHandler(
        f"{Path(__file__).parent.absolute()}/{name}.log", 
        mode="w", 
        encoding="utf-8"
    )
    file_format = '%(asctime)s - %(levelname)s - %(message)s'
    file_handler.setFormatter(logging.Formatter(file_format))
    
    logger.setLevel(logging.INFO)
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    return logging.getLogger(__name__)