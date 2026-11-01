import Activity from 'lucide-solid/icons/activity'
import ArrowLeft from 'lucide-solid/icons/arrow-left'
import Check from 'lucide-solid/icons/check'
import ChevronRight from 'lucide-solid/icons/chevron-right'
import ChevronsUpDown from 'lucide-solid/icons/chevrons-up-down'
import CircleQuestionMark from 'lucide-solid/icons/circle-question-mark'
import Folder from 'lucide-solid/icons/folder'
import House from 'lucide-solid/icons/house'
import KeyRound from 'lucide-solid/icons/key-round'
import List from 'lucide-solid/icons/list'
import LogOut from 'lucide-solid/icons/log-out'
import Menu from 'lucide-solid/icons/menu'
import Monitor from 'lucide-solid/icons/monitor'
import Moon from 'lucide-solid/icons/moon'
import Plus from 'lucide-solid/icons/plus'
import Search from 'lucide-solid/icons/search'
import Shield from 'lucide-solid/icons/shield'
import SlidersHorizontal from 'lucide-solid/icons/sliders-horizontal'
import Smartphone from 'lucide-solid/icons/smartphone'
import Sun from 'lucide-solid/icons/sun'
import User from 'lucide-solid/icons/user'
import Users from 'lucide-solid/icons/users'
import X from 'lucide-solid/icons/x'

/**
 * The icons the template uses, by the name an app asks for (ADR 0027). Each is imported from its own
 * file so a bundle carries only these. A new icon is one line here, named for what it means.
 */
export const icons = {
  activity: Activity,
  back: ArrowLeft,
  check: Check,
  close: X,
  expand: ChevronsUpDown,
  folder: Folder,
  help: CircleQuestionMark,
  home: House,
  key: KeyRound,
  list: List,
  menu: Menu,
  monitor: Monitor,
  moon: Moon,
  next: ChevronRight,
  phone: Smartphone,
  plus: Plus,
  preferences: SlidersHorizontal,
  profile: User,
  search: Search,
  security: Shield,
  'sign-out': LogOut,
  sun: Sun,
  users: Users
} as const

export type IconName = keyof typeof icons
