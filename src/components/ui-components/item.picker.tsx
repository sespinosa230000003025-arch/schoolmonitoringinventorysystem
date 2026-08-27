'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

import ItemAvatar from './item.avatar'

/** The item fields the picker reads. `items.list` returns all of them. */
export interface PickableItem {
    id: number
    i_model: string
    i_deviceID: string
    i_brand?: string | null
    i_category?: string | null
    i_photo?: string | null
    item_rawstock?: number
}

interface ItemPickerProps {
    items: PickableItem[]
    /** Selected item id, kept as a string so it drops straight into form state. */
    value: string
    onChange: (itemId: string) => void
    /** Shown under the field after a submit was attempted with nothing picked. */
    error?: string
}

/**
 * Photo-first replacement for the "Select Item" dropdown: borrowers who do not know an
 * item by its model name can recognise it by its picture instead.
 */
export default function ItemPicker({ items, value, onChange, error }: ItemPickerProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    const selected = items.find((item) => String(item.id) === value)

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return items

        return items.filter((item) =>
            [item.i_model, item.i_deviceID, item.i_brand, item.i_category]
                .filter(Boolean)
                .some((field) => String(field).toLowerCase().includes(query))
        )
    }, [items, search])

    // Close when clicking anywhere outside the field.
    useEffect(() => {
        if (!open) return

        const handleClickOutside = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
        }
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false)
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [open])

    const handlePick = (item: PickableItem) => {
        onChange(String(item.id))
        setSearch('')
        setOpen(false)
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`mt-1 flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${error ? 'border-red-400' : 'border-gray-300'
                    }`}
            >
                {selected ? (
                    <>
                        <ItemAvatar
                            photo={selected.i_photo}
                            brand={selected.i_brand}
                            alt={selected.i_model}
                            className="h-10 w-10 shrink-0"
                            textClassName="text-sm"
                        />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-gray-900">
                                {selected.i_model}
                            </span>
                            <span className="block truncate text-xs text-gray-500">
                                {selected.i_deviceID}
                                {selected.item_rawstock !== undefined && ` · Stock: ${selected.item_rawstock}`}
                            </span>
                        </span>
                    </>
                ) : (
                    <span className="flex-1 py-1 text-sm text-gray-500">
                        Choose an item... (tap to browse photos)
                    </span>
                )}
                <ChevronDownIcon className="h-5 w-5 shrink-0 text-gray-400" />
            </button>

            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

            {open && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                    <div className="border-b border-gray-200 p-2">
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                autoFocus
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name, brand, category or device ID..."
                                className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="max-h-[min(44rem,70vh)] overflow-y-auto p-2">
                        {filtered.length === 0 ? (
                            <p className="py-8 text-center text-sm text-gray-500">No items match your search.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {filtered.map((item) => {
                                    const isSelected = String(item.id) === value
                                    const outOfStock = item.item_rawstock === 0

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handlePick(item)}
                                            disabled={outOfStock}
                                            title={`${item.i_model} - ${item.i_deviceID}`}
                                            className={`rounded-md border p-2 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-white ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                                }`}
                                        >
                                            <div className="relative">
                                                <ItemAvatar
                                                    photo={item.i_photo}
                                                    brand={item.i_brand}
                                                    alt={item.i_model}
                                                    className="h-40 w-full"
                                                    textClassName="text-4xl"
                                                />
                                                {isSelected && (
                                                    <span className="absolute right-1 top-1 rounded-full bg-blue-600 p-1">
                                                        <CheckIcon className="h-3 w-3 text-white" />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-2 truncate text-sm font-medium text-gray-900">
                                                {item.i_model}
                                            </p>
                                            <p className="truncate text-xs text-gray-500">{item.i_deviceID}</p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {outOfStock ? (
                                                    <span className="font-medium text-red-600">Out of stock</span>
                                                ) : (
                                                    `Stock: ${item.item_rawstock ?? 0}`
                                                )}
                                            </p>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
