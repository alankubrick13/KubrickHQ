import os
import database

SUPPORTED_EXTS = ['.cbz', '.cbr', '.pdf', '.zip', '.rar']

def scan_directory(path):
    # Normalize path
    path = os.path.abspath(path)
    print(f"--- SCAN START ---")
    print(f"Target: {repr(path)}")
    print(f"Exists: {os.path.exists(path)}")
    print(f"Is File: {os.path.isfile(path)}")
    print(f"Is Dir: {os.path.isdir(path)}")
    
    added_count = 0
    
    # CASE 1: Single File
    if os.path.isfile(path):
        ext = os.path.splitext(path)[1].lower()
        print(f"Checking single file extension: {ext}")
        if ext in SUPPORTED_EXTS:
            try:
                size = os.path.getsize(path)
                title = os.path.splitext(os.path.basename(path))[0]
                print(f"Attempting DB Upsert: {title} ({ext})")
                
                # Check DB Connection
                try:
                    database.upsert_comic(path, title, ext.replace('.', ''), size)
                    print(f"SUCCESS: Added {title}")
                    return 1
                except Exception as db_err:
                    print(f"DB ERROR: {db_err}")
                    return 0
            except Exception as e:
                print(f"FILE ACCESS ERROR: {e}")
                return 0
        else:
            print(f"IGNORED: Extension {ext} not supported")
            return 0

    # CASE 2: Directory
    if not os.path.isdir(path):
        print(f"ERROR: Path is neither a file nor a directory.")
        return 0
        
    for root, dirs, files in os.walk(path):
        print(f"Scanning dir: {root} - Found {len(files)} files")
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in SUPPORTED_EXTS:
                full_path = os.path.join(root, file)
                try:
                    size = os.path.getsize(full_path)
                    print(f"Found candidate: {file}")
                    title = os.path.splitext(file)[0]
                    
                    database.upsert_comic(full_path, title, ext.replace('.', ''), size)
                    print(f"SUCCESS: Upserted {file}")
                    added_count += 1
                except Exception as e:
                    print(f"Error scanning {file}: {e}")
                    continue
            else:
                 # Optional: Log skipped files if needed (can be noisy)
                 # print(f"Skipping {file} (ext: {ext})")
                 pass
                 
    print(f"--- SCAN END: Added {added_count} ---")
    return added_count
