'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminAsidecomponent() {
    const pathname = usePathname()

    const navigationItems = [
        {
            href: '/admin/dashboard',
            label: 'Dashboard',
            icon: '📊'
        },
        {
            href: '/admin/users',
            label: 'Users',
            icon: '👥'
        },
        {
            href: '/admin/items',
            label: 'Items',
            icon: '📦'
        },
        {
            href: '/admin/inventory',
            label: 'Inventory',
            icon: '📋'
        },
        {
            href: '/admin/borrowing',
            label: 'Transactions',
            icon: '📋'
        },
        {
            href: '/admin/returned-items',
            label: 'Returned Items',
            icon: '✅'
        },
        {
            href: '/admin/rooms',
            label: 'Room',
            icon: '🏢'
        },
        {
            href: '/admin/borrowers',
            label: 'Borrowers',
            icon: '👨‍🎓'
        },
        {
            href: '/admin/reports',
            label: 'Reports',
            icon: '📈'
        }
    ]

    return (
        <aside className="w-64 min-h-screen bg-white shadow-md flex flex-col">
            <div className="p-6 border-b border-gray-200">
                <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
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
