'use client'

import { useState, useEffect, useCallback } from 'react'
import { DocumentArrowDownIcon, MagnifyingGlassIcon, PrinterIcon } from '@heroicons/react/24/outline'

import Layout from '../Layout'
import {
    escapeHtml,
    openPrintableReport,
    peso,
    photoCellHtml,
    printColorStyles,
} from '@/lib/print-report'
import ItemAvatar from '@/components/ui-components/item.avatar'
import Alert from '@/components/ui-components/alert'
import { useAlert } from '@/components/ui-components/useAlert'
import { trpcClient } from '@/trpc/client'

interface InventoryItem {
    id: number
    i_deviceID: string
    i_model: string
    i_category: string
    i_brand: string
    i_description: string
    i_type: string
    item_rawstock: number
    i_status: number
    i_mr: string
    i_price: number
    i_photo: string
    no_of_items?: number | null
    remarks?: string | null
}

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<string>('new')
    const [searchTerm, setSearchTerm] = useState('')
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    })
    const { alert, showSuccess, showError, hideAlert } = useAlert()

    const fetchInventoryItems = useCallback(async () => {
        try {
            setLoading(true)
            const data = await trpcClient.items.list.query({
                page: pagination.page,
                limit: pagination.limit,
                search: searchTerm
            })

            if (data.success) {
                setInventoryItems(data.data)
                setPagination(prev => ({
                    ...prev,
                    total: data.pagination.total,
                    totalPages: data.pagination.totalPages
                }))
            }
        } catch (error) {
            console.error('Error fetching inventory items:', error)
        } finally {
            setLoading(false)
        }
    }, [pagination.page, pagination.limit, searchTerm])

    useEffect(() => {
        fetchInventoryItems()
    }, [fetchInventoryItems])

    const tabs = [
        { key: 'new', label: 'New', color: 'bg-blue-500 text-white', status: null },
        { key: 'old', label: 'Old', color: 'bg-blue-500 text-white', status: null },
        { key: 'available', label: 'Available', color: 'bg-blue-500 text-white', status: 1 },
        { key: 'borrowed', label: 'Borrowed', color: 'bg-blue-500 text-white', status: 2 },
        { key: 'maintenance', label: 'Maintenance', color: 'bg-blue-500 text-white', status: 3 },
        { key: 'damaged', label: 'Damaged', color: 'bg-blue-500 text-white', status: 4 },
        { key: 'total', label: 'Total Items', color: 'bg-blue-500 text-white', status: null }
    ]

    const getStatusLabel = (status: number) => {
        switch (status) {
            case 1: return 'Available'
            case 2: return 'Borrowed'
            case 3: return 'Maintenance'
            case 4: return 'Damaged'
            default: return 'Unknown'
        }
    }

    // Helper function to determine if an item is "new" or "old"
    const isNewItem = (item: InventoryItem) => {
        // Items added in the last 6 months or with higher IDs are considered "new"
        // This is a simple heuristic - in a real system you might use actual timestamps
        const maxId = Math.max(...inventoryItems.map(i => i.id))
        const threshold = maxId * 0.7 // Consider top 30% of IDs as "new"
        return item.id > threshold
    }

    const filteredItems = inventoryItems.filter(item => {
        const currentTab = tabs.find(tab => tab.key === activeTab)

        let statusMatch = true

        if (activeTab === 'new') {
            statusMatch = isNewItem(item)
        } else if (activeTab === 'old') {
            statusMatch = !isNewItem(item)
        } else if (activeTab === 'total') {
            statusMatch = true
        } else {
            statusMatch = item.i_status === currentTab?.status
        }

        const searchMatch = !searchTerm || (
            item.i_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.i_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.i_brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.i_description.toLowerCase().includes(searchTerm.toLowerCase())
        )

        return statusMatch && searchMatch
    })

    const activeTabLabel = tabs.find(tab => tab.key === activeTab)?.label ?? 'Inventory'

    const totalStock = filteredItems.reduce((sum, item) => sum + (item.item_rawstock || 0), 0)
    const totalValue = filteredItems.reduce(
        (sum, item) => sum + (Number(item.i_price) || 0) * (item.item_rawstock || 0),
        0
    )

    /**
     * Both buttons print the rows currently in the table — that is, the active category tab and
     * the search term applied to it. PDF is the same document at a tighter size; the browser's
     * print dialog is where "Save as PDF" lives.
     */
    const buildReportHtml = (compact: boolean) => {
        const cellPadding = compact ? '6px' : '8px'
        const fontSize = compact ? '10px' : '12px'
        const photoSize = compact ? 36 : 44

        const rows = filteredItems
            .map(
                item => `
                <tr>
                    <td class="photo">${photoCellHtml(item.i_photo, item.i_brand, item.i_model, photoSize)}</td>
                    <td>${escapeHtml(item.i_deviceID)}</td>
                    <td>${escapeHtml(item.i_model)}</td>
                    <td>${escapeHtml(item.i_category)}</td>
                    <td>${escapeHtml(item.i_brand)}</td>
                    <td>${escapeHtml(item.item_rawstock)}</td>
                    <td>${escapeHtml(getStatusLabel(item.i_status))}</td>
                    <td>${escapeHtml(peso(Number(item.i_price) || 0))}</td>
                </tr>`
            )
            .join('')

        const emptyRow = `
                <tr>
                    <td colspan="8" style="text-align: center; color: #666;">No items in this category.</td>
                </tr>`

        return `
            <html>
                <head>
                    <title>Inventory Report - ${escapeHtml(activeTabLabel)} - ${new Date().toLocaleDateString()}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; ${printColorStyles} }
                        h1 { color: #333; text-align: center; margin-bottom: 4px; }
                        h2 { color: #555; text-align: center; font-size: 14px; font-weight: normal; margin-top: 0; }
                        .meta { font-size: ${fontSize}; color: #444; margin-bottom: 12px; }
                        .meta span { margin-right: 16px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: ${fontSize}; }
                        th { background-color: #f8f9fa; border: 1px solid #ddd; padding: ${cellPadding}; font-weight: bold; text-align: left; }
                        td { border: 1px solid #ddd; padding: ${cellPadding}; }
                        td.photo { width: ${photoSize + 8}px; padding: 4px; }
                        tr { page-break-inside: avoid; }
                        @media print {
                            body { margin: 10px; }
                            thead { display: table-header-group; }
                        }
                    </style>
                </head>
                <body>
                    <h1>Inventory Report</h1>
                    <h2>Category: ${escapeHtml(activeTabLabel)}</h2>
                    <div class="meta">
                        <span><strong>Generated:</strong> ${new Date().toLocaleString()}</span>
                        <span><strong>Records:</strong> ${filteredItems.length}</span>
                        <span><strong>Total Stock:</strong> ${totalStock}</span>
                        <span><strong>Total Value:</strong> ${peso(totalValue)}</span>
                        ${searchTerm ? `<span><strong>Search:</strong> ${escapeHtml(searchTerm)}</span>` : ''}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Photo</th>
                                <th>Device ID</th>
                                <th>Model</th>
                                <th>Category</th>
                                <th>Brand</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th>Price</th>
                            </tr>
                        </thead>
                        <tbody>${rows || emptyRow}</tbody>
                    </table>
                </body>
            </html>`
    }

    const openReport = (compact: boolean, successText: string) => {
        if (filteredItems.length === 0) {
            showError(`There are no ${activeTabLabel} items to export.`, 'Nothing to export')
            return
        }

        openPrintableReport({
            html: buildReportHtml(compact),
            onBlocked: () =>
                showError('Please allow pop-ups for this site and try again.', 'Blocked by the browser'),
            onReady: () => showSuccess(successText, 'Success'),
            onError: (error) => {
                console.error('Error building inventory report:', error)
                showError('Failed to build the report', 'Something went wrong')
            },
        })
    }

    const handleExportPDF = () =>
        openReport(true, `${activeTabLabel} report is ready — choose "Save as PDF" in the print dialog`)

    const handlePrint = () => openReport(false, `${activeTabLabel} report sent to the print dialog`)

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Inventory</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Manage and track your equipment inventory
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? tab.color : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Export Buttons — both act on the rows shown for the selected category */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExportPDF}
                        className="inline-flex items-center px-4 py-2 bg-red-500 text-white text-sm rounded hover:opacity-90 transition-opacity"
                    >
                        <DocumentArrowDownIcon className="mr-1.5 h-4 w-4" />
                        PDF
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm rounded hover:opacity-90 transition-opacity"
                    >
                        <PrinterIcon className="mr-1.5 h-4 w-4" />
                        Print
                    </button>
                    <span className="text-sm text-gray-500">
                        {activeTabLabel}: {filteredItems.length} {filteredItems.length === 1 ? 'record' : 'records'}
                    </span>

                    {/* Search sits on the same row, pushed to the right edge */}
                    <div className="relative w-full sm:ml-auto sm:w-96 lg:w-md">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by model, category, brand or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full rounded-md border border-gray-300 py-3 pl-10 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">Loading inventory...</span>
                        </div>
                    ) : (
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Device ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Model
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Brand
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Stock
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Price
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                                            {searchTerm ? 'No items found matching your search.' : 'No items found.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.i_deviceID}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex items-center gap-3">
                                                    <ItemAvatar
                                                        photo={item.i_photo}
                                                        brand={item.i_brand}
                                                        alt={item.i_model}
                                                        className="h-10 w-10 shrink-0"
                                                        textClassName="text-sm"
                                                    />
                                                    {item.i_model}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.i_category}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.i_brand}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.item_rawstock}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item.i_status === 1 ? 'bg-green-100 text-green-800' :
                                                    item.i_status === 2 ? 'bg-yellow-100 text-yellow-800' :
                                                        item.i_status === 3 ? 'bg-blue-100 text-blue-800' :
                                                            item.i_status === 4 ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {getStatusLabel(item.i_status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                ₱{item.i_price?.toLocaleString() || '0.00'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={pagination.page === 1}
                            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-sm bg-blue-500 text-white rounded">
                            {pagination.page}
                        </span>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                            disabled={pagination.page === pagination.totalPages}
                            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>

                <Alert
                    type={alert.type}
                    title={alert.title}
                    message={alert.message}
                    isVisible={alert.isVisible}
                    onClose={hideAlert}
                />
            </div>
        </Layout>
    )
}
