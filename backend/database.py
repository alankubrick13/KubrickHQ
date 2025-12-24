import sqlite3
import os
from datetime import datetime

# Database logic
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'library.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Comics table
    c.execute('''
        CREATE TABLE IF NOT EXISTS comics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_path TEXT UNIQUE,
            title TEXT,
            format TEXT,
            size_bytes INTEGER,
            page_count INTEGER DEFAULT 0,
            current_page INTEGER DEFAULT 0,
            status TEXT DEFAULT 'unread',
            cover_cached_path TEXT,
            added_at DATETIME,
            last_read_at DATETIME
        )
    ''')
    
    # Collections table
    c.execute('''
        CREATE TABLE IF NOT EXISTS collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            created_at DATETIME
        )
    ''')
    
    # Collection Items table
    c.execute('''
        CREATE TABLE IF NOT EXISTS collection_items (
            collection_id INTEGER,
            comic_id INTEGER,
            added_at DATETIME,
            PRIMARY KEY (collection_id, comic_id),
            FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE,
            FOREIGN KEY(comic_id) REFERENCES comics(id) ON DELETE CASCADE
        )
    ''')

    # Page Actions (Favorites & Notes)
    c.execute('''
        CREATE TABLE IF NOT EXISTS page_actions (
            comic_id INTEGER,
            page_number INTEGER,
            is_favorite BOOLEAN DEFAULT 0,
            note TEXT,
            updated_at DATETIME,
            PRIMARY KEY (comic_id, page_number),
            FOREIGN KEY(comic_id) REFERENCES comics(id) ON DELETE CASCADE
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS page_markers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comic_id TEXT NOT NULL,
            page_number INTEGER NOT NULL,
            x REAL NOT NULL,
            y REAL NOT NULL,
            content TEXT,
            created_at DATETIME,
            FOREIGN KEY (comic_id) REFERENCES comics (id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()

# --- Marker Helpers ---
def add_marker(comic_id, page, x, y, content):
    conn = get_connection()
    conn.execute('INSERT INTO page_markers (comic_id, page_number, x, y, content, created_at) VALUES (?, ?, ?, ?, ?, ?)', 
                 (comic_id, page, x, y, content, datetime.now()))
    conn.commit()
    marker_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    conn.close()
    return marker_id

def get_markers(comic_id):
    conn = get_connection()
    rows = conn.execute('SELECT * FROM page_markers WHERE comic_id = ?', (comic_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_marker(marker_id):
    conn = get_connection()
    conn.execute('DELETE FROM page_markers WHERE id = ?', (marker_id,))
    conn.commit()
    conn.close()

def update_marker_position(marker_id, x, y):
    conn = get_connection()
    conn.execute('UPDATE page_markers SET x = ?, y = ? WHERE id = ?', (x, y, marker_id))
    conn.commit()
    conn.close()

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def upsert_comic(file_path, title, fmt, size):
    conn = get_connection()
    c = conn.cursor()
    try:
        now = datetime.now()
        c.execute('''
            INSERT INTO comics (file_path, title, format, size_bytes, added_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(file_path) DO UPDATE SET
            size_bytes = excluded.size_bytes
        ''', (file_path, title, fmt, size, now))
        conn.commit()
        return c.lastrowid
    except Exception as e:
        print(f"Error upserting comic: {e}")
    finally:
        conn.close()

def update_progress(comic_id, page):
    conn = get_connection()
    c = conn.cursor()
    status = 'reading'
    now = datetime.now()
    c.execute('UPDATE comics SET current_page = ?, status = ?, last_read_at = ? WHERE id = ?', 
              (page, status, now, comic_id))
    conn.commit()
    conn.close()

def rename_comic(comic_id, new_title):
    conn = get_connection()
    conn.execute('UPDATE comics SET title = ? WHERE id = ?', (new_title, comic_id))
    conn.commit()
    conn.close()

def delete_comic(comic_id):
    conn = get_connection()
    conn.execute('DELETE FROM comics WHERE id = ?', (comic_id,))
    conn.commit()
    conn.close()

# --- Collection Helpers ---
def create_collection(name):
    conn = get_connection()
    try:
        conn.execute('INSERT INTO collections (name, created_at) VALUES (?, ?)', (name, datetime.now()))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def add_to_collection(collection_id, comic_id):
    conn = get_connection()
    try:
        conn.execute('INSERT OR IGNORE INTO collection_items (collection_id, comic_id, added_at) VALUES (?, ?, ?)', 
                     (collection_id, comic_id, datetime.now()))
        conn.commit()
    finally:
        conn.close()

def rename_collection(collection_id, name):
    conn = get_connection()
    try:
        conn.execute('UPDATE collections SET name = ? WHERE id = ?', (name, collection_id))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def delete_collection(collection_id):
    conn = get_connection()
    # Manual cascade because PRAGMA foreign_keys might be off
    conn.execute('DELETE FROM collection_items WHERE collection_id = ?', (collection_id,))
    conn.execute('DELETE FROM collections WHERE id = ?', (collection_id,))
    conn.commit()
    conn.close()

def get_collections_with_counts():
    conn = get_connection()
    rows = conn.execute('''
        SELECT c.*, COUNT(ci.comic_id) as count 
        FROM collections c 
        LEFT JOIN collection_items ci ON c.id = ci.collection_id 
        GROUP BY c.id
    ''').fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_collection_items(collection_id):
    conn = get_connection()
    rows = conn.execute('''
        SELECT c.* 
        FROM comics c 
        JOIN collection_items ci ON c.id = ci.comic_id 
        WHERE ci.collection_id = ?
        ORDER BY c.title
    ''', (collection_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- Page Action Helpers ---
def set_page_action(comic_id, page, is_fav=None, note=None):
    conn = get_connection()
    
    # Check existing
    curr = conn.execute('SELECT * FROM page_actions WHERE comic_id = ? AND page_number = ?', (comic_id, page)).fetchone()
    
    new_fav = is_fav if is_fav is not None else (curr['is_favorite'] if curr else 0)
    new_note = note if note is not None else (curr['note'] if curr else '')
    
    conn.execute('''
        INSERT INTO page_actions (comic_id, page_number, is_favorite, note, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(comic_id, page_number) DO UPDATE SET
        is_favorite = excluded.is_favorite,
        note = excluded.note,
        updated_at = excluded.updated_at
    ''', (comic_id, page, new_fav, new_note, datetime.now()))
    
    conn.commit()
    conn.close()

def get_page_actions(comic_id):
    conn = get_connection()
    rows = conn.execute('SELECT * FROM page_actions WHERE comic_id = ?', (comic_id,)).fetchall()
    conn.close()
    return {r['page_number']: dict(r) for r in rows}

if __name__ == '__main__':
    init_db()
