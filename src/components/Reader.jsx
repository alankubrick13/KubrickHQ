import { useEffect, useState, useRef, useCallback, memo } from 'react'
import { ArrowLeft, ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight, FileText, BookOpen, Columns, Move, Search, PanelLeft, Sliders, Eye, EyeOff, Star, MessageSquare, Save, X } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'

// Standard Side Components (No memo for stability)
const SidebarList = ({ meta, comicId, currentPage, onPageSelect, pageActions, filterStyle }) => {
    // Refs disabled temporarily
    // const itemRefs = useRef([])

    /*
    useEffect(() => {
        if (itemRefs.current[currentPage]) {
            itemRefs.current[currentPage].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            })
        }
    }, [currentPage])
    */

    if (!meta) return null

    return (
        <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
            {Array.from({ length: meta.page_count }).map((_, i) => (
                <div
                    key={i}
                    // ref={el => itemRefs.current[i] = el}
                    onClick={() => onPageSelect(i)}
                    className={`cursor-pointer rounded-lg overflow-hidden border-2 transition relative group ${currentPage === i ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                >
                    <img
                        src={`http://localhost:5000/api/comic/${comicId}/page/${i}`}
                        className="w-full h-auto object-cover"
                        style={filterStyle}
                        loading="lazy"
                        alt={`Thumb ${i + 1}`}
                    />
                    <div className="absolute top-1 right-1 flex gap-1">
                        {pageActions[i]?.is_favorite && <div className="bg-yellow-400 text-black p-0.5 rounded-full"><Star size={8} fill="currentColor" /></div>}
                        {pageActions[i]?.note && <div className="bg-blue-500 text-white p-0.5 rounded-full"><MessageSquare size={8} fill="currentColor" /></div>}
                    </div>
                    <div className={`absolute bottom-0 right-0 bg-white/90 dark:bg-black/70 text-black dark:text-white text-[10px] px-1.5 py-0.5 rounded-tl ${currentPage === i ? 'bg-primary text-white font-bold' : ''}`}>
                        {i + 1}
                    </div>
                </div>
            ))}
        </div>
    )
}

const ReaderSidebar = ({ show, meta, comicId, currentPage, onPageSelect, pageActions, t, filterStyle }) => {
    return (
        <div
            className={`bg-white dark:bg-[#121212] border-r border-gray-200 dark:border-[#1a1a1a] flex flex-col transition-all duration-300 ease-in-out ${show ? 'w-48 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}`}
        >
            <div className="p-4 border-b border-gray-200 dark:border-[#1a1a1a] flex justify-between items-center whitespace-nowrap overflow-hidden">
                <span className="text-gray-900 dark:text-white font-medium text-sm">{t?.pages || 'Pages'}</span>
                <span className="text-gray-500 text-xs">{meta?.page_count || 0} {t?.total || 'total'}</span>
            </div>

            <SidebarList
                meta={meta}
                comicId={comicId}
                currentPage={currentPage}
                onPageSelect={onPageSelect}
                pageActions={pageActions}
                filterStyle={filterStyle}
            />
        </div>
    )
}

const Reader = ({ comicId, onBack }) => {
    const { t, imageSettings, setImageSettings, defaultViewMode } = useSettings()
    const [meta, setMeta] = useState(null)
    const [zoom, setZoom] = useState(100)
    const [currentPage, setCurrentPage] = useState(0)
    const [viewMode, setViewMode] = useState(defaultViewMode || 'single')
    const scrollContainerRef = useRef(null)

    // Page Actions (Favorites & Notes)
    const [pageActions, setPageActions] = useState({})
    const [showNoteModal, setShowNoteModal] = useState(false)
    const [noteText, setNoteText] = useState('')


    // Sidebar
    const [showSidebar, setShowSidebar] = useState(false)

    // Tools
    const [isMagnifier, setIsMagnifier] = useState(false)
    const [loupe, setLoupe] = useState({ show: false, x: 0, y: 0, relX: 0, relY: 0, w: 0, h: 0, src: '' })
    const [showImageControls, setShowImageControls] = useState(false)

    // Pan state
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const dragStartRef = useRef({ x: 0, y: 0 })

    // Reset states
    useEffect(() => {
        setPan({ x: 0, y: 0 })
        setLoupe(l => ({ ...l, show: false }))
    }, [currentPage, viewMode])

    // Toggle Magnifier
    const toggleMagnifier = () => {
        setIsMagnifier(!isMagnifier)
        setIsDragging(false)
        setLoupe(l => ({ ...l, show: false }))
    }

    // Fetch Metadata
    useEffect(() => {
        fetch(`http://localhost:5000/api/comic/${comicId}`)
            .then(res => res.json())
            .then(data => {
                setMeta(data)
                setCurrentPage(data.current_page || 0)
            })

        fetch(`http://localhost:5000/api/comic/${comicId}/actions`)
            .then(res => res.json())
            .then(setPageActions)
    }, [comicId])

    // Update Progress
    const updateProgress = useCallback((page) => {
        if (!meta) return
        fetch(`http://localhost:5000/api/comic/${comicId}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page })
        })
    }, [comicId, meta])

    // Page Actions Logic
    const toggleFavorite = async () => {
        const isFav = !pageActions[currentPage]?.is_favorite
        const newActions = {
            ...pageActions,
            [currentPage]: { ...pageActions[currentPage], is_favorite: isFav }
        }
        setPageActions(newActions)

        await fetch(`http://localhost:5000/api/comic/${comicId}/page/${currentPage}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_favorite: isFav })
        })
    }

    const openNoteModal = () => {
        setNoteText(pageActions[currentPage]?.note || '')
        setShowNoteModal(true)
    }

    const saveNote = async () => {
        const newActions = {
            ...pageActions,
            [currentPage]: { ...pageActions[currentPage], note: noteText }
        }
        setPageActions(newActions)
        setShowNoteModal(false)

        await fetch(`http://localhost:5000/api/comic/${comicId}/page/${currentPage}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: noteText })
        })
    }

    // Navigation Logic
    const setPage = useCallback((newPage) => {
        if (!meta) return
        let target = Math.max(0, Math.min(newPage, meta.page_count - 1))

        if (viewMode === 'double' && target > 0) {
            if (target % 2 === 0) target = target - 1;
        }

        setCurrentPage(target)
        updateProgress(target)
    }, [meta, viewMode, updateProgress])

    const nextPage = () => {
        if (viewMode === 'double') {
            if (currentPage === 0) setPage(1)
            else setPage(currentPage + 2)
        } else {
            setPage(currentPage + 1)
        }
    }

    const prevPage = () => {
        if (viewMode === 'double') {
            if (currentPage <= 1) setPage(0)
            else setPage(currentPage - 2)
        } else {
            setPage(currentPage - 1)
        }
    }

    // Double View Helpers
    const getDoublePages = () => {
        if (currentPage === 0) return [0]
        const start = currentPage % 2 === 0 ? currentPage - 1 : currentPage;
        const pages = [start];
        if (start + 1 < meta.page_count) pages.push(start + 1);
        return pages;
    }

    // Keyboard navigation
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') onBack()
            if (e.key === '=' || e.key === '+') setZoom(z => Math.min(z + 10, 300))
            if (e.key === '-') setZoom(z => Math.max(z - 10, 20))

            if (viewMode !== 'vertical') {
                if (e.key === 'ArrowRight') nextPage()
                if (e.key === 'ArrowLeft') prevPage()
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [onBack, currentPage, meta, viewMode])

    // Drag Logic
    const handleMouseDown = (e) => {
        if (isMagnifier || zoom <= 100) return
        e.preventDefault()
        setIsDragging(true)
        dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    }

    const handleMouseMove = (e) => {
        if (!isDragging) return
        e.preventDefault()
        setPan({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y
        })
    }

    const handleMouseUp = () => setIsDragging(false)

    // Loupe Logic
    const handleLoupeMove = (e) => {
        if (!isMagnifier) return
        const img = e.currentTarget
        const rect = img.getBoundingClientRect()

        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        setLoupe({
            show: true,
            x: e.clientX,
            y: e.clientY,
            relX: x,
            relY: y,
            w: rect.width,
            h: rect.height,
            src: img.src
        })
    }

    const handleLoupeLeave = () => {
        setLoupe(l => ({ ...l, show: false }))
    }

    // Vertical Scroll Observer
    const isScrollingToPage = useRef(false)

    // Restore scroll position when switching to Vertical Mode
    useEffect(() => {
        if (viewMode === 'vertical' && meta) {
            isScrollingToPage.current = true
            // Use setTimeout to ensure DOM render cycle is complete
            setTimeout(() => {
                const el = document.querySelector(`[data-page="${currentPage}"]`)
                if (el) {
                    el.scrollIntoView({ block: 'start' })
                }
                // Release lock after scroll
                setTimeout(() => { isScrollingToPage.current = false }, 600)
            }, 50)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, meta]) // Intentionally omit currentPage to run only on viewMode switch

    useEffect(() => {
        if (viewMode !== 'vertical' || !meta) return
        const observer = new IntersectionObserver((entries) => {
            if (isScrollingToPage.current) return

            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const page = parseInt(entry.target.dataset.page)
                    setCurrentPage(page)
                    updateProgress(page)
                }
            })
        }, { threshold: 0.1, rootMargin: '100px' })

        // Target the WRAPPER divs, which always exist
        const elements = document.querySelectorAll('.vertical-page-wrapper')
        if (elements.length > 0) {
            elements.forEach(el => observer.observe(el))
        } else {
            // Fallback just in case
            document.querySelectorAll('.comic-page-vertical').forEach(el => observer.observe(el))
        }

        return () => observer.disconnect()
    }, [meta, viewMode, updateProgress]);

    // Filter Style
    /*
    const filterStyle = useMemo(() => {
        const b = imageSettings.brightness ?? 100
        const c = imageSettings.contrast ?? 100
        const s = imageSettings.saturation ?? 100

        let f = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`

        if (imageSettings.sharpen && imageSettings.sharpen > 0) f += ` url(#sharpen)`
        if (imageSettings.denoise && imageSettings.denoise > 0) {
            const px = (imageSettings.denoise / 100) * 2;
            f += ` blur(${px}px)`
        }
        return { filter: f }
    }, [imageSettings])
    */
    // Revert to simple version for debugging
    const getFilterString = () => {
        const b = imageSettings.brightness ?? 100
        const c = imageSettings.contrast ?? 100
        const s = imageSettings.saturation ?? 100

        let f = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`

        if (imageSettings.sharpen && imageSettings.sharpen > 0) f += ` url(#sharpen)`
        if (imageSettings.denoise && imageSettings.denoise > 0) {
            const px = (imageSettings.denoise / 100) * 2;
            f += ` blur(${px}px)`
        }
        return f
    }
    const filterStyle = { filter: getFilterString() }

    if (!meta) return <div className="flex justify-center items-center h-full text-white">Loading...</div>

    return (
        <div className="flex h-full bg-gray-50 dark:bg-[#050505] overflow-hidden transition-colors duration-300">

            {/* Sidebar */}
            <ReaderSidebar
                show={showSidebar}
                meta={meta}
                comicId={comicId}
                currentPage={currentPage}
                onPageSelect={setPage}
                pageActions={pageActions}
                t={t}
                filterStyle={filterStyle}
            />

            {/* Main Content Area */}
            <div
                className={`flex-1 flex flex-col relative animate-fade-in no-drag group overflow-hidden select-none ${isMagnifier ? 'cursor-none' : ''}`}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Loupe Overlay */}
                {isMagnifier && loupe.show && (
                    <div
                        style={{
                            position: 'fixed',
                            left: loupe.x - 100, // Center 200px box
                            top: loupe.y - 100,
                            width: '200px',
                            height: '200px',
                            border: '2px solid rgba(255,255,255,0.8)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            pointerEvents: 'none',
                            zIndex: 9999,
                            backgroundImage: `url(${loupe.src})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: `${loupe.w * 2}px ${loupe.h * 2}px`,
                            backgroundPosition: `-${loupe.relX * 2 - 100}px -${loupe.relY * 2 - 100}px`,
                            backgroundColor: '#1a1a1a',
                            borderRadius: '12px',
                            filter: filterStyle.filter
                        }}
                    />
                )}

                {/* Floating Header */}
                <div className={`absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-white/90 to-transparent dark:from-black/90 dark:to-transparent z-50 flex items-center justify-between px-6 transition-opacity duration-300 ${isDragging ? 'opacity-0' : 'opacity-0 hover:opacity-100'}`}>
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-black dark:text-white transition">
                            <ArrowLeft size={24} />
                        </button>

                        <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            className={`p-2 rounded-full transition ${showSidebar ? 'bg-black/10 dark:bg-white/20 text-black dark:text-white' : 'hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'}`}
                            title="Toggle Sidebar"
                        >
                            <PanelLeft size={20} />
                        </button>

                        <div className="h-6 w-px bg-black/10 dark:bg-white/20 mx-2"></div>

                        <div>
                            <h2 className="text-black dark:text-white font-medium truncate max-w-md shadow-sm dark:shadow-black dark:drop-shadow-md">{meta.title}</h2>
                            <p className="text-gray-600 dark:text-gray-300 text-xs shadow-sm dark:shadow-black dark:drop-shadow-md">
                                {viewMode === 'double' && currentPage > 0
                                    ? `${t?.pages || 'Pages'} ${currentPage}-${currentPage + 1} / ${meta.page_count}`
                                    : `${t?.page || 'Page'} ${currentPage + 1} / ${meta.page_count}`
                                }
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white/60 dark:bg-black/60 backdrop-blur rounded-full px-3 py-1 border border-black/10 dark:border-white/10 shadow-sm relative">
                        {/* Actions: Favorite & Note */}
                        <button
                            onClick={toggleFavorite}
                            className={`p-2 rounded-full transition ${pageActions[currentPage]?.is_favorite ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400 hover:text-yellow-500'}`}
                            title="Favorite Page"
                        >
                            <Star size={18} fill={pageActions[currentPage]?.is_favorite ? "currentColor" : "none"} />
                        </button>

                        <button
                            onClick={openNoteModal}
                            className={`p-2 rounded-full transition ${pageActions[currentPage]?.note ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400 hover:text-blue-500'}`}
                            title="Page Notes"
                        >
                            <MessageSquare size={18} fill={pageActions[currentPage]?.note ? "currentColor" : "none"} />
                        </button>

                        <div className="w-px h-4 bg-gray-400 dark:bg-gray-600 mx-1"></div>
                        <button onClick={() => setViewMode('vertical')} className={`p-2 rounded-full transition ${viewMode === 'vertical' ? 'bg-primary text-white dark:text-black' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`} title={t?.reader?.vertical}>
                            <FileText size={18} />
                        </button>
                        <button onClick={() => setViewMode('single')} className={`p-2 rounded-full transition ${viewMode === 'single' ? 'bg-primary text-white dark:text-black' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`} title={t?.reader?.single}>
                            <BookOpen size={18} />
                        </button>
                        <button onClick={() => setViewMode('double')} className={`p-2 rounded-full transition ${viewMode === 'double' ? 'bg-primary text-white dark:text-black' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`} title={t?.reader?.double}>
                            <Columns size={18} />
                        </button>

                        <div className="w-px h-4 bg-gray-400 dark:bg-gray-600 mx-1"></div>

                        <button
                            onClick={() => setImageSettings(s => ({ ...s, blueLight: !s.blueLight }))}
                            className={`p-2 rounded-full transition ${imageSettings.blueLight ? 'bg-orange-500/20 text-orange-500' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
                            title={t?.blueLightFilter}
                        >
                            {imageSettings.blueLight ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>

                        <button
                            onClick={toggleMagnifier}
                            className={`p-2 rounded-full transition ${isMagnifier ? 'bg-secondary text-black' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
                            title={t?.reader?.magnifier}
                        >
                            <Search size={18} />
                        </button>

                        <button
                            onClick={() => setShowImageControls(!showImageControls)}
                            className={`p-2 rounded-full transition ${showImageControls ? 'bg-secondary text-black' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
                            title={t?.imageAdjustments}
                        >
                            <Sliders size={18} />
                        </button>

                        <div className="w-px h-4 bg-gray-400 dark:bg-gray-600 mx-1"></div>

                        <button onClick={() => setZoom(z => Math.max(z - 10, 20))} className="p-2 hover:text-black dark:hover:text-white text-gray-500 dark:text-gray-400" title={t?.reader?.zoomOut}><ZoomOut size={18} /></button>
                        <span className="text-xs font-mono w-10 text-center text-gray-700 dark:text-gray-300">{zoom}%</span>
                        <button onClick={() => setZoom(z => Math.min(z + 10, 300))} className="p-2 hover:text-black dark:hover:text-white text-gray-500 dark:text-gray-400" title={t?.reader?.zoomIn}><ZoomIn size={18} /></button>

                        {/* Image Controls Popup */}
                        {showImageControls && (
                            <div className="absolute top-14 right-0 w-72 bg-white dark:bg-[#1a1a1a] shadow-xl border border-gray-200 dark:border-gray-800 rounded-xl p-4 z-50 animate-fade-in flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
                                <div>
                                    <div className="flex justify-between text-xs mb-1 text-gray-500">
                                        <span>{t?.brightness}</span>
                                        <span>{imageSettings.brightness}%</span>
                                    </div>
                                    <input type="range" min="50" max="150" value={imageSettings.brightness} onChange={(e) => setImageSettings({ ...imageSettings, brightness: e.target.value })} className="w-full accent-primary h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1 text-gray-500">
                                        <span>{t?.contrast}</span>
                                        <span>{imageSettings.contrast}%</span>
                                    </div>
                                    <input type="range" min="50" max="150" value={imageSettings.contrast} onChange={(e) => setImageSettings({ ...imageSettings, contrast: e.target.value })} className="w-full accent-primary h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1 text-gray-500">
                                        <span>{t?.saturation}</span>
                                        <span>{imageSettings.saturation}%</span>
                                    </div>
                                    <input type="range" min="0" max="200" value={imageSettings.saturation} onChange={(e) => setImageSettings({ ...imageSettings, saturation: e.target.value })} className="w-full accent-primary h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                </div>

                                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1 text-gray-500">
                                        <span>{t?.sharpen}</span>
                                        <span>{imageSettings.sharpen || 0}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={imageSettings.sharpen || 0}
                                        onChange={(e) => setImageSettings({ ...imageSettings, sharpen: parseInt(e.target.value) })}
                                        className="w-full accent-primary h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1 text-gray-500">
                                        <span>{t?.denoise}</span>
                                        <span>{imageSettings.denoise || 0}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={imageSettings.denoise || 0}
                                        onChange={(e) => setImageSettings({ ...imageSettings, denoise: parseInt(e.target.value) })}
                                        className="w-full accent-primary h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* NOTE MODAL */}
                {showNoteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-2xl w-96 max-w-full border border-gray-200 dark:border-gray-800 animate-zoom-in">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-black dark:text-white">Page Note</h3>
                                <button onClick={() => setShowNoteModal(false)} className="text-gray-500 hover:text-black dark:hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                className="w-full h-32 bg-gray-100 dark:bg-[#222] border-0 rounded-lg p-3 text-black dark:text-white focus:ring-2 ring-primary mb-4 resize-none"
                                placeholder="Write your thoughts..."
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-black dark:hover:text-white">Cancel</button>
                                <button onClick={saveNote} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2">
                                    <Save size={16} /> Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Single & Double Handler */}
                {viewMode !== 'vertical' && (
                    <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-gray-100 dark:bg-[#050505] cursor-default transition-colors duration-300">
                        {/* Arrows */}
                        {!isDragging && !isMagnifier && zoom <= 100 && (
                            <>
                                <div className="absolute inset-y-0 left-0 w-1/6 z-10 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={prevPage} title="Previous"></div>
                                <div className="absolute inset-y-0 right-0 w-1/6 z-10 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={nextPage} title="Next"></div>
                            </>
                        )}

                        <div
                            className={`relative transition-transform duration-75 ease-linear flex gap-0 shadow-2xl ${zoom > 100 && !isMagnifier ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            style={{
                                transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
                                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                            }}
                            onMouseDown={handleMouseDown}
                        >
                            {viewMode === 'single' || (viewMode === 'double' && currentPage === 0) ? (
                                <div className="relative">
                                    <img
                                        key={currentPage}
                                        src={`http://localhost:5000/api/comic/${comicId}/page/${currentPage}`}
                                        className={`max-h-[95vh] max-w-full object-contain select-none shadow-2xl ${isMagnifier ? 'cursor-none' : ''}`}
                                        style={filterStyle}
                                        onMouseMove={handleLoupeMove}
                                        onMouseLeave={handleLoupeLeave}
                                        alt={`Page ${currentPage + 1}`}
                                    />

                                </div>
                            ) : (
                                // Double View
                                <div className="flex shadow-2xl gap-1 bg-[#1a1a1a]">
                                    {getDoublePages().map(pg => (
                                        <div key={pg} className="relative">
                                            <img
                                                src={`http://localhost:5000/api/comic/${comicId}/page/${pg}`}
                                                className={`max-h-[95vh] max-w-full object-contain select-none ${isMagnifier ? 'cursor-none' : ''}`}
                                                style={filterStyle}
                                                onMouseMove={handleLoupeMove}
                                                onMouseLeave={handleLoupeLeave}
                                                alt={`Page ${pg + 1}`}
                                            />

                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); prevPage() }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/50 dark:bg-black/50 text-black dark:text-white rounded-full hover:bg-primary hover:text-black transition z-20 opacity-0 group-hover:opacity-100 disabled:opacity-0"
                            disabled={currentPage === 0}
                        >
                            <ChevronLeft size={32} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); nextPage() }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/50 dark:bg-black/50 text-black dark:text-white rounded-full hover:bg-primary hover:text-black transition z-20 opacity-0 group-hover:opacity-100 disabled:opacity-0"
                            disabled={currentPage >= meta.page_count - 1}
                        >
                            <ChevronRight size={32} />
                        </button>
                    </div>
                )}

                {/* Vertical Scroll Mode */}
                {viewMode === 'vertical' && (
                    <div className="flex-1 w-full h-full overflow-y-auto scroll-smooth bg-gray-100 dark:bg-[#121212] transition-colors duration-300" ref={scrollContainerRef}>
                        <div className="flex flex-col items-center gap-8 py-20 min-h-full">
                            {Array.from({ length: meta.page_count }).map((_, i) => (
                                <div
                                    key={i}
                                    data-page={i}
                                    className="vertical-page-wrapper relative flex justify-center w-full min-h-[50vh]"
                                >
                                    {Math.abs(currentPage - i) < 5 ? (
                                        <div className="relative" style={{ width: `${zoom}%`, maxWidth: 'none' }}>
                                            <img
                                                className={`comic-page-vertical shadow-2xl select-none mx-auto block ${isMagnifier ? 'cursor-none' : ''}`}
                                                src={`http://localhost:5000/api/comic/${comicId}/page/${i}`}
                                                style={{ ...filterStyle, width: '100%', height: 'auto' }}
                                                loading="lazy"
                                                onMouseMove={handleLoupeMove}
                                                onMouseLeave={handleLoupeLeave}
                                                alt={`Page ${i + 1}`}
                                            />

                                            {/* Page Number Badge */}
                                            <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                {i + 1}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="w-[90%] max-w-2xl h-[80vh] bg-gray-200 dark:bg-gray-800/50 rounded-lg animate-pulse flex items-center justify-center">
                                            <span className="text-gray-400 font-medium">Page {i + 1}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div className="h-32 text-gray-500 text-sm flex items-center">End of Comic</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
export default Reader
