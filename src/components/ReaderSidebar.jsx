import { memo, useEffect, useRef } from 'react'
import { Star, MessageSquare } from 'lucide-react'

// Separate the list to prevent re-rendering it when the parent container width changes
const SidebarList = memo(({ meta, comicId, currentPage, onPageSelect, pageActions, filterStyle }) => {
    const itemRefs = useRef([])

    // Scroll active item into view
    useEffect(() => {
        if (itemRefs.current[currentPage]) {
            itemRefs.current[currentPage].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            })
        }
    }, [currentPage])

    if (!meta) return null

    return (
        <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
            {Array.from({ length: meta.page_count }).map((_, i) => (
                <div
                    key={i}
                    ref={el => itemRefs.current[i] = el}
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
})

const ReaderSidebar = ({ show, meta, comicId, currentPage, onPageSelect, pageActions, t, filterStyle }) => {
    return (
        <div
            className={`bg-white dark:bg-[#121212] border-r border-gray-200 dark:border-[#1a1a1a] flex flex-col transition-all duration-300 ease-in-out ${show ? 'w-48 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}`}
        >
            <div className="p-4 border-b border-gray-200 dark:border-[#1a1a1a] flex justify-between items-center whitespace-nowrap overflow-hidden">
                <span className="text-gray-900 dark:text-white font-medium text-sm">{t.pages}</span>
                <span className="text-gray-500 text-xs">{meta?.page_count || 0} {t.total}</span>
            </div>

            {/* 
               We render the list regardless of 'show' to ensure it's in DOM for sliding,
               but SidebarList is memoized so it won't re-render items when 'show' toggles 
               (because 'show' is not a prop to SidebarList).
            */}
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

export default memo(ReaderSidebar)
