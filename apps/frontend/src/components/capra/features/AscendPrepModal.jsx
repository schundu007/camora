import { useState, useEffect, useRef } from 'react';
import InputPanel from '../prep/InputPanel';
import OutputPanel from '../prep/OutputPanel';
const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
import { useIsMobile } from '../../../hooks/capra/useIsMobile';
import { getAuthHeaders } from '../../../utils/authHeaders.js';


// Helper to cache diagram images as base64 to avoid expiration issues
const cacheDiagramImages = async (content) => {
  if (!content || typeof content !== 'object') return content;
  
  // Deep clone to avoid mutation
  const cloned = JSON.parse(JSON.stringify(content));
  
  // Find questions array in content (system design has this structure)
  const questions = cloned.questions || [];
  
  for (const q of questions) {
    if (q.diagramUrl && !q.diagramBase64) {
      try {
        const response = await fetch(q.diagramUrl);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          const base64 = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          q.diagramBase64 = base64;
          console.log('[DiagramCache] Cached diagram for:', q.title);
        }
      } catch (err) {
        console.warn('[DiagramCache] Failed to cache diagram:', err.message);
      }
    }
  }
  
  return cloned;
};

// Section definitions with unique icons and colors
const ALL_SECTIONS = [
  { id: 'pitch', name: 'Elevator Pitch', description: '2-3 minute interview pitch', icon: 'rocket', color: '#f59e0b' },
  { id: 'hr', name: 'HR Questions', description: 'Salary, culture, availability', icon: 'users', color: '#ec4899' },
  { id: 'hiring-manager', name: 'Hiring Manager', description: 'Role-specific questions', icon: 'briefcase', color: '#10b981' },
  { id: 'rrk', name: 'RRK (Google)', description: 'Role Related Knowledge round', companyFilter: 'google', icon: 'academic', color: '#4285f4' },
  { id: 'coding', name: 'Coding', description: 'Algorithm & coding challenges', icon: 'code', color: '#10b981' },
  { id: 'system-design', name: 'System Design', description: 'Architecture questions', icon: 'cube', color: '#3b82f6' },
  { id: 'behavioral', name: 'Behavioral', description: 'STAR method questions', icon: 'chat', color: '#f97316' },
  { id: 'techstack', name: 'Tech Stack', description: 'Technology-specific questions', icon: 'stack', color: '#06b6d4' },
];

// Section icon components
const SectionIcons = {
  rocket: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
  users: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  briefcase: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  academic: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M12 14l9-5-9-5-9 5 9 5z" />
      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
    </svg>
  ),
  code: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  cube: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  chat: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  stack: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
};

// Filter sections based on company name (e.g., RRK only for Google)
function getFilteredSections(companyName) {
  if (!companyName) return ALL_SECTIONS.filter(s => !s.companyFilter);
  const companyLower = companyName.toLowerCase();
  return ALL_SECTIONS.filter(s => !s.companyFilter || companyLower.includes(s.companyFilter));
}

const EMPTY_INPUTS = {
  jobDescription: '',
  resume: '',
  coverLetter: '',
  prepMaterials: '',
  documentation: [], // Array of {name, content} for uploaded documents
};

const EMPTY_GENERATED = {
  pitch: null,
  hr: null,
  'hiring-manager': null,
  rrk: null,
  coding: null,
  'system-design': null,
  behavioral: null,
  techstack: null,
};

// Empty custom sections (user-created from documents)
const EMPTY_CUSTOM_SECTIONS = [];
// Format: [{ id: 'custom-1', name: 'My Custom Section', documentName: 'doc.pdf', documentIndex: 0 }]


// getAuthHeaders is now imported from utils/authHeaders.js

// Clean up generated content - remove double spaces, extra spaces, empty lines
function cleanupContent(content) {
  if (!content) return content;

  if (typeof content === 'string') {
    return content
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  if (typeof content === 'object' && content !== null) {
    const cleaned = Array.isArray(content) ? [] : {};
    for (const [key, value] of Object.entries(content)) {
      if (typeof value === 'string') {
        cleaned[key] = value
          .replace(/[ \t]+/g, ' ')
          .replace(/\n\s*\n\s*\n/g, '\n\n')
          .replace(/^\s+|\s+$/gm, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = cleanupContent(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  return content;
}

// Load company data from localStorage
function loadCompanyData() {
  const stored = localStorage.getItem('interviewPrepCompanies');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse company data:', e);
    }
  }

  // Check for legacy data and migrate
  const legacyInputs = localStorage.getItem('interviewPrepInputs');
  const legacyGenerated = localStorage.getItem('interviewPrepGenerated');

  if (legacyInputs || legacyGenerated) {
    // Migrate legacy data to new format with "Default" company
    const migratedData = {
      companies: ['Untitled Company'],
      activeCompany: 'Untitled Company',
      data: {
        'Untitled Company': {
          inputs: legacyInputs ? JSON.parse(legacyInputs) : { ...EMPTY_INPUTS },
          generated: legacyGenerated ? JSON.parse(legacyGenerated) : { ...EMPTY_GENERATED },
        },
      },
    };

    // Save migrated data and clean up legacy
    localStorage.setItem('interviewPrepCompanies', JSON.stringify(migratedData));
    localStorage.removeItem('interviewPrepInputs');
    localStorage.removeItem('interviewPrepGenerated');

    return migratedData;
  }

  // Return default structure
  return {
    companies: [],
    activeCompany: null,
    data: {},
  };
}

// Save company data to localStorage
function saveCompanyData(companyData) {
  localStorage.setItem('interviewPrepCompanies', JSON.stringify(companyData));
}

// Get auth token for cloud sync (reads SSO cookie)
async function getAuthToken() {
  const match = document.cookie.match(/(^| )cariara_sso=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : null;
}

// Check if user is authenticated for cloud sync (async version)
async function checkAuthenticated() {
  const token = await getAuthToken();
  return !!token;
}

// Load company data from cloud API
async function loadCloudData() {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(API_URL + '/api/company-preps', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('[CloudSync] Failed to load cloud data:', response.status);
      return null;
    }

    const { preps } = await response.json();
    
    // Convert API format to local format
    const companies = preps.map(p => p.company_name);
    const activeCompany = companies.length > 0 ? companies[0] : null;
    const data = {};
    
    for (const prep of preps) {
      data[prep.company_name] = {
        cloudId: prep.id,
        inputs: typeof prep.inputs === 'string' ? JSON.parse(prep.inputs) : prep.inputs || {},
        generated: typeof prep.generated === 'string' ? JSON.parse(prep.generated) : prep.generated || {},
        customSections: typeof prep.custom_sections === 'string' ? JSON.parse(prep.custom_sections) : prep.custom_sections || [],
      };
    }

    console.log('[CloudSync] Loaded', preps.length, 'companies from cloud');
    return { companies, activeCompany, data };
  } catch (error) {
    console.error('[CloudSync] Error loading cloud data:', error);
    return null;
  }
}

// Create company in cloud
async function createCloudCompany(companyName) {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(API_URL + '/api/company-preps', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ company_name: companyName }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.warn('[CloudSync] Failed to create company:', error);
      return { error };
    }

    const { prep } = await response.json();
    console.log('[CloudSync] Created company in cloud:', companyName);
    return { success: true, id: prep.id };
  } catch (error) {
    console.error('[CloudSync] Error creating company:', error);
    return { error: error.message };
  }
}

// Update company in cloud
async function updateCloudCompany(cloudId, data) {
  const token = await getAuthToken();
  if (!token || !cloudId) return false;

  try {
    const response = await fetch(API_URL + '/api/company-preps/' + cloudId, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: data.inputs,
        generated: data.generated,
        custom_sections: data.customSections,
      }),
    });

    if (!response.ok) {
      console.warn('[CloudSync] Failed to update company:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[CloudSync] Error updating company:', error);
    return false;
  }
}

// Delete company from cloud
async function deleteCloudCompany(cloudId) {
  const token = await getAuthToken();
  if (!token || !cloudId) return false;

  try {
    const response = await fetch(API_URL + '/api/company-preps/' + cloudId, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('[CloudSync] Error deleting company:', error);
    return false;
  }
}

// Rename company in cloud
async function renameCloudCompany(cloudId, newName) {
  const token = await getAuthToken();
  if (!token || !cloudId) return false;

  try {
    const response = await fetch(API_URL + '/api/company-preps/' + cloudId, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ company_name: newName }),
    });

    if (!response.ok) {
      console.warn('[CloudSync] Failed to rename company:', response.status);
      return false;
    }

    console.log('[CloudSync] Renamed company to:', newName);
    return true;
  } catch (error) {
    console.error('[CloudSync] Error renaming company:', error);
    return false;
  }
}

export default function AscendPrepModal({ isOpen, onClose, provider, model, isDedicatedWindow = false, embedded = false }) {
  const { isMobile } = useIsMobile();
  const [prepSidebarOpen, setPrepSidebarOpen] = useState(false);
  const [activeTabRaw, setActiveTabRaw] = useState('input');
  const setActiveTab = (tab) => {
    setActiveTabRaw(tab);
    if (isMobile) setPrepSidebarOpen(false);
  };
  const activeTab = activeTabRaw;
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [inputs, setInputs] = useState({ ...EMPTY_INPUTS });
  const [generated, setGenerated] = useState({ ...EMPTY_GENERATED });
  const [customSections, setCustomSections] = useState([]); // User-created sections from documents
  const [isLoadingCompany, setIsLoadingCompany] = useState(false); // Prevent auto-save during company switch
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingSection, setGeneratingSection] = useState(null);
  const [generatingSections, setGeneratingSections] = useState(new Set()); // For parallel generation
  const [streamingContent, setStreamingContent] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [showNewCompanyInput, setShowNewCompanyInput] = useState(false);
  const [editingCompanyName, setEditingCompanyName] = useState(false);
  const [showJDPopup, setShowJDPopup] = useState(false);
  const [jdPopupPos, setJdPopupPos] = useState({ x: 0, y: 0 });
  const [isDraggingJD, setIsDraggingJD] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [accountLinked, setAccountLinked] = useState(false);
  const [linkingAccount, setLinkingAccount] = useState(false);
  const dropdownRef = useRef(null);
  const newCompanyInputRef = useRef(null);

  const isElectron = false; // Electron removed in unified frontend

  // Get filtered sections based on active company (e.g., RRK only for Google)
  const sections = getFilteredSections(activeCompany);

  // Load company data on mount (cloud sync for authenticated webapp users)
  useEffect(() => {
    if (isOpen || embedded) {
      setIsLoadingCompany(true);

      const loadData = async () => {
        let data;

        // Try cloud sync for authenticated users (webapp or Electron with token)
        const isAuth = await checkAuthenticated();
        if (isAuth) {
          console.log('[CloudSync] Authenticated user, loading from cloud...');
          const cloudData = await loadCloudData();
          if (cloudData) {
            data = cloudData;
            // Also save to localStorage as backup
            saveCompanyData(data);
          } else {
            // Fall back to localStorage if cloud fails
            console.log('[CloudSync] Cloud load failed, falling back to localStorage');
            data = loadCompanyData();
          }
        } else {
          // Desktop app or unauthenticated - use localStorage only
          data = loadCompanyData();
        }

        setCompanies(data.companies);
        setActiveCompany(data.activeCompany);

        if (data.activeCompany && data.data[data.activeCompany]) {
          setInputs(data.data[data.activeCompany].inputs || { ...EMPTY_INPUTS });
          setGenerated(data.data[data.activeCompany].generated || { ...EMPTY_GENERATED });
          setCustomSections(data.data[data.activeCompany].customSections || []);
          // Restore active tab for this company
          if (data.data[data.activeCompany].activeTab) {
            setActiveTab(data.data[data.activeCompany].activeTab);
          }
        } else {
          setInputs({ ...EMPTY_INPUTS });
          setGenerated({ ...EMPTY_GENERATED });
          setCustomSections([]);
        }

        // Re-enable auto-save after initial load
        setTimeout(() => setIsLoadingCompany(false), 100);
      };

      loadData();
    }
  }, [isOpen, embedded]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCompanyDropdown(false);
        setShowNewCompanyInput(false);
        setNewCompanyName('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus new company input when shown
  useEffect(() => {
    if (showNewCompanyInput && newCompanyInputRef.current) {
      newCompanyInputRef.current.focus();
    }
  }, [showNewCompanyInput]);

  // Handle escape key to close JD popup
  useEffect(() => {
    if (!showJDPopup) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowJDPopup(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showJDPopup]);

  // Handle JD popup dragging
  useEffect(() => {
    if (!isDraggingJD) return;
    
    const handleMouseMove = (e) => {
      setJdPopupPos({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    };
    
    const handleMouseUp = () => {
      setIsDraggingJD(false);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingJD, dragStart]);

  // Reset JD popup position when closing
  useEffect(() => {
    if (!showJDPopup) {
      setJdPopupPos({ x: 0, y: 0 });
    }
  }, [showJDPopup]);

  // Cache any existing diagrams that don't have base64 yet (for backward compatibility)
  useEffect(() => {
    const systemDesign = generated['system-design'];
    if (systemDesign && systemDesign.questions) {
      const needsCaching = systemDesign.questions.some(q => q.diagramUrl && !q.diagramBase64);
      if (needsCaching) {
        console.log('[DiagramCache] Found uncached diagrams, caching...');
        cacheDiagramImages(systemDesign).then(cachedResult => {
          if (cachedResult !== systemDesign) {
            setGenerated(prev => ({ ...prev, 'system-design': cachedResult }));
          }
        });
      }
    }
  }, [generated['system-design']?.questions?.length]);

  // Save current company data whenever inputs, generated content, custom sections, or active tab change
  // Skip during company loading to prevent data bleeding
  // Also sync to cloud for authenticated webapp users (debounced)
  useEffect(() => {
    if (activeCompany && !isLoadingCompany) {
      const data = loadCompanyData();
      const existingCloudId = data.data[activeCompany]?.cloudId;

      data.data[activeCompany] = {
        cloudId: existingCloudId, // Preserve cloudId if it exists
        inputs,
        generated,
        customSections,
        activeTab, // Persist active tab per company
      };
      data.activeCompany = activeCompany;
      saveCompanyData(data);

      // Sync to cloud for authenticated users (debounced to avoid too many API calls)
      if (existingCloudId) {
        // Use a debounce key to prevent rapid-fire updates
        const debounceKey = `cloudSync_${activeCompany}`;
        if (window[debounceKey]) {
          clearTimeout(window[debounceKey]);
        }
        window[debounceKey] = setTimeout(async () => {
          const isAuth = await checkAuthenticated();
          if (isAuth) {
            updateCloudCompany(existingCloudId, {
              inputs,
              generated,
              customSections,
            });
          }
        }, 2000); // 2 second debounce
      }
    }
  }, [inputs, generated, customSections, activeCompany, activeTab, isLoadingCompany]);


  const handleInputChange = (field, value) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  // Create a new company (with cloud sync for authenticated users)
  const handleCreateCompany = async (name) => {
    const trimmedName = name.trim();
    if (!trimmedName || companies.includes(trimmedName)) {
      return;
    }

    // Prevent auto-save during transition
    setIsLoadingCompany(true);

    const data = loadCompanyData();

    // Save current company's data first before switching
    if (activeCompany) {
      const existingCloudId = data.data[activeCompany]?.cloudId;
      data.data[activeCompany] = {
        cloudId: existingCloudId,
        inputs,
        generated,
        customSections,
      };
    }

    // Create in cloud for authenticated users
    let cloudId = null;
    const isAuth = await checkAuthenticated();
    if (isAuth) {
      const result = await createCloudCompany(trimmedName);
      if (result?.success) {
        cloudId = result.id;
      }
    }

    data.companies.push(trimmedName);
    data.activeCompany = trimmedName;
    data.data[trimmedName] = {
      cloudId, // Store cloudId if created
      inputs: { ...EMPTY_INPUTS },
      generated: { ...EMPTY_GENERATED },
      customSections: [], // Include customSections
    };
    saveCompanyData(data);

    setCompanies(data.companies);
    setActiveCompany(trimmedName);
    setInputs({ ...EMPTY_INPUTS });
    setGenerated({ ...EMPTY_GENERATED });
    setCustomSections([]); // Reset customSections state
    setShowNewCompanyInput(false);
    setNewCompanyName('');
    setShowCompanyDropdown(false);
    setActiveTab('input');

    // Re-enable auto-save after state is set
    setTimeout(() => setIsLoadingCompany(false), 100);
  };

  // Switch to a different company
  const handleSwitchCompany = (companyName) => {
    if (companyName === activeCompany) {
      setShowCompanyDropdown(false);
      return;
    }

    // Prevent auto-save during transition
    setIsLoadingCompany(true);

    const data = loadCompanyData();

    // CRITICAL: Save current company's data BEFORE switching
    // This prevents data bleeding between companies
    if (activeCompany && data.data[activeCompany] !== undefined) {
      const existingCloudId = data.data[activeCompany]?.cloudId;
      data.data[activeCompany] = {
        cloudId: existingCloudId, // Preserve cloudId
        inputs,
        generated,
        customSections,
      };
    }

    data.activeCompany = companyName;
    saveCompanyData(data);

    // Now load the new company's data
    setActiveCompany(companyName);
    if (data.data[companyName]) {
      setInputs(data.data[companyName].inputs || { ...EMPTY_INPUTS });
      setGenerated(data.data[companyName].generated || { ...EMPTY_GENERATED });
      setCustomSections(data.data[companyName].customSections || []);
    } else {
      setInputs({ ...EMPTY_INPUTS });
      setGenerated({ ...EMPTY_GENERATED });
      setCustomSections([]);
    }
    setShowCompanyDropdown(false);
    setActiveTab('input');

    // Re-enable auto-save after state is set
    setTimeout(() => setIsLoadingCompany(false), 100);
  };

  // Rename company
  // Rename company (with cloud sync for authenticated users)
  const handleRenameCompany = async (newName) => {
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === activeCompany) {
      setEditingCompanyName(false);
      return;
    }

    if (companies.includes(trimmedName)) {
      alert('A company with this name already exists');
      return;
    }

    const data = loadCompanyData();
    const index = data.companies.indexOf(activeCompany);
    if (index !== -1) {
      const existingCloudId = data.data[activeCompany]?.cloudId;

      // Rename in cloud for authenticated users
      const isAuthRename = await checkAuthenticated();
      if (isAuthRename && existingCloudId) {
        await renameCloudCompany(existingCloudId, trimmedName);
      }

      // Save current state before renaming (capture any unsaved changes)
      const currentCompanyData = {
        cloudId: existingCloudId, // Preserve cloudId
        inputs,
        generated,
        customSections,
      };

      data.companies[index] = trimmedName;
      data.data[trimmedName] = currentCompanyData;
      delete data.data[activeCompany];
      data.activeCompany = trimmedName;
      saveCompanyData(data);

      setCompanies(data.companies);
      setActiveCompany(trimmedName);
    }
    setEditingCompanyName(false);
  };

  // Delete a company (with cloud sync for authenticated users)
  const handleDeleteCompany = async (companyName) => {
    if (!confirm(`Delete "${companyName}" and all its interview prep data?`)) {
      return;
    }

    // Prevent auto-save during transition
    setIsLoadingCompany(true);

    const data = loadCompanyData();

    // Delete from cloud for authenticated users
    const cloudId = data.data[companyName]?.cloudId;
    const isAuthDelete = await checkAuthenticated();
    if (isAuthDelete && cloudId) {
      await deleteCloudCompany(cloudId);
    }

    // Save current active company's data first (if not the one being deleted)
    if (activeCompany && activeCompany !== companyName) {
      const existingCloudId = data.data[activeCompany]?.cloudId;
      data.data[activeCompany] = {
        cloudId: existingCloudId,
        inputs,
        generated,
        customSections,
      };
    }

    data.companies = data.companies.filter(c => c !== companyName);
    delete data.data[companyName];

    // Switch to another company or clear
    if (data.companies.length > 0) {
      data.activeCompany = data.companies[0];
      saveCompanyData(data);
      setCompanies(data.companies);
      setActiveCompany(data.companies[0]);
      setInputs(data.data[data.companies[0]]?.inputs || { ...EMPTY_INPUTS });
      setGenerated(data.data[data.companies[0]]?.generated || { ...EMPTY_GENERATED });
      setCustomSections(data.data[data.companies[0]]?.customSections || []);
    } else {
      data.activeCompany = null;
      saveCompanyData(data);
      setCompanies([]);
      setActiveCompany(null);
      setInputs({ ...EMPTY_INPUTS });
      setGenerated({ ...EMPTY_GENERATED });
      setCustomSections([]);
    }
    setShowCompanyDropdown(false);
    setActiveTab('input');

    // Re-enable auto-save after state is set
    setTimeout(() => setIsLoadingCompany(false), 100);
  };

  // Generate a single section on-demand
  const handleGenerateSection = async (sectionId) => {
    if (!inputs.jobDescription.trim() || !inputs.resume.trim()) {
      alert('Please provide at least a Job Description and Resume');
      return;
    }

    setIsGenerating(true);
    setGeneratingSection(sectionId);
    setStreamingContent('');

    try {
      const response = await fetch(API_URL + '/api/ascend/prep/section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          jobDescription: inputs.jobDescription,
          resume: inputs.resume,
          coverLetter: inputs.coverLetter,
          prepMaterials: inputs.prepMaterials,
          documentation: inputs.documentation || [],
          section: sectionId,
          companyName: activeCompany, // Include company name for company-specific content
          provider: provider || 'claude',
          model,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate section');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.chunk) {
                setStreamingContent(prev => {
                  const newContent = prev + data.chunk;
                  return newContent.replace(/  +/g, ' ');
                });
              }

              if (data.done && data.result) {
                const cleanedResult = cleanupContent(data.result);
                // Cache diagram images for system-design to avoid expiration
                if (sectionId === 'system-design') {
                  cacheDiagramImages(cleanedResult).then(cachedResult => {
                    setGenerated(prev => ({ ...prev, [sectionId]: cachedResult }));
                  });
                } else {
                  setGenerated(prev => ({ ...prev, [sectionId]: cleanedResult }));
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      console.error('Generate section error:', err);
      alert('Failed to generate: ' + err.message);
    } finally {
      setIsGenerating(false);
      setGeneratingSection(null);
      setStreamingContent('');
    }
  };

  // Generate a single section (for parallel generation)
  const generateSingleSection = async (sectionId) => {
    try {
      const response = await fetch(API_URL + '/api/ascend/prep/section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          jobDescription: inputs.jobDescription,
          resume: inputs.resume,
          coverLetter: inputs.coverLetter,
          prepMaterials: inputs.prepMaterials,
          documentation: inputs.documentation || [],
          section: sectionId,
          companyName: activeCompany, // Include company name for company-specific content
          provider: provider || 'claude',
          model,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate section');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.chunk) {
                fullContent += data.chunk;
              }

              if (data.done && data.result) {
                const cleanedResult = cleanupContent(data.result);
                // Cache diagram images for system-design to avoid expiration
                if (sectionId === 'system-design') {
                  const cachedResult = await cacheDiagramImages(cleanedResult);
                  return { sectionId, result: cachedResult };
                }
                return { sectionId, result: cleanedResult };
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      return { sectionId, result: null };
    } catch (err) {
      console.error(`Generate section ${sectionId} error:`, err);
      return { sectionId, error: err.message };
    }
  };

  // Generate all sections in parallel
  const handleGenerateAll = async () => {
    if (!inputs.jobDescription.trim() || !inputs.resume.trim()) {
      alert('Please provide at least a Job Description and Resume');
      return;
    }

    // Get sections that need to be generated
    const sectionsToGenerate = sections.filter(s => !generated[s.id] && !s.isDocViewer).map(s => s.id);

    if (sectionsToGenerate.length === 0) {
      alert('All sections are already generated. Use "Clear All" to regenerate.');
      return;
    }

    setIsGenerating(true);
    setGeneratingSections(new Set(sectionsToGenerate));

    // Run all sections in parallel
    const promises = sectionsToGenerate.map(async (sectionId) => {
      const result = await generateSingleSection(sectionId);

      // Update state as each section completes
      if (result.result) {
        setGenerated(prev => ({ ...prev, [sectionId]: result.result }));
      }

      // Remove from generating set
      setGeneratingSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });

      return result;
    });

    await Promise.all(promises);

    setIsGenerating(false);
    setGeneratingSections(new Set());
  };

  // Handle tab click - auto-generate if not already generated
  const handleTabClick = (sectionId) => {
    setActiveTab(sectionId);

    // Check if it's a custom section
    const isCustom = sectionId.startsWith('custom-');

    if (sectionId !== 'input' && !generated[sectionId] && !isGenerating && inputs.jobDescription.trim() && inputs.resume.trim()) {
      if (isCustom) {
        // Find the custom section config
        const customSection = customSections.find(s => s.id === sectionId);
        if (customSection) {
          handleGenerateCustomSection(sectionId, customSection.documentIndex);
        }
      } else {
        handleGenerateSection(sectionId);
      }
    }
  };

  // Generate content for a custom section based on a document
  const handleGenerateCustomSection = async (sectionId, documentIndex) => {
    if (!inputs.jobDescription.trim() || !inputs.resume.trim()) {
      alert('Please provide at least a Job Description and Resume');
      return;
    }

    const doc = inputs.documentation[documentIndex];
    if (!doc) {
      alert('Document not found');
      return;
    }

    setIsGenerating(true);
    setGeneratingSection(sectionId);
    setStreamingContent('');

    try {
      const response = await fetch(API_URL + '/api/ascend/prep/section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          jobDescription: inputs.jobDescription,
          resume: inputs.resume,
          coverLetter: inputs.coverLetter,
          prepMaterials: inputs.prepMaterials,
          documentation: inputs.documentation || [],
          section: 'custom',
          customDocumentContent: doc.content,
          customDocumentName: doc.name,
          companyName: activeCompany, // Include company name for company-specific content
          provider: provider || 'claude',
          model,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate section');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.chunk) {
                setStreamingContent(prev => {
                  const newContent = prev + data.chunk;
                  return newContent.replace(/  +/g, ' ');
                });
              }

              if (data.done && data.result) {
                const cleanedResult = cleanupContent(data.result);
                // Cache any diagram images to avoid expiration
                cacheDiagramImages(cleanedResult).then(cachedResult => {
                  setGenerated(prev => ({ ...prev, [sectionId]: cachedResult }));
                });
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      console.error('Generate custom section error:', err);
      alert('Failed to generate: ' + err.message);
    } finally {
      setIsGenerating(false);
      setGeneratingSection(null);
      setStreamingContent('');
    }
  };

  // Delete a custom section
  const handleDeleteCustomSection = (sectionId) => {
    if (!confirm('Delete this custom section?')) return;

    setCustomSections(prev => prev.filter(s => s.id !== sectionId));
    setGenerated(prev => {
      const newGenerated = { ...prev };
      delete newGenerated[sectionId];
      return newGenerated;
    });

    if (activeTab === sectionId) {
      setActiveTab('input');
    }
  };

  const handleClearAll = () => {
    if (!confirm('Clear generated content? (Your inputs will be kept)')) return;

    setGenerated({ ...EMPTY_GENERATED });
    setActiveTab('input');
  };

  // Export to PDF
  const handleExportPDF = async () => {
    try {
      const response = await fetch(`${API_URL}/api/ascend/prep/export/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          sections: generated,
          companyName: activeCompany || 'Interview',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ascend-prep-${activeCompany || 'document'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to export PDF: ' + err.message);
    }
  };

  // Export to DOCX
  const handleExportDOCX = async () => {
    try {
      const response = await fetch(`${API_URL}/api/ascend/prep/export/docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          sections: generated,
          companyName: activeCompany || 'Interview',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate DOCX');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ascend-prep-${activeCompany || 'document'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('DOCX export error:', err);
      alert('Failed to export DOCX: ' + err.message);
    }
  };

  if (!isOpen && !embedded) return null;

  const hasInputs = inputs.jobDescription.trim() && inputs.resume.trim();
  const completedSections = Object.values(generated).filter(v => v !== null).length;

  // Use different container style for dedicated window vs modal vs embedded
  const containerClass = embedded
    ? "h-full flex relative"
    : isDedicatedWindow
    ? "h-screen flex relative"
    : "fixed inset-0 z-50 flex items-center justify-center bg-black/50";

  // For modal mode, render as a centered dialog
  const isModal = !embedded && !isDedicatedWindow;

  return (
    <div className={containerClass}>
      {/* Modal wrapper - constrains size when in modal mode */}
      <div className={isModal ? "flex w-[90vw] h-[90vh] rounded-lg overflow-hidden shadow-2xl" : "flex w-full h-full relative"}>
      {/* Drag bar for dedicated window - spans entire top */}
      {isDedicatedWindow && !embedded && (
        <div
          className="absolute top-0 left-0 right-0 h-7 z-50"
          style={{ WebkitAppRegion: 'drag', backgroundColor: 'transparent' }}
        />
      )}
      {/* Mobile sidebar overlay */}
      {isMobile && prepSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setPrepSidebarOpen(false)} />
      )}
      {/* Sidebar Navigation */}
      <div className={`${isMobile ? 'fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300' : 'w-64'} flex flex-col prep-sidebar ${isDedicatedWindow && !embedded ? 'pt-7' : ''} ${isMobile && !prepSidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}>
        {/* Header with Company Selector */}
        <div className="prep-header">
          {!embedded && <div className="flex items-center justify-between mb-3">
            <h2 className="prep-header-title landing-display">Interview Prep</h2>
            <div className="flex items-center gap-2">
              {/* Cloud Sync Status (Electron only) */}
              {isElectron && (
                <button
                  onClick={async () => {
                    if (accountLinked) {
                      if (confirm('Unlink your cloud account? Your data will remain local only.')) {
                        await window.electronAPI.accountLogout();
                        setAccountLinked(false);
                      }
                    } else {
                      setLinkingAccount(true);
                      try {
                        const result = await window.electronAPI.accountLogin('google');
                        if (result.success) {
                          setAccountLinked(true);
                          // Reload data from cloud
                          setIsLoadingCompany(true);
                          const cloudData = await loadCloudData();
                          if (cloudData) {
                            setCompanies(cloudData.companies);
                            setActiveCompany(cloudData.activeCompany);
                            if (cloudData.activeCompany && cloudData.data[cloudData.activeCompany]) {
                              setInputs(cloudData.data[cloudData.activeCompany].inputs || { ...EMPTY_INPUTS });
                              setGenerated(cloudData.data[cloudData.activeCompany].generated || { ...EMPTY_GENERATED });
                              setCustomSections(cloudData.data[cloudData.activeCompany].customSections || []);
                            }
                            saveCompanyData(cloudData);
                          }
                          setTimeout(() => setIsLoadingCompany(false), 100);
                        }
                      } finally {
                        setLinkingAccount(false);
                      }
                    }
                  }}
                  disabled={linkingAccount}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg transition-colors"
                  style={{
                    background: accountLinked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    color: accountLinked ? '#10b981' : '#3b82f6',
                    border: `1px solid ${accountLinked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                  }}
                  title={accountLinked ? 'Cloud sync enabled - click to unlink' : 'Link account for cloud sync'}
                >
                  {linkingAccount ? (
                    <span className="animate-spin">⟳</span>
                  ) : accountLinked ? (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
                      </svg>
                      <span>Synced</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span>Link</span>
                    </>
                  )}
                </button>
              )}
              {!isDedicatedWindow && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--content-bg-hover)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>}

          {/* Company Selector */}
          <div className="relative" ref={dropdownRef}>
            {activeCompany ? (
              <button
                onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-left"
                style={{ background: 'var(--nav-hover)', border: '1px solid var(--nav-border)' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {editingCompanyName ? (
                    <input
                      type="text"
                      defaultValue={activeCompany}
                      className="bg-transparent text-sm font-medium w-full focus:outline-none"
                      style={{ color: 'var(--nav-text)' }}
                      onBlur={(e) => handleRenameCompany(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameCompany(e.target.value);
                        } else if (e.key === 'Escape') {
                          setEditingCompanyName(false);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--nav-text)' }}>{activeCompany}</span>
                  )}
                </div>
                <svg className={`w-4 h-4 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} style={{ color: 'var(--nav-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowNewCompanyInput(true);
                  setShowCompanyDropdown(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium"
                style={{ background: '#10b981', color: '#ffffff', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Company
              </button>
            )}

            {/* Dropdown Menu */}
            {showCompanyDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 py-1 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto" style={{ background: 'var(--nav-bg-secondary)', border: '1px solid var(--nav-border)' }}>
                {/* Existing Companies */}
                {companies.map((company) => (
                  <div
                    key={company}
                    className="flex items-center justify-between px-3 py-2 cursor-pointer"
                    style={{ background: company === activeCompany ? 'var(--nav-active)' : 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--nav-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = company === activeCompany ? 'var(--nav-active)' : 'transparent'}
                  >
                    <button
                      onClick={() => handleSwitchCompany(company)}
                      className="flex-1 text-left text-sm truncate"
                      style={{ color: 'var(--nav-text)' }}
                    >
                      {company}
                    </button>
                    <div className="flex items-center gap-1">
                      {company === activeCompany && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCompanyName(true);
                            setShowCompanyDropdown(false);
                          }}
                          className="p-1 rounded"
                          style={{ color: 'var(--nav-text-muted)' }}
                          title="Rename"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCompany(company);
                        }}
                        className="p-1 rounded"
                        style={{ color: 'var(--text-muted)' }}
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Divider if there are companies */}
                {companies.length > 0 && <div className="my-1" style={{ borderTop: '1px solid var(--border-default)' }} />}

                {/* Add New Company */}
                {showNewCompanyInput ? (
                  <div className="px-3 py-2">
                    <input
                      ref={newCompanyInputRef}
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCompanyName.trim()) {
                          handleCreateCompany(newCompanyName);
                        } else if (e.key === 'Escape') {
                          setShowNewCompanyInput(false);
                          setNewCompanyName('');
                        }
                      }}
                      placeholder="Company name..."
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
                      style={{ background: '#f9fafb', color: '#111827', border: '1px solid #e5e7eb' }}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleCreateCompany(newCompanyName)}
                        disabled={!newCompanyName.trim()}
                        className="flex-1 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: '#10b981', color: '#ffffff' }}
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowNewCompanyInput(false);
                          setNewCompanyName('');
                        }}
                        className="flex-1 py-1.5 text-xs font-medium rounded-lg"
                        style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewCompanyInput(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm"
                    style={{ color: '#10b981' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Company
                  </button>
                )}
              </div>
            )}
          </div>

          {activeCompany && completedSections > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(completedSections / sections.length) * 100}%`,
                    background: 'linear-gradient(90deg, #10b981 0%, #F97316 100%)'
                  }}
                />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {completedSections}/{sections.length}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Tabs - only show if company is selected */}
        {activeCompany ? (
          <>
            <nav className="flex-1 overflow-y-auto py-2">
              {/* Input Tab */}
              <button
                onClick={() => setActiveTab('input')}
                className={`prep-nav-item ${activeTab === 'input' ? 'active' : ''}`}
              >
                <div className="prep-nav-icon">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm landing-body">Input Materials</div>
                </div>
              </button>

              {/* JD Tab - Opens popup */}
              <button
                onClick={() => setShowJDPopup(true)}
                className="prep-nav-item"
                style={{
                  background: inputs.jobDescription?.trim() ? 'rgba(59, 130, 246, 0.08)' : undefined,
                  borderColor: inputs.jobDescription?.trim() ? 'rgba(59, 130, 246, 0.2)' : undefined,
                }}
              >
                <div
                  className="prep-nav-icon"
                  style={{
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: inputs.jobDescription?.trim() ? '#3b82f6' : undefined,
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: inputs.jobDescription?.trim() ? '#3b82f6' : undefined }}>
                    Job Description
                  </div>
                </div>
                {inputs.jobDescription?.trim() && (
                  <svg className="w-4 h-4" style={{ color: '#3b82f6' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              {/* Divider */}
              <div className="my-2 mx-4" style={{ borderTop: '1px solid var(--nav-border)' }} />

              {/* Section Tabs */}
              {sections.map((section) => {
                const isActive = activeTab === section.id;
                const isComplete = generated[section.id] !== null;
                const isCurrentlyGenerating = generatingSection === section.id || generatingSections.has(section.id);

                return (
                  <button
                    key={section.id}
                    onClick={() => handleTabClick(section.id)}
                    disabled={isGenerating && !isCurrentlyGenerating}
                    className={`prep-nav-item ${isActive ? 'active' : ''} ${isComplete ? 'completed' : ''}`}
                    style={{
                      opacity: isGenerating && !isCurrentlyGenerating ? 0.5 : 1,
                    }}
                  >
                    <div
                      className="prep-nav-icon"
                      style={{
                        background: `${section.color}18`,
                        color: isComplete ? section.color : undefined,
                      }}
                    >
                      {isCurrentlyGenerating ? (
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: section.color, borderTopColor: 'transparent' }} />
                      ) : isComplete ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        SectionIcons[section.icon] ? SectionIcons[section.icon]() : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: isComplete ? section.color : undefined }}>{section.name}</div>
                    </div>
                  </button>
                );
              })}

              {/* Custom Sections from Documents */}
              {customSections.length > 0 && (
                <>
                  <div className="my-2 mx-4 flex items-center gap-2" style={{ borderTop: '1px solid rgba(16, 185, 129, 0.15)', paddingTop: '8px' }}>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#10b981', opacity: 0.8 }}>Custom</span>
                  </div>
                  {customSections.map((section) => {
                    const isActive = activeTab === section.id;
                    const isComplete = generated[section.id] !== null;
                    const isCurrentlyGenerating = generatingSection === section.id;

                    return (
                      <div key={section.id} className="flex items-center group">
                        <button
                          onClick={() => handleTabClick(section.id)}
                          disabled={isGenerating && !isCurrentlyGenerating}
                          className={`prep-nav-item custom flex-1 ${isActive ? 'active' : ''} ${isComplete ? 'completed' : ''}`}
                          style={{ opacity: isGenerating && !isCurrentlyGenerating ? 0.5 : 1 }}
                        >
                          <div className="prep-nav-icon">
                            {isCurrentlyGenerating ? (
                              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#10b981', borderTopColor: 'transparent' }} />
                            ) : isComplete ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{section.name}</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleDeleteCustomSection(section.id)}
                          className="p-1 mr-2 rounded opacity-0 group-hover:opacity-100 touch:opacity-100 transition-opacity hover:bg-red-500/20"
                          style={{ color: 'var(--nav-text-muted)' }}
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </>
              )}

            </nav>

            {/* Footer Actions */}
            <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--border-default)', background: 'var(--content-bg-secondary)' }}>
              {/* Generate and Clear Buttons - Single Row */}
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateAll}
                  disabled={isGenerating || !hasInputs || completedSections === sections.length}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${completedSections === sections.length ? 'completed' : ''}`}
                  style={{
                    background: completedSections === sections.length ? '#10b981' : '#10b981',
                    color: '#ffffff',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                  }}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : completedSections === sections.length ? (
                    <span>Ready</span>
                  ) : (
                    <span>Generate ({sections.length - completedSections})</span>
                  )}
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={isGenerating}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  style={{ color: 'var(--text-muted)', background: 'var(--content-bg-hover)', border: '1px solid var(--border-default)' }}
                  onMouseEnter={(e) => { e.target.style.background = 'var(--content-bg)'; e.target.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'var(--content-bg-hover)'; e.target.style.color = 'var(--text-muted)'; }}
                >
                  Clear
                </button>
              </div>

              {!hasInputs && (
                <div className="text-xs text-center py-1" style={{ color: 'var(--text-muted)' }}>
                  Add JD & Resume to get started
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center" style={{ color: 'var(--text-muted)' }}>
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-sm">Add a company to start</p>
              <p className="text-xs mt-1" style={{ color: '#999999' }}>preparing for interviews</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--content-bg-secondary)' }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div className="flex items-center gap-3 px-3 py-2 border-b flex-shrink-0" style={{ borderColor: 'var(--border-default)', background: 'var(--content-bg)' }}>
            <button
              onClick={() => setPrepSidebarOpen(true)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Open sections"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="text-sm font-medium" style={{ color: 'var(--content-text)' }}>
              {activeCompany || 'Interview Prep'}
            </span>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
        {!activeCompany ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center" style={{ color: 'var(--text-muted)' }}>
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium landing-display" style={{ color: 'var(--content-text)' }}>No Company Selected</h3>
              <p className="text-sm mt-1">Add a company from the sidebar to start preparing</p>
            </div>
          </div>
        ) : activeTab === 'input' ? (
          <InputPanel
            inputs={inputs}
            onChange={handleInputChange}
            hasInputs={hasInputs}
          />
        ) : (
          <OutputPanel
            section={sections.find(s => s.id === activeTab)}
            content={generated[activeTab]}
            streamingContent={generatingSection === activeTab ? streamingContent : ''}
            isGenerating={generatingSection === activeTab}
            jobDescription={inputs.jobDescription}
            onRegenerate={() => {
              const customSection = customSections.find(s => s.id === activeTab);
              if (customSection) {
                handleGenerateCustomSection(activeTab, customSection.documentIndex);
              } else {
                handleGenerateSection(activeTab);
              }
            }}
            onGenerate={() => {
              const customSection = customSections.find(s => s.id === activeTab);
              if (customSection) {
                handleGenerateCustomSection(activeTab, customSection.documentIndex);
              } else {
                handleGenerateSection(activeTab);
              }
            }}
            hasInputs={hasInputs}
          />
        )}
      </div>{/* End inner scroll */}
      </div>{/* End content area */}
      </div>{/* End modal wrapper */}

      {/* JD Popup Modal */}
      {showJDPopup && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowJDPopup(false)}
        >
          <div
            className="relative w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.1)',
              transform: `translate(${jdPopupPos.x}px, ${jdPopupPos.y}px)`,
              transition: isDraggingJD ? 'none' : 'transform 0.1s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient Header Bar - Draggable */}
            <div
              className="h-2 cursor-move"
              style={{ background: 'linear-gradient(90deg, #10b981 0%, #F97316 50%, #06b6d4 100%)' }}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingJD(true);
                setDragStart({ x: e.clientX - jdPopupPos.x, y: e.clientY - jdPopupPos.y });
              }}
            />

            {/* Header - Also Draggable */}
            <div 
              className="flex items-center justify-between px-6 py-5 cursor-move select-none"
              onMouseDown={(e) => {
                if (e.target.closest('button')) return; // Don't drag when clicking buttons
                e.preventDefault();
                setIsDraggingJD(true);
                setDragStart({ x: e.clientX - jdPopupPos.x, y: e.clientY - jdPopupPos.y });
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #F97316 100%)' }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] landing-display">Job Description</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                      {activeCompany || 'No company'}
                    </span>
                    {inputs.jobDescription?.trim() && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {inputs.jobDescription.length.toLocaleString()} chars
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowJDPopup(false)}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--bg-elevated)]"
                style={{ color: '#9ca3af' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              <div
                className="rounded-2xl overflow-hidden"
                className="bg-[var(--bg-elevated)] border border-[var(--border)]"
                style={{
                  maxHeight: '60vh'
                }}
              >
                {inputs.jobDescription?.trim() ? (
                  <div className="p-5 overflow-y-auto" style={{ maxHeight: '60vh' }}>
                    <div className="prose prose-sm max-w-none text-sm leading-relaxed text-[var(--text-muted)] whitespace-pre-wrap landing-body">
                      {inputs.jobDescription}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div
                      className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                      style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)' }}
                    >
                      <svg className="w-10 h-10" style={{ color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 landing-display">No Job Description Yet</h3>
                    <p className="text-sm text-[var(--text-muted)] mb-4 landing-body">
                      Paste a job description in Input Materials
                    </p>
                    <button
                      onClick={() => { setShowJDPopup(false); setActiveTab('input'); }}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 landing-body"
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #F97316 100%)' }}
                    >
                      Add Job Description
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Keyboard hint */}
            <div className="px-6 pb-4 flex justify-center">
              <span className="text-xs text-[var(--text-muted)]">
                Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] font-mono text-xs">ESC</kbd> to close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
