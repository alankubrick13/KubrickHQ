import { useEffect, useState, useMemo, useRef } from 'react'
import { PlusCircle, RefreshCw, BookOpen, Search, SortAsc, Clock, Grid, Settings as SettingsIcon, Folder, FolderPlus, MoreVertical, X, Check } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'

const Library = ({ onOpen, onOpenSettings }) => {
    const { t } = useSettings()
    const [books, setBooks] = useState([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('recent') // 'recent' | 'alpha'
    const [isDragging, setIsDragging] = useState(false)

    // Collections State
    const [activeTab, setActiveTab] = useState('library') // 'library' | 'collections'
    const [collections, setCollections] = useState([])
    const [selectedCollection, setSelectedCollection] = useState(null)
    const [showAddToCollection, setShowAddToCollection] = useState(null) // comicId
    const [newCollectionName, setNewCollectionName] = useState('')

    // Context Menu & Rename
    const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, id: null, type: 'comic' })
    const [renameModal, setRenameModal] = useState({ show: false, id: null, currentTitle: '', type: 'comic' })
    const [collectionBooks, setCollectionBooks] = useState([])

    useEffect(() => {
        if (selectedCollection) {
            setLoading(true)
            fetch(`http://localhost:5000/api/collections/${selectedCollection.id}`)
                .then(res => res.json())
                .then(data => {
                    setCollectionBooks(data)
                    setLoading(false)
                })
                .catch(() => setLoading(false))
        } else {
            setCollectionBooks([])
        }
    }, [selectedCollection])

    const fetchCollections = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/collections')
            if (res.ok) setCollections(await res.json())
        } catch (e) {
            console.error(e)
        }
    }

    const createCollection = async () => {
        if (!newCollectionName.trim()) return
        try {
            await fetch('http://localhost:5000/api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCollectionName })
            })
            setNewCollectionName('')
            fetchCollections()
        } catch (e) {
            console.error(e)
        }
    }

    const addToCollection = async (collectionId, comicId) => {
        try {
            await fetch(`http://localhost:5000/api/collections/${collectionId}/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comic_id: comicId })
            })
            setShowAddToCollection(null)
            fetchCollections() // Refresh counts
        } catch (e) {
            console.error(e)
        }
    }

    const handleContextMenu = (e, id, type = 'comic') => {
        e.preventDefault()
        setContextMenu({
            show: true,
            x: e.clientX,
            y: e.clientY,
            id,
            type
        })
    }

    const renameItem = async () => {
        if (!renameModal.currentTitle.trim()) return
        try {
            if (renameModal.type === 'collection') {
                await fetch(`http://localhost:5000/api/collections/${renameModal.id}/rename`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: renameModal.currentTitle })
                })
                fetchCollections()
            } else {
                await fetch(`http://localhost:5000/api/comic/${renameModal.id}/rename`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: renameModal.currentTitle })
                })
                fetchLibrary()
            }
            setRenameModal({ ...renameModal, show: false })
        } catch (e) {
            console.error(e)
        }
    }

    const deleteItem = async () => {
        if (!contextMenu.id) return
        try {
            if (contextMenu.type === 'collection') {
                await fetch(`http://localhost:5000/api/collections/${contextMenu.id}`, { method: 'DELETE' })
                fetchCollections()
            } else {
                await fetch(`http://localhost:5000/api/comic/${contextMenu.id}`, { method: 'DELETE' })
                fetchLibrary()
            }
            setContextMenu({ ...contextMenu, show: false })
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        fetchLibrary()
        fetchCollections()

        const handleClick = () => setContextMenu({ ...contextMenu, show: false })
        window.addEventListener('click', handleClick)
        return () => window.removeEventListener('click', handleClick)
    }, [])

    const fetchLibrary = async () => {
        setLoading(true)
        try {
            const res = await fetch('http://localhost:5000/api/library')
            if (res.ok) {
                const data = await res.json()
                setBooks(data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const filteredBooks = useMemo(() => {
        const source = (activeTab === 'collections' && selectedCollection)
            ? collectionBooks
            : books

        let result = source.filter(b => b.title.toLowerCase().includes(searchTerm.toLowerCase()))

        if (sortBy === 'alpha') {
            result.sort((a, b) => a.title.localeCompare(b.title))
        } else {
            // Sort by last_read_at desc, then added_at desc
            result.sort((a, b) => {
                const dateA = a.last_read_at || a.added_at
                const dateB = b.last_read_at || b.added_at
                return new Date(dateB) - new Date(dateA)
            })
        }
        return result
    }, [books, collectionBooks, activeTab, selectedCollection, searchTerm, sortBy])



    const scan = async () => {
        try {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                const paths = await ipcRenderer.invoke('select-dirs');
                if (!paths || paths.length === 0) return;

                const path = paths[0];
                setLoading(true)
                try {
                    await fetch('http://localhost:5000/api/scan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path })
                    })
                    fetchLibrary()
                } catch (e) {
                    alert("Erro ao enviar pasta para escanear: " + e)
                } finally {
                    setLoading(false)
                }
            } else {
                const path = prompt("Digite o caminho completo da pasta para escanear:")
                if (!path) return
                setLoading(true)
                try {
                    await fetch('http://localhost:5000/api/scan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path })
                    })
                    fetchLibrary()
                } catch (e) {
                    alert("Erro ao escanear: " + e)
                } finally {
                    setLoading(false)
                }
            }
        } catch (e) {
            console.error("Erro ao abrir dialog:", e);
        }
    }

    const dragCounter = useRef(0)

    const handleDrop = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        dragCounter.current = 0

        const files = Array.from(e.dataTransfer.files)
        if (files.length === 0) return

        setLoading(true)
        let addedCount = 0

        for (const file of files) {
            // Check if we have a full path (Electron/Server-side context)
            if (file.path) { // Modified to trust file.path if present
                // Note: In some browsers file.path exists but is empty or just filename. 
                // Electron usually gives full absolute path.
                try {
                    await fetch('http://localhost:5000/api/scan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: file.path })
                    })
                    addedCount++
                } catch (err) {
                    console.error("Scan error:", err)
                }
            } else {
                // Fallback: Web Upload
                try {
                    const formData = new FormData()
                    formData.append('file', file)

                    const res = await fetch('http://localhost:5000/api/upload', {
                        method: 'POST',
                        body: formData
                    })
                    if (res.ok) addedCount++
                    else console.error("Upload failed", await res.text())
                } catch (err) {
                    console.error("Upload error:", err)
                }
            }
        }

        if (addedCount > 0) {
            await fetchLibrary()
        }
        setLoading(false)
    }

    const handleDragEnter = (e) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounter.current += 1
        if (e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
            setIsDragging(true)
        }
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounter.current -= 1
        if (dragCounter.current === 0) {
            setIsDragging(false)
        }
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation()
    }

    return (
        <div
            className={`flex flex-col h-full bg-gray-50 dark:bg-[#121212] overflow-hidden relative transition-colors duration-200 ${isDragging ? 'after:absolute after:inset-0 after:bg-primary/20 after:z-50 after:backdrop-blur-sm after:border-4 after:border-primary after:flex after:items-center after:justify-center after:content-["Drop_to_Add"] after:text-2xl after:font-bold after:text-white' : ''}`}
            onDrop={handleDrop}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            {/* Header / Toolbar */}
            <div className="flex flex-col gap-6 px-8 py-6 z-10 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md sticky top-0 shadow-sm border-b border-gray-200 dark:border-white/5 transition-colors duration-300">
                <div className="flex justify-between items-end">

                    <div>
                        <div className="flex items-baseline gap-6 mb-1">
                            <button
                                onClick={() => { setActiveTab('library'); setSelectedCollection(null); }}
                                className={`text-3xl font-bold tracking-tight transition-all ${activeTab === 'library' && !selectedCollection ? 'text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400' : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'}`}
                            >
                                {t.library}
                            </button>
                            <button
                                onClick={() => { setActiveTab('collections'); setSelectedCollection(null); }}
                                className={`text-3xl font-bold tracking-tight transition-all ${activeTab === 'collections' ? 'text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400' : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'}`}
                            >
                                {t.collections}
                            </button>
                        </div>
                        <p className="text-gray-500 text-sm font-medium">
                            {activeTab === 'library'
                                ? `${books.length} Comics • ${filteredBooks.length} Visible`
                                : selectedCollection
                                    ? `Collection: ${selectedCollection.name}`
                                    : `${collections.length} Collections`
                            }
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={onOpenSettings} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 dark:text-gray-400 transition" title={t.settings}>
                            <SettingsIcon size={20} />
                        </button>
                        <button onClick={scan} className="flex items-center gap-2 px-4 py-2 bg-primary text-white dark:text-black font-bold text-sm rounded-full hover:brightness-110 transition shadow-lg shadow-primary/20 transform hover:scale-105 active:scale-95 duration-200">
                            <PlusCircle size={18} />
                            <span>{t.addFolder}</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder={t.searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-200 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all placeholder:text-gray-500 dark:placeholder:text-gray-600"
                        />
                    </div>

                    <div className="flex bg-gray-100 dark:bg-[#1a1a1a] p-1 rounded-lg border border-gray-200 dark:border-gray-800 transition-colors">
                        <button
                            onClick={() => setSortBy('recent')}
                            className={`p-2 rounded-md transition-all ${sortBy === 'recent' ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                            title={t.recent}
                        >
                            <Clock size={18} />
                        </button>
                        <button
                            onClick={() => setSortBy('alpha')}
                            className={`p-2 rounded-md transition-all ${sortBy === 'alpha' ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                            title={t.az}
                        >
                            <SortAsc size={18} />
                        </button>
                    </div>

                    <button onClick={fetchLibrary} className="p-2.5 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Reload">
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 scroll-smooth">
                {activeTab === 'collections' && !selectedCollection ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {/* Create Collection Card */}
                        <div className="bg-gray-100 dark:bg-[#1a1a1a] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:border-primary transition-colors group">
                            <div className="p-3 bg-white dark:bg-black rounded-full shadow-sm text-primary group-hover:scale-110 transition-transform">
                                <FolderPlus size={32} />
                            </div>
                            <input
                                type="text"
                                placeholder={t.newCollectionName}
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && createCollection()}
                                className="w-full text-center bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-primary outline-none py-1 text-sm"
                            />
                            <button onClick={createCollection} className="text-xs font-bold text-primary hover:text-primary/80 uppercase tracking-widest">{t.create}</button>
                        </div>

                        {/* Collections List */}
                        {collections.map(col => (
                            <div
                                key={col.id}
                                onClick={() => setSelectedCollection(col)}
                                onContextMenu={(e) => handleContextMenu(e, col.id, 'collection')}
                                className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col items-center text-center gap-4 hover:shadow-xl hover:translate-y-[-2px] transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <Folder size={48} className="text-gray-300 dark:text-gray-700 group-hover:text-primary transition-colors" />
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{col.name}</h3>
                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-black px-2 py-1 rounded-full">{col.count || 0} {t.items}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    books.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-600 border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-2xl bg-gray-100 dark:bg-[#1a1a1a]/30">
                            <div className="bg-gray-200 dark:bg-gray-800/50 p-6 rounded-full mb-6">
                                <BookOpen size={48} className="opacity-70 text-gray-400" />
                            </div>
                            <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">{t.emptyTitle}</p>
                            <p className="text-sm mt-2 opacity-60 max-w-xs text-center">{t.emptyDesc}</p>
                            <button onClick={scan} className="mt-8 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition font-medium">
                                {t.browseFiles}
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-8 gap-y-10 pb-20">
                            {filteredBooks.map(book => (
                                <div
                                    key={book.id}
                                    onClick={() => onOpen(book.id)}
                                    onContextMenu={(e) => handleContextMenu(e, book.id, 'comic')}
                                    className="group cursor-pointer flex flex-col gap-3 relative"
                                >
                                    <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden shadow-2xl relative border border-gray-200 dark:border-white/5 group-hover:border-primary/50 transition-all duration-300 group-hover:transform group-hover:-translate-y-2 group-hover:shadow-primary/10">
                                        <img
                                            src={`http://localhost:5000/api/comic/${book.id}/cover`}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            loading="lazy"
                                            alt={book.title}
                                            onError={(e) => { e.target.style.display = 'none' }}
                                        />

                                        {/* Overlay Gradient */}
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />

                                        {/* Progress Bar */}
                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900/50 backdrop-blur-sm">
                                            <div
                                                className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)] transition-all duration-500"
                                                style={{ width: `${book.page_count ? (book.current_page / book.page_count) * 100 : 0}%` }}
                                            />
                                        </div>

                                        {/* Status Badge */}
                                        {(book.status === 'reading' || book.current_page > 0) && (
                                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-primary border border-primary/20">
                                                {Math.round((book.current_page / book.page_count) * 100)}%
                                            </div>
                                        )}

                                        {/* Format Badge */}
                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded text-[10px] uppercase font-mono text-gray-300 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {book.format}
                                        </div>
                                    </div>

                                    <div className="space-y-1 pr-6">
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-200 truncate group-hover:text-primary transition-colors leading-tight" title={book.title}>
                                            {book.title}
                                        </h3>
                                        <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
                                            <span>{book.page_count > 0 ? `${book.page_count} Pages` : 'Unknown'}</span>
                                            {book.last_read_at && <span>{t.recent}</span>}
                                        </div>
                                    </div>

                                    {/* Context Menu Button - Triggers same handling */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Mock event for positioning near button
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            handleContextMenu({
                                                preventDefault: () => { },
                                                clientX: rect.left,
                                                clientY: rect.bottom,
                                                target: e.target
                                            }, book.id, 'comic');
                                        }}
                                        className="absolute bottom-2 right-0 p-1.5 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-opacity opacity-0 group-hover:opacity-100"
                                    >
                                        <MoreVertical size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* Footer */}
                <div className="w-full flex justify-end mt-12 mb-6 px-4">
                    <p className="text-xs text-gray-400 dark:text-gray-600 font-medium opacity-50 hover:opacity-100 transition-opacity">
                        feito com muito &lt;3 na Amazônia por <span className="text-primary">@alankubrick13</span>
                    </p>
                </div>

                {/* Add To Collection Modal */}
                {showAddToCollection && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-2xl w-80 max-w-full border border-gray-200 dark:border-gray-800 animate-zoom-in">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg dark:text-white">{t.addToCollection}</h3>
                                <button onClick={() => setShowAddToCollection(null)}><X size={20} className="text-gray-500 hover:text-black dark:hover:text-white" /></button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {collections.map(col => (
                                    <button
                                        key={col.id}
                                        onClick={() => addToCollection(col.id, showAddToCollection)}
                                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between group transition-colors"
                                    >
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{col.name}</span>
                                        <PlusCircle size={16} className="text-gray-400 group-hover:text-primary" />
                                    </button>
                                ))}
                                {collections.length === 0 && <p className="text-center text-gray-500 text-sm py-4">No collections found.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Context Menu */}
                {contextMenu.show && (
                    <div
                        className="fixed z-50 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 w-48 animate-fade-in"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm flex items-center gap-2"
                            onClick={() => {
                                const title = contextMenu.type === 'collection'
                                    ? collections.find(c => c.id === contextMenu.id)?.name
                                    : books.find(b => b.id === contextMenu.id)?.title;
                                setRenameModal({
                                    show: true,
                                    id: contextMenu.id,
                                    currentTitle: title || '',
                                    type: contextMenu.type
                                });
                                setContextMenu({ ...contextMenu, show: false });
                            }}
                        >
                            <span className="text-gray-700 dark:text-gray-300">{t.rename}</span>
                        </button>

                        {contextMenu.type === 'comic' && (
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm flex items-center gap-2"
                                onClick={() => {
                                    setShowAddToCollection(contextMenu.id);
                                    setContextMenu({ ...contextMenu, show: false });
                                }}
                            >
                                <span className="text-gray-700 dark:text-gray-300">{t.addToCollection}</span>
                            </button>
                        )}

                        <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                        <button
                            className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm flex items-center gap-2 text-red-600 dark:text-red-400"
                            onClick={() => {
                                if (window.confirm(contextMenu.type === 'collection' ? "Delete this collection?" : t.deleteConfirm)) {
                                    deleteItem();
                                }
                            }}
                        >
                            <span className="font-medium">{t.delete}</span>
                        </button>
                    </div>
                )}

                {/* Rename Modal */}
                {renameModal.show && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-2xl w-96 border border-gray-200 dark:border-gray-800 animate-zoom-in">
                            <h3 className="font-bold text-lg dark:text-white mb-4">{renameModal.type === 'collection' ? t.rename : t.renameComic}</h3>
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-gray-100 dark:bg-[#222] border-0 rounded-lg p-3 text-black dark:text-white focus:ring-2 ring-primary mb-4"
                                value={renameModal.currentTitle}
                                onChange={(e) => setRenameModal({ ...renameModal, currentTitle: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && renameItem()}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setRenameModal({ ...renameModal, show: false })} className="px-4 py-2 text-sm text-gray-500 hover:text-black dark:hover:text-white">{t.cancel}</button>
                                <button onClick={renameItem} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90">{t.save}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
export default Library
