'use client';

import { useState } from 'react';
import {
  Upload,
  Search,
  TrendingUp,
  PieChart,
  Download,
  Activity,
  ChevronRight,
  Shield,
} from 'lucide-react';
import clsx from 'clsx';
import IngestTab from '@/components/tabs/IngestTab';
import QueryTab from '@/components/tabs/QueryTab';
import ScoreTab from '@/components/tabs/ScoreTab';
import SegmentsTab from '@/components/tabs/SegmentsTab';
import ExportTab from '@/components/tabs/ExportTab';
import StatusTab from '@/components/tabs/StatusTab';

type TabId = 'ingest' | 'query' | 'score' | 'segments' | 'export' | 'status';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'ingest',
    label: 'Ingest',
    icon: <Upload size={18} />,
    description: 'Upload and de-identify lead data',
  },
  {
    id: 'query',
    label: 'Query',
    icon: <Search size={18} />,
    description: 'Semantic similarity search',
  },
  {
    id: 'score',
    label: 'Score',
    icon: <TrendingUp size={18} />,
    description: 'Propensity scoring',
  },
  {
    id: 'segments',
    label: 'Segments',
    icon: <PieChart size={18} />,
    description: 'Audience clustering',
  },
  {
    id: 'export',
    label: 'Export',
    icon: <Download size={18} />,
    description: 'Token-only audience export',
  },
  {
    id: 'status',
    label: 'Status',
    icon: <Activity size={18} />,
    description: 'Index stats and tranche history',
  },
];

const TAB_TITLES: Record<TabId, { title: string; subtitle: string }> = {
  ingest: {
    title: 'Ingest Leads',
    subtitle: 'Upload a CSV file. De-identification happens in memory — no PII is ever written to disk.',
  },
  query: {
    title: 'Similarity Search',
    subtitle: 'Search de-identified profiles using natural language. Results contain no PII.',
  },
  score: {
    title: 'Propensity Score',
    subtitle: 'Score a new lead against your funded history. 20-neighbor KNN — no model training required.',
  },
  segments: {
    title: 'Segment Discovery',
    subtitle: 'K-means clustering over profile embeddings reveals natural audience groups.',
  },
  export: {
    title: 'Audience Export',
    subtitle: 'Export pseudonymous email and phone tokens for Facebook/Google matching. No PII.',
  },
  status: {
    title: 'System Status',
    subtitle: 'Chroma Cloud collection statistics and ingestion history.',
  },
};

function TabContent({ activeTab }: { activeTab: TabId }) {
  switch (activeTab) {
    case 'ingest':
      return <IngestTab />;
    case 'query':
      return <QueryTab />;
    case 'score':
      return <ScoreTab />;
    case 'segments':
      return <SegmentsTab />;
    case 'export':
      return <ExportTab />;
    case 'status':
      return <StatusTab />;
    default:
      return null;
  }
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>('ingest');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const currentTab = TAB_TITLES[activeTab];

  return (
    <div className="flex h-screen overflow-hidden bg-navy-950">
      {/* Sidebar */}
      <aside
        className={clsx(
          'flex flex-col border-r border-navy-700 bg-navy-900 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-navy-700 px-4 py-4 h-16">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-electric-500 font-bold text-white shadow-electric">
            MI
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">Mortgage Intelligence</div>
              <div className="truncate text-xs text-electric-400">Privacy-first lead intelligence</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all',
                    activeTab === item.id
                      ? 'bg-electric-500/20 text-electric-400 font-medium'
                      : 'text-gray-400 hover:bg-navy-800 hover:text-white'
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {sidebarOpen && (
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{item.label}</div>
                      <div className="truncate text-xs text-gray-500">{item.description}</div>
                    </div>
                  )}
                  {sidebarOpen && activeTab === item.id && (
                    <ChevronRight size={14} className="shrink-0 text-electric-400" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Privacy badge */}
        <div className="border-t border-navy-700 px-4 py-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-900/20 px-3 py-2">
              <Shield size={14} className="shrink-0 text-green-400" />
              <div>
                <div className="text-xs font-medium text-green-400">Zero PII Retained</div>
                <div className="text-xs text-gray-500">NIST De-ID Compliant</div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <Shield size={18} className="text-green-400" aria-label="Zero PII Retained" />
            </div>
          )}
        </div>

        {/* Toggle sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="border-t border-navy-700 px-4 py-3 text-xs text-gray-500 hover:text-gray-300 transition-colors text-left"
        >
          {sidebarOpen ? '← Collapse' : '→'}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-navy-700 bg-navy-900/50 px-6 backdrop-blur-sm">
          <div>
            <h1 className="text-lg font-semibold text-white">{currentTab.title}</h1>
            <p className="text-sm text-gray-400">{currentTab.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 border border-green-500/20">
              De-ID Active
            </span>
          </div>
        </header>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          <TabContent activeTab={activeTab} />
        </div>
      </main>
    </div>
  );
}
