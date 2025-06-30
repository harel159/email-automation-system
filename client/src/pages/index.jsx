import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard.jsx";

import Template from "./Template.jsx";

import History from "./History.jsx";

import Settings from "./Settings.jsx";

import EmailManager from "./EmailManager";

import ManualEmail from "./ManualEmail.jsx";

import Login from './Login';

import RequireAuth from '@/component/auth/RequireAuth';

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Template: Template,
    
    History: History,
    
    Settings: Settings,
    
    EmailManager: EmailManager,
    
    ManualEmail: ManualEmail,

    Login: Login,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
  const location = useLocation();
  const currentPage = _getCurrentPage(location.pathname);

  return (
    <Layout currentPageName={currentPage}>
      <Routes>
        {/* Redirect / to /Login */}
        <Route path="/" element={<Login />} />

        {/* Login page – unprotected */}
        <Route path="/Login" element={<Login />} />

        {/* Protected Routes */}
        <Route path="/Dashboard" element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        } />

        <Route path="/Template" element={
          <RequireAuth>
            <Template />
          </RequireAuth>
        } />

        <Route path="/History" element={
          <RequireAuth>
            <History />
          </RequireAuth>
        } />

        <Route path="/Settings" element={
          <RequireAuth>
            <Settings />
          </RequireAuth>
        } />

        <Route path="/EmailManager" element={
          <RequireAuth>
            <EmailManager />
          </RequireAuth>
        } />

        <Route path="/ManualEmail" element={
          <RequireAuth>
            <ManualEmail />
          </RequireAuth>
        } />
      </Routes>
    </Layout>
  );
}


export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}