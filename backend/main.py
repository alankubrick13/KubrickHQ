from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import sqlite3
import os
import io

import database
import scanner
from reader import ComicReader

app = Flask(__name__)
CORS(app)

# In-memory cache for readers to avoid re-opening files constantly
# Key: comic_id, Value: ComicReader instance
READERS_CACHE = {}

def get_reader_instance(comic_id):
    comic_id = int(comic_id)
    if comic_id in READERS_CACHE:
        return READERS_CACHE[comic_id]
    
    conn = database.get_connection()
    row = conn.execute('SELECT file_path FROM comics WHERE id = ?', (comic_id,)).fetchone()
    conn.close()
    
    if not row:
        return None
        
    reader = ComicReader(row['file_path'])
    READERS_CACHE[comic_id] = reader
    return reader

@app.route('/api/library', methods=['GET'])
def list_library():
    conn = database.get_connection()
    rows = conn.execute('SELECT * FROM comics ORDER BY title ASC').fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/api/scan', methods=['POST'])
def scan_dir():
    data = request.json
    path = data.get('path')
    print(f"API Received scan request for path: {repr(path)}")
    
    if not path:
        return jsonify({'error': 'No path provided'}), 400
    
    # Remove quotes if they somehow got included
    path = path.strip('"\'')
    
    count = scanner.scan_directory(path)
    return jsonify({'added': count})

@app.route('/api/comic/<comic_id>', methods=['GET'])
def get_comic_meta(comic_id):
    conn = database.get_connection()
    row = conn.execute('SELECT * FROM comics WHERE id = ?', (comic_id,)).fetchone()
    
    if not row:
        conn.close()
        return jsonify({'error': 'Not found'}), 404
    
    data = dict(row)
    conn.close()

    # Lazy load page count if missing
    if data['page_count'] == 0:
        reader = get_reader_instance(comic_id)
        if reader:
            pc = reader.get_page_count()
            data['page_count'] = pc
            # Update DB
            c2 = database.get_connection()
            c2.execute('UPDATE comics SET page_count = ? WHERE id = ?', (pc, comic_id))
            c2.commit()
            c2.close()

    return jsonify(data)

@app.route('/api/comic/<comic_id>/page/<int:page_num>', methods=['GET'])
def get_page_image(comic_id, page_num):
    reader = get_reader_instance(comic_id)
    if not reader:
        return jsonify({'error': 'Reader error'}), 404
        
    image_bytes = reader.get_page_data(page_num)
    if image_bytes is None:
        return jsonify({'error': 'Page error'}), 404
    
    return send_file(io.BytesIO(image_bytes), mimetype='image/jpeg')

@app.route('/api/comic/<comic_id>/cover', methods=['GET'])
def get_cover(comic_id):
    # For now, just return page 0. In future, cache this.
    return get_page_image(comic_id, 0)

@app.route('/api/comic/<comic_id>/progress', methods=['POST'])
def update_progress(comic_id):
    data = request.json
    page = data.get('page', 0)
    database.update_progress(comic_id, page)
    return jsonify({'success': True})

@app.route('/api/comic/<comic_id>/rename', methods=['PUT'])
def rename_comic(comic_id):
    data = request.json
    new_title = data.get('title')
    if not new_title:
        return jsonify({'error': 'Title required'}), 400
    database.rename_comic(comic_id, new_title)
    return jsonify({'success': True})

@app.route('/api/comic/<comic_id>', methods=['DELETE'])
def delete_comic(comic_id):
    database.delete_comic(comic_id)
    return jsonify({'success': True})

@app.route('/api/collections', methods=['GET'])
def get_collections():
    return jsonify(database.get_collections_with_counts())

@app.route('/api/collections', methods=['POST'])
def create_collection():
    name = request.json.get('name')
    if not name: return jsonify({'error': 'Name required'}), 400
    success = database.create_collection(name)
    return jsonify({'success': success})

@app.route('/api/collections/<int:collection_id>', methods=['GET'])
def get_collection_items(collection_id):
    items = database.get_collection_items(collection_id)
    return jsonify(items)

@app.route('/api/collections/<int:collection_id>/add', methods=['POST'])
def add_to_collection(collection_id):
    comic_id = request.json.get('comic_id')
    database.add_to_collection(collection_id, comic_id)
    return jsonify({'success': True})

@app.route('/api/collections/<int:collection_id>/rename', methods=['PUT'])
def rename_collection(collection_id):
    name = request.json.get('name')
    if not name: return jsonify({'error': 'Name required'}), 400
    success = database.rename_collection(collection_id, name)
    if not success: return jsonify({'error': 'Name taken'}), 409
    return jsonify({'success': True})

@app.route('/api/collections/<int:collection_id>', methods=['DELETE'])
def delete_collection(collection_id):
    database.delete_collection(collection_id)
    return jsonify({'success': True})

@app.route('/api/comic/<comic_id>/actions', methods=['GET'])
def get_comic_actions(comic_id):
    return jsonify(database.get_page_actions(comic_id))

@app.route('/api/comic/<comic_id>/page/<int:page_num>/action', methods=['POST'])
def set_page_action(comic_id, page_num):
    data = request.json
    database.set_page_action(comic_id, page_num, data.get('is_favorite'), data.get('note'))
    return jsonify({'success': True})

# --- Markers API ---
@app.route('/api/comic/<comic_id>/markers', methods=['GET'])
def get_markers(comic_id):
    return jsonify(database.get_markers(comic_id))

@app.route('/api/comic/<comic_id>/markers', methods=['POST'])
def add_marker(comic_id):
    data = request.json
    marker_id = database.add_marker(
        comic_id, 
        data['page'], 
        data['x'], 
        data['y'], 
        data['content']
    )
    return jsonify({'id': marker_id, 'success': True})

@app.route('/api/markers/<int:marker_id>', methods=['DELETE'])
def delete_marker(marker_id):
    database.delete_marker(marker_id)
    return jsonify({'success': True})

@app.route('/api/markers/<int:marker_id>/position', methods=['PUT'])
def update_marker_position(marker_id):
    data = request.json
    database.update_marker_position(marker_id, data['x'], data['y'])
    return jsonify({'success': True})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        filename = file.filename
        # Ensure uploads directory exists
        upload_folder = os.path.join(os.getcwd(), 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        
        save_path = os.path.join(upload_folder, filename)
        print(f"Uploading file to: {save_path}")
        file.save(save_path)
        
        # Scan the uploaded file
        count = scanner.scan_directory(save_path)
        return jsonify({'success': True, 'added': count})

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    database.init_db()
    
    import sys
    is_frozen = getattr(sys, 'frozen', False)
    
    print(f"Starting KubrickHQ Backend on port 5000... (Frozen: {is_frozen})")
    app.run(host='127.0.0.1', port=5000, debug=not is_frozen, use_reloader=not is_frozen)
