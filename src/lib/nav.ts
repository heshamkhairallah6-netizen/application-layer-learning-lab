export type NavItem = {
  id: string;
  path: string;
  label: string;
  index: string;
  short: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV: NavSection[] = [
  {
    title: 'Orientation',
    items: [{ id: 'overview', path: '/', label: 'Overview', index: '00', short: 'Lab overview' }],
  },
  {
    title: 'Foundations',
    items: [
      { id: 'fundamentals', path: '/fundamentals', label: 'Application Layer Fundamentals', index: '01', short: 'Fundamentals' },
      { id: 'protocols', path: '/protocols', label: 'Protocol Explorer', index: '02', short: 'Protocol Explorer' },
    ],
  },
  {
    title: 'Laboratories',
    items: [
      { id: 'http', path: '/http', label: 'HTTP / HTTPS Laboratory', index: '03', short: 'HTTP / HTTPS Lab' },
      { id: 'dns', path: '/dns', label: 'DNS Laboratory', index: '04', short: 'DNS Lab' },
      { id: 'dhcp', path: '/dhcp', label: 'DHCP Laboratory', index: '05', short: 'DHCP Lab' },
      { id: 'email', path: '/email', label: 'Email Protocol Laboratory', index: '06', short: 'Email Lab' },
      { id: 'api', path: '/api-lab', label: 'API Communication Laboratory', index: '07', short: 'API Lab' },
    ],
  },
  {
    title: 'Practice',
    items: [
      { id: 'troubleshooting', path: '/troubleshooting', label: 'Practical Troubleshooting', index: '08', short: 'Troubleshooting' },
      { id: 'quiz', path: '/knowledge-check', label: 'Knowledge Check', index: '09', short: 'Knowledge Check' },
    ],
  },
  {
    title: 'Wrap-up',
    items: [{ id: 'summary', path: '/summary', label: 'Learning Summary', index: '10', short: 'Summary' }],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV.flatMap((section) => section.items);

export function findNavByPath(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => item.path === pathname);
}
