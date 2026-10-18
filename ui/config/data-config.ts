import { MenuItem, ProfileMenuItems } from '@/utils/types';
import {
  Bot,
  CalendarDays,
  ChartLine,
  FolderGit2,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Palette,
  RefreshCcw,
  Sparkles,
  User,
  UserCircle,
  UserCog,
  Users,
  UsersRound,
  Wrench,
} from 'lucide-react';

/**
 * Sidebar. `access` = scope page: the item shows when the user has `<access>_view`
 * (Super_Admin sees everything). Scopes are given to roles on the Roles screen.
 */
export const menuItems: MenuItem[] = [
  {
    icon: UserCircle,
    label: 'My Dashboard',
    path: '/developer-dashboard',
    access: 'mydashboard',
  },
  {
    icon: LayoutDashboard,
    label: 'Team Dashboard',
    path: '/dashboard',
    access: 'teamdashboard',
  },
  {
    icon: FolderGit2,
    label: 'Projects',
    path: '/projects',
    access: 'projectdashboard',
  },
  {
    icon: Sparkles,
    label: 'AI Insights',
    path: '/ai-insights',
    access: 'aiinsights',
  },
  {
    icon: ChartLine,
    label: 'Reports',
    path: '/daily-report',
    access: 'report',
    subPaths: ['/daily-report', '/developer-report', '/project-report', '/tools-report', '/ai-report'],
  },
  {
    icon: Users,
    label: 'Users',
    path: '/user',
    access: 'user',
    subPaths: ['/user-creation'],
  },
  {
    icon: UsersRound,
    label: 'Teams',
    path: '/teams',
    access: 'team',
  },
  {
    icon: UserCog,
    label: 'Roles',
    path: '/role',
    access: 'role',
  },
  {
    icon: KeyRound,
    label: 'WakaTime Tokens',
    path: '/wakatime-tokens',
    access: 'token',
  },
  {
    icon: RefreshCcw,
    label: 'Data Sync',
    path: '/data-sync',
    access: 'sync',
  },
];

/** Top menu for the reports (each has Excel / CSV / PDF export on its table). */
export const reportTabs: MenuItem[] = [
  {
    icon: CalendarDays,
    label: 'Daily Report',
    path: '/daily-report',
  },
  {
    icon: Users,
    label: 'Developer Summary',
    path: '/developer-report',
  },
  {
    icon: FolderGit2,
    label: 'Projects & Branches',
    path: '/project-report',
  },
  {
    icon: Wrench,
    label: 'Languages & Tools',
    path: '/tools-report',
  },
  {
    icon: Bot,
    label: 'AI Usage',
    path: '/ai-report',
  },
];

export const profileMenuData: ProfileMenuItems[] = [
  {
    icon: User,
    label: 'Personal Information',
    path: '/personal-information',
    navigation: true,
  },
  {
    icon: Lock,
    label: 'Login & Password',
    path: '/change-password',
    navigation: true,
  },
  {
    icon: Palette,
    label: 'Appearance',
    path: '/appearance',
    navigation: true,
  },
  {
    icon: LogOut,
    label: 'Log Out',
    path: '/logout',
    navigation: false,
  },
];

export const alertMsgDescription = {
  noChangesMade: 'No changes made',
};
