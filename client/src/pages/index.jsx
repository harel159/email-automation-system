import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard.jsx";

import Template from "./Template.jsx";

import History from "./History.jsx";

import Settings from "./Settings.jsx";

import EmailManager from "./EmailManager";

import ManualEmail from "./ManualEmail.jsx";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Template: Template,
    
    History: History,
    
    Settings: Settings,
    
    EmailManager: EmailManager,
    
    ManualEmail: ManualEmail,
    
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
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Template" element={<Template />} />
                
                <Route path="/History" element={<History />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/EmailManager" element={<EmailManager />} />
                
                <Route path="/ManualEmail" element={<ManualEmail />} />
                
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