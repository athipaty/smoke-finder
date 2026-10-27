import { NavLink } from 'react-router-dom'
import { useI18n } from '../i18n/index.jsx'

const icon = {
  check: <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zm-3-11 2 2 4-4" />,
  map: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14" />,
  rules: <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7" />,
}

const TABS = [
  { to: '/', label: 'tab.check', icon: icon.check, end: true },
  { to: '/map', label: 'tab.nearby', icon: icon.map },
  { to: '/rules', label: 'tab.rules', icon: icon.rules },
]

export default function TabBar() {
  const { t } = useI18n()
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-stone-800 dark:bg-stone-900/95"
    >
      <ul className="mx-auto flex max-w-lg">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                  isActive ? 'text-go dark:text-go-dark' : 'text-stone-500 dark:text-stone-400'
                }`
              }
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {tab.icon}
              </svg>
              {t(tab.label)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
