import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Overview from './pages/Overview';
import Fundamentals from './pages/Fundamentals';
import ProtocolExplorer from './pages/ProtocolExplorer';
import HttpLab from './pages/HttpLab';
import DnsLab from './pages/DnsLab';
import DhcpLab from './pages/DhcpLab';
import EmailLab from './pages/EmailLab';
import ApiLab from './pages/ApiLab';
import Troubleshooting from './pages/Troubleshooting';
import KnowledgeCheck from './pages/KnowledgeCheck';
import Summary from './pages/Summary';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="fundamentals" element={<Fundamentals />} />
        <Route path="protocols" element={<ProtocolExplorer />} />
        <Route path="http" element={<HttpLab />} />
        <Route path="dns" element={<DnsLab />} />
        <Route path="dhcp" element={<DhcpLab />} />
        <Route path="email" element={<EmailLab />} />
        <Route path="api-lab" element={<ApiLab />} />
        <Route path="troubleshooting" element={<Troubleshooting />} />
        <Route path="knowledge-check" element={<KnowledgeCheck />} />
        <Route path="summary" element={<Summary />} />
        {/* Short aliases: the paths people type from memory or a bookmark. */}
        <Route path="quiz" element={<Navigate to="/knowledge-check" replace />} />
        <Route path="api" element={<Navigate to="/api-lab" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
