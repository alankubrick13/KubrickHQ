import os
import zipfile
import rarfile
import pypdfium2 as pdfium
import png
from io import BytesIO
import re

# Simple natural sort key
def natural_keys(text):
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', text)]

# Configure RarMap
import platform
if platform.system() == 'Windows':
    # Check common paths for UnRAR
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cwd = os.getcwd()
    possible_paths = [
        os.path.join(base_dir, 'UnRAR.exe'),
        os.path.join(base_dir, 'unrar.exe'),
        os.path.join(base_dir, '..', 'UnRAR.exe'), # Project root relative to file
        os.path.join(base_dir, '..', 'unrar.exe'),
        os.path.join(cwd, 'UnRAR.exe'), # CWD root
        os.path.join(cwd, 'backend', 'UnRAR.exe'),
        r"C:\Program Files\WinRAR\UnRAR.exe",
        r"C:\Program Files (x86)\WinRAR\UnRAR.exe"
    ]
    
    print("--- UnRAR Detection Debug ---")
    found = False
    for p in possible_paths:
        exists = os.path.exists(p)
        print(f"Checking: {p} -> {exists}")
        if exists:
            rarfile.UNRAR_TOOL = p
            print(f"SUCCESS: UnRAR tool configured at {p}")
            found = True
            break
    
    if not found:
        print("FAILURE: UnRAR.exe not found in any common location. CBR files will fail.")
    print("-----------------------------")

class ComicReader:
    def __init__(self, file_path):
        self.file_path = file_path
        self.ext = os.path.splitext(file_path)[1].lower()
        self.type = self._determine_type()
        self._page_names = [] # For Archives
        self._doc = None # For PDF
        
        try:
            if self.type == 'pdf':
                self._doc = pdfium.PdfDocument(self.file_path)
            elif self.type in ['cbz', 'zip']:
                with zipfile.ZipFile(self.file_path, 'r') as zf:
                    all_files = zf.namelist()
                    self._page_names = sorted(
                        [f for f in all_files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))],
                        key=natural_keys
                    )
            elif self.type in ['cbr', 'rar']:
                # rarfile requires unrar installed
                with rarfile.RarFile(self.file_path, 'r') as rf:
                    all_files = rf.namelist()
                    self._page_names = sorted(
                        [f for f in all_files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))],
                        key=natural_keys
                    )
        except Exception as e:
            print(f"Error initializing reader for {file_path}: {e}")
            # We don't raise here to allow the object to exist, but it will be empty
            pass

    def _determine_type(self):
        if self.ext in ['.pdf']: return 'pdf'
        if self.ext in ['.cbz', '.zip']: return 'cbz'
        if self.ext in ['.cbr', '.rar']: return 'cbr'
        return 'unknown'

    def get_page_count(self):
        if self.type == 'pdf' and self._doc:
            return len(self._doc)
        return len(self._page_names)

    def get_page_data(self, index):
        """Returns bytes of the image at index (0-based)"""
        try:
            if self.type == 'pdf' and self._doc:
                if 0 <= index < len(self._doc):
                    page = self._doc[index]
                    bitmap = page.render(scale=2, rev_byteorder=True)
                    buf = BytesIO()
                    png.from_array(bitmap.buffer, mode='RGBA', width=bitmap.width, height=bitmap.height).save(buf)
                    return buf.getvalue()
            
            elif self.type == 'cbz':
                if 0 <= index < len(self._page_names):
                    with zipfile.ZipFile(self.file_path, 'r') as zf:
                        return zf.read(self._page_names[index])

            elif self.type == 'cbr':
                if 0 <= index < len(self._page_names):
                    # Check if unrar is available implicitly by the error
                    with rarfile.RarFile(self.file_path, 'r') as rf:
                        return rf.read(self._page_names[index])
        except rarfile.RarExecError as e:
            print(f"CBR Error (UnRAR not found?): {e}")
        except Exception as e:
            print(f"Error reading page {index} of {self.file_path}: {type(e).__name__} - {e}")
            return None
        return None

    def close(self):
        if self._doc:
            self._doc.close()
