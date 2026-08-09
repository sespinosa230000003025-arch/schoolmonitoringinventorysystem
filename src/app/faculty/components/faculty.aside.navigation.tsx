'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function FacultyAsideNavigation() {
    const pathname = usePathname()

    const navigationItems = [
        {
            href: '/faculty/dashboard',
            label: 'Dashboard',
            icon: '📊'
        },
        {
            href: '/faculty/transaction',
            label: 'Transaction',
            icon: '💳'
        },
        {
            href: '/faculty/borrowed-items',
            label: 'Borrowed Items',
            icon: '📤'
        },
        {
            href: '/faculty/returned-items',
            label: 'Returned Items',
            icon: '✅'
        }
    ]

    return (
        <aside className="w-64 min-h-screen bg-white shadow-md flex flex-col">
            <div className="p-6 border-b border-gray-200">
                <h1 className="text-xl font-bold text-gray-800">SPMS</h1>
            </div>

            <nav className="mt-6 flex-1">
                <ul className="space-y-2 px-4">
                    {navigationItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive
                                        ? 'bg-blue-100 text-blue-700 border-r-4 border-blue-700'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    <span className="mr-3 text-lg">{item.icon}</span>
                                    {item.label}
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>
        </aside>
    )
}
