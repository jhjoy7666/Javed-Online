/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Settings, 
  History, 
  RefreshCcw, 
  Bell, 
  LogOut, 
  LogIn, 
  User as UserIcon,
  Trash2,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  checkRedirectResult,
  logout, 
  OperationType, 
  handleFirestoreError 
} from './firebase';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { format, parse } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, fetchAllOccupations } from './constants';
import { ExamStatus, PassportEntry, ApiResponse, UserPreferences, HistoryLog } from './types';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Components
const ResultCard = ({ entry, onDelete }: { entry: PassportEntry, onDelete?: () => void | Promise<void>, key?: any }) => {
  const [highlight, setHighlight] = useState(false);
  const prevStatus = useRef(entry.lastStatus);

  useEffect(() => {
    if (prevStatus.current !== entry.lastStatus) {
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 3000);
      prevStatus.current = entry.lastStatus;
      return () => clearTimeout(timer);
    }
  }, [entry.lastStatus]);

  const getStatusConfig = (status: ExamStatus) => {
    switch (status) {
      case 'Passed':
        return {
          bgColor: 'bg-[#ECFDF5]',
          textColor: 'text-[#067647]',
          title: 'The result is passed.',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="svp-icon">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM16.0303 8.96967L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303L9.03033 11.9697L10.5 13.4393L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z" fill="currentColor" />
            </svg>
          )
        };
      case 'Failed':
        return {
          bgColor: 'bg-[#FEF3F2]',
          textColor: 'text-[#B42318]',
          title: 'The result is failed.',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="svp-icon">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM11 13V8H13V13H11ZM11 16V14H13V16H11Z" fill="currentColor" />
            </svg>
          )
        };
      case 'Pending':
      default:
        return {
          bgColor: 'bg-[#FFFAEB]',
          textColor: 'text-[#B54708]',
          title: 'The result is pending.',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="svp-icon">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM11 13V8H13V13H11ZM11 16V14H13V16H11Z" fill="currentColor" />
            </svg>
          )
        };
    }
  };

  const config = getStatusConfig(entry.lastStatus);

  return (
    <motion.div 
      layout
      initial={false}
      animate={{ 
        scale: highlight ? 1.02 : 1,
        opacity: highlight ? 0.9 : 1,
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 20 
      }}
      className={cn(
        "applicant-result-box bg-white border border-[#d0d5dd] rounded-xl overflow-hidden shadow-sm transition-all mb-4 relative z-10",
        highlight && "ring-4 ring-[#067647]/20 border-[#067647] shadow-lg z-20"
      )}
    >
      <div className={cn("applicant-result-top px-4 py-3 flex items-center justify-between", config.bgColor)}>
        <div className="flex items-center gap-2">
          <div className={cn("status shrink-0", config.textColor)}>
            {config.icon}
          </div>
          <span className={cn("applicant-result-title font-semibold text-[14px]", config.textColor)}>
            {config.title}
          </span>
        </div>
        {highlight && (
          <motion.span 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[10px] font-bold text-[#067647] bg-white/50 px-2 py-0.5 rounded-full uppercase tracking-wider"
          >
            Updated Just Now
          </motion.span>
        )}
      </div>

      <div className="result-item-value-header px-4 py-2 text-[12px] font-bold text-[#475467] bg-[#f9fafb] uppercase">
        Test Details
      </div>

      <div className="applicant-result-bottom p-4">
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div className="result-item">
            <div className="result-item-title text-[10px] uppercase text-[#475467] font-semibold mb-0.5">Applicant Name:</div>
            <div className="result-item-value text-[12px] font-semibold text-[#101828] truncate">{entry.applicantName || 'N/A'}</div>
          </div>
          <div className="result-item text-right">
            <div className="result-item-title text-[10px] uppercase text-[#475467] font-semibold mb-0.5">Passport No.:</div>
            <div className="result-item-value text-[12px] font-semibold text-[#101828] truncate">{entry.passportNumber}</div>
          </div>
        </div>

         <div className="grid grid-cols-2 gap-4">
          <div className="result-item">
            <div className="result-item-title text-[10px] uppercase text-[#475467] font-semibold mb-0.5">Occupation:</div>
            <div className="result-item-value text-[12px] font-semibold text-[#101828] truncate">
              {entry.occupationName} 
              <span className="text-[10px] font-normal text-[#475467] ml-1">({entry.occupationCode})</span>
            </div>
          </div>
          <div className="result-item text-right">
            <div className="result-item-title text-[10px] uppercase text-[#475467] font-semibold mb-0.5">Test Date:</div>
            <div className="result-item-value text-[12px] font-semibold text-[#101828] truncate">{entry.examDate || 'N/A'}</div>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-[#f2f4f7]">
          <div className="result-item w-full">
            <div className="result-item-title text-[10px] uppercase text-[#475467] font-semibold mb-0.5">Test Centre:</div>
            <div className="result-item-value text-[12px] font-semibold text-[#101828] truncate">{entry.testCenter || 'N/A'}</div>
          </div>
        </div>

        {onDelete && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-[11px] font-bold text-[#b42318] bg-[#fef3f2] rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 size={12} /> Remove Entry
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [passports, setPassports] = useState<PassportEntry[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences>({
    autoCheckEnabled: false,
    telegramBotToken: TELEGRAM_BOT_TOKEN,
    telegramChatId: TELEGRAM_CHAT_ID
  });
  const [activeTab, setActiveTab] = useState<'results' | 'history' | 'add' | 'settings'>('results');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [occupationMap, setOccupationMap] = useState<Map<string, string>>(new Map());

  // Form states
  const [newPassport, setNewPassport] = useState('');
  const [newOccupation, setNewOccupation] = useState('');
  const [newNationality, setNewNationality] = useState(import.meta.env.VITE_DEFAULT_NATIONALITY || 'BGD');
  const [formErrors, setFormErrors] = useState<{ passport?: string, occupation?: string }>({});
  const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Interval for auto-check
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State for pull to refresh
  const [pullProgress, setPullProgress] = useState(0);
  const mainScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Check for redirect results on mount
    const checkRedirect = async () => {
      try {
        const result = await checkRedirectResult();
        if (result) {
          setUser(result.user);
        }
      } catch (error) {
        console.error("Redirect login error:", error);
      }
    };
    checkRedirect();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const initOccupations = async () => {
      const data = await fetchAllOccupations();
      const newMap = new Map<string, string>(data.map(occ => [occ.occupation_key, occ.english_name || occ.name]));
      setOccupationMap(newMap);
    };
    initOccupations();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen to preferences
    const prefUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setPrefs(prev => ({ ...prev, ...snap.data() }));
      }
    });

    // Listen to passports
    const passportQuery = query(collection(db, 'users', user.uid, 'passports'), orderBy('lastUpdated', 'desc'));
    const passportUnsub = onSnapshot(passportQuery, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as PassportEntry));
      setPassports(docs);
    });

    // Listen to history
    const historyQuery = query(
      collection(db, 'users', user.uid, 'history'), 
      orderBy('timestamp', 'desc'),
      limit(historyLimit)
    );
    const historyUnsub = onSnapshot(historyQuery, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as HistoryLog));
      setHistory(docs);
      // If we got exactly the limit, there might be more
      setHasMoreHistory(docs.length === historyLimit);
    });

    return () => {
      prefUnsub();
      passportUnsub();
      historyUnsub();
    };
  }, [user, historyLimit]);

  // Handle Auto-check activation
  useEffect(() => {
    if (user && prefs.autoCheckEnabled) {
      // Check every 2 minutes
      checkIntervalRef.current = setInterval(() => {
        refreshAllResults();
      }, 2 * 60 * 1000);
      
      // Initial check
      refreshAllResults();
    } else {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    }
    
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [user, prefs.autoCheckEnabled, passports.length]);

  const sendTelegramNotification = async (entry: PassportEntry, newStatus: string) => {
    const token = prefs.telegramBotToken;
    const chatId = prefs.telegramChatId;
    
    // Explicit validation for empty configuration
    if (!token || !chatId || token.trim() === '' || chatId.trim() === '') {
      console.warn("Telegram notification skipped: Bot Token or Chat ID is missing.");
      return;
    }

    const message = `
<b>Javed Online Result Update</b>
<b>Passport:</b> ${entry.passportNumber}
<b>Status Changed:</b> ${newStatus}
<b>Exam Date:</b> ${entry.examDate}
<b>Center:</b> ${entry.testCenter}
    `.trim();

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
    } catch (error) {
      console.error("Telegram notification failed:", error);
    }
  };

  const fetchResult = async (passport: string, occupation: string, nationality: string): Promise<PassportEntry | null> => {
    try {
      const url = `/api/proxy/results?passport_number=${passport}&occupation_key=${occupation}&nationality_id=${nationality}&locale=en`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorMsg = `Server returned ${response.status}: ${response.statusText}`;
        setFeedback({ message: "Unable to reach the results server. Please try again later.", type: 'error' });
        setTimeout(() => setFeedback(null), 5000);
        throw new Error(errorMsg);
      }
      
      const data: ApiResponse = await response.json();
      
      // Format date from DD-MM-YYYY to DD/MM/YYYY
      let formattedDate = '';
      if (data.exam_details?.exam_date) {
        try {
          const parts = data.exam_details.exam_date.split('-');
          if (parts.length === 3) {
            formattedDate = `${parts[0]}/${parts[1]}/${parts[2]}`;
          }
        } catch (e) {
          formattedDate = data.exam_details.exam_date;
        }
      }

      // Resolve Occupation Name
      let occupationName = occupationMap.get(occupation) || data.occupation?.occupation_name;
      
      // Fallback: Fetch from Occupations API if name is still just the code or missing
      if (!occupationName || occupationName === occupation) {
        try {
          // Try searching by specific name/code
          const occRes = await fetch(`/api/proxy/occupations?per_page=5&name=${occupation}&locale=en`);
          const occData = await occRes.json();
          
          if (occData?.data && Array.isArray(occData.data)) {
            // Find exact match by key if possible, otherwise first result
            const match = occData.data.find((o: any) => o.occupation_key === occupation) || occData.data[0];
            if (match) {
              occupationName = match.english_name || match.name;
            }
          }
        } catch (e) {
          console.error("Failed to resolve occupation name from API");
        }
      }

      return {
        passportNumber: passport,
        occupationCode: occupation,
        occupationName: occupationName || occupation,
        nationalityId: nationality,
        lastStatus: (data.exam_result as ExamStatus) || 'Pending',
        applicantName: data.labor?.name || 'N/A',
        examDate: formattedDate,
        testCenter: data.exam_details?.test_center_name || 'N/A',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error("Fetch result failed:", error);
      
      // Provide user feedback if not already set by the response check
      if (!feedback || feedback.type !== 'error') {
        setFeedback({ message: "Network error. Please check your connection.", type: 'error' });
        setTimeout(() => setFeedback(null), 5000);
      }

      // Log error context using the standard handler
      try {
        handleFirestoreError(error, OperationType.GET, 'api/proxy/results');
      } catch (e) {
        // handleFirestoreError throws, we just want to log it
      }
      
      return null;
    }
  };

  const handleAddPassport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setFormErrors({});
    const errors: { passport?: string, occupation?: string } = {};

    // Validate Passport
    const passportRegex = /^[A-Z0-9]{6,12}$/i;
    if (!newPassport) {
      errors.passport = 'Passport number is required';
    } else if (!passportRegex.test(newPassport)) {
      errors.passport = 'Must be 6-12 alphanumeric characters';
    }

    // Validate Occupation
    const occupationRegex = /^\d{5,10}$/;
    if (!newOccupation) {
      errors.occupation = 'Occupation code is required';
    } else if (!occupationRegex.test(newOccupation)) {
      errors.occupation = 'Invalid code (must be 5-10 digits)';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsRefreshing(true);
    const result = await fetchResult(newPassport, newOccupation, newNationality);
    
    if (result) {
      try {
        const path = `users/${user.uid}/passports`;
        await addDoc(collection(db, path), result);
        setNewPassport('');
        setNewOccupation('');
        setNewNationality(import.meta.env.VITE_DEFAULT_NATIONALITY || 'BGD');
        setFormErrors({});
        setFeedback({ message: 'Passport added successfully!', type: 'success' });
        setTimeout(() => setFeedback(null), 3000);
        setActiveTab('results');
      } catch (error) {
        setFeedback({ message: 'Failed to save to database. Please try again.', type: 'error' });
        setTimeout(() => setFeedback(null), 5000);
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/passports`);
      }
    } else {
      setFeedback({ message: 'Could not find results for this passport. Check your details.', type: 'error' });
      setTimeout(() => setFeedback(null), 5000);
    }
    setIsRefreshing(false);
  };

  const refreshAllResults = async () => {
    if (!user || passports.length === 0 || isRefreshing) return;
    setIsRefreshing(true);
    setLastCheck(new Date());

    for (const entry of passports) {
      const updated = await fetchResult(entry.passportNumber, entry.occupationCode, entry.nationalityId);
      if (updated && entry.id) {
        // Check if status changed
        if (updated.lastStatus !== entry.lastStatus) {
          sendTelegramNotification(entry, updated.lastStatus);
          
          // Log history
          await addDoc(collection(db, 'users', user.uid, 'history'), {
            passportNumber: entry.passportNumber,
            oldStatus: entry.lastStatus,
            newStatus: updated.lastStatus,
            timestamp: serverTimestamp()
          });
        }
        
        // Update Firestore
        await updateDoc(doc(db, 'users', user.uid, 'passports', entry.id), { ...updated });
      }
    }
    setIsRefreshing(false);
  };

  const handleDelete = async (id: string) => {
    if (!user || !id) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'passports', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/passports/${id}`);
    }
  };

  const updatePreference = async (key: keyof UserPreferences, value: any) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { [key]: value }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login initiation failed:", error);
      setIsLoggingIn(false);
      setFeedback({ message: "Failed to start login. Check your internet connection.", type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f4f7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#067647] border-t-transparent rounded-full animate-spin mb-4" />
        <h1 className="text-xl font-bold text-[#101828]">JAVED ONLINE</h1>
        <p className="text-[#475467] text-sm">Initializing your mobile dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f2f4f7] flex flex-col items-center justify-center p-8 max-w-md mx-auto shadow-2xl relative overflow-hidden">
        {/* Background Decorative Circles */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#067647]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#067647]/5 rounded-full blur-3xl" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mb-8 shadow-[0_20px_50px_rgba(6,118,71,0.15)] border border-white"
        >
          <div className="w-16 h-16 bg-gradient-to-tr from-[#067647] to-[#08965a] rounded-2xl flex items-center justify-center">
            <ShieldCheck size={36} className="text-white" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <h1 className="text-4xl font-black tracking-tight text-[#101828] mb-3">
            JAVED <span className="text-[#067647]">ONLINE</span>
          </h1>
          <p className="text-[#475467] text-[15px] mb-12 leading-relaxed max-w-[260px] mx-auto font-medium">
            The professional dashboard for labor exam result tracking.
          </p>
        </motion.div>
        
        <motion.button 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-white text-[#344054] py-4 px-6 rounded-2xl font-bold border border-[#d0d5dd] shadow-sm hover:bg-[#F9FAFB] transition-all active:scale-[0.98] group disabled:opacity-70"
        >
          {isLoggingIn ? (
            <RefreshCcw size={20} className="animate-spin text-[#067647]" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" className="mr-1">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          {isLoggingIn ? 'Signing in...' : 'Continue with Google'}
        </motion.button>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 grid grid-cols-3 gap-8 w-full border-t border-[#f2f4f7] pt-8"
        >
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[#ecfdf3] flex items-center justify-center text-[#067647] mb-2">
              <ShieldCheck size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#475467] uppercase">Secure</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[#f0f9ff] flex items-center justify-center text-[#026aa2] mb-2">
              <Clock size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#475467] uppercase">Fast</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[#fef6ee] flex items-center justify-center text-[#b93815] mb-2">
              <Bell size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#475467] uppercase">Live</span>
          </div>
        </motion.div>

        <p className="mt-auto pt-12 text-[10px] uppercase font-bold tracking-[0.2em] text-[#98a2b3]">
          © 2026 JAVED ONLINE • V2.0.4
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f4f7] flex flex-col font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-[#d0d5dd]">
      {/* Header */}
      <header className="bg-[#067647] p-5 pt-6 pb-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex-1 text-center">
          <h1 className="text-[18px] font-black tracking-widest text-white uppercase">JAVED ONLINE</h1>
        </div>
        <button 
          onClick={refreshAllResults}
          disabled={isRefreshing}
          className={cn(
            "absolute right-5 p-2 text-white/80 hover:text-white transition-all",
            isRefreshing && "animate-spin text-white"
          )}
        >
          <RefreshCcw size={18} />
        </button>
      </header>      {/* Main Content Area */}
      <main 
        ref={mainScrollRef}
        className="flex-1 overflow-y-auto p-4 pb-24 relative"
      >
        {/* Toast Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 10 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-0 left-4 right-4 z-50 pointer-events-none"
            >
              <div className={cn(
                "p-3 rounded-xl shadow-lg border flex items-center gap-2",
                feedback.type === 'success' ? "bg-[#ecfdf3] border-[#abefc6] text-[#067647]" : "bg-[#fef3f2] border-[#fee4e2] text-[#b42318]"
              )}>
                {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span className="text-[13px] font-semibold">{feedback.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'results' && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pt-4"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.6}
              onDrag={(e, info) => {
                // Only allow pulling down if at the top of the scroll
                if (mainScrollRef.current && mainScrollRef.current.scrollTop <= 0) {
                  const y = info.offset.y;
                  if (y > 0) {
                    setPullProgress(Math.min(y / 100, 1.2));
                  }
                }
              }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100 && !isRefreshing) {
                  refreshAllResults();
                }
                setPullProgress(0);
              }}
            >
              {/* Pull to Refresh Indicator */}
              <div 
                className="absolute left-0 right-0 -top-8 flex justify-center pointer-events-none"
                style={{ 
                  transform: `translateY(${pullProgress * 60}px)`,
                  opacity: pullProgress
                }}
              >
                <div className="bg-white p-2 rounded-full shadow-lg border border-gray-100">
                  <RefreshCcw 
                    size={16} 
                    className={cn(
                      "text-[#067647]", 
                      pullProgress >= 1 ? "rotate-180" : "",
                      isRefreshing && "animate-spin"
                    )}
                    style={{ 
                      transition: 'transform 0.2s ease',
                      transform: !isRefreshing ? `rotate(${pullProgress * 360}deg)` : undefined
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                  <h2 className="text-[11px] font-bold text-[#475467] uppercase tracking-widest pl-1">Saved Results ({passports.length})</h2>
                  {lastCheck && (
                    <span className="text-[10px] text-[#475467] font-medium italic pl-1">
                      Last Check: {format(lastCheck, 'HH:mm:ss')}
                    </span>
                  )}
                </div>
              </div>

              {passports.length > 0 && (
                <button 
                  onClick={refreshAllResults}
                  disabled={isRefreshing}
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#067647] text-white rounded-2xl font-bold shadow-[0_10px_20px_rgba(6,118,71,0.15)] hover:bg-[#05603a] active:scale-[0.98] transition-all disabled:opacity-70 group border-b-4 border-[#045030]"
                >
                  <div className={cn(
                    "p-2 bg-white/10 rounded-lg transition-transform",
                    isRefreshing && "animate-spin"
                  )}>
                    <RefreshCcw size={18} />
                  </div>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[15px] tracking-tight">Sync Cloud Results</span>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Check all passports for status changes</span>
                  </div>
                </button>
              )}
              
              {passports.length === 0 ? (
                <div className="bg-white border border-[#d0d5dd] rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-[#f2f4f7] rounded-full flex items-center justify-center mb-4">
                    <Search size={32} className="text-[#d0d5dd]" />
                  </div>
                  <h3 className="font-bold text-[#101828] mb-1 text-[15px]">No Entries Yet</h3>
                  <p className="text-[13px] text-[#475467] mb-6">Add a passport number to start tracking.</p>
                  <button 
                    onClick={() => setActiveTab('add')}
                    className="flex items-center justify-center gap-2 bg-[#067647] text-white py-2.5 px-8 rounded-lg font-bold shadow-md text-[13px]"
                  >
                    <Plus size={16} /> Add Passport
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {passports.map((entry) => (
                    <ResultCard key={entry.id} entry={entry} onDelete={() => setDeleteConfirmId(entry.id!)} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[11px] font-bold text-[#475467] uppercase tracking-widest pl-1">Status Logs</h2>
              </div>

              {history.length === 0 ? (
                <div className="bg-white border border-[#d0d5dd] rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-[#f2f4f7] rounded-full flex items-center justify-center mb-4">
                    <History size={32} className="text-[#d0d5dd]" />
                  </div>
                  <h3 className="font-bold text-[#101828] mb-1 text-[15px]">No History Logs</h3>
                  <p className="text-[13px] text-[#475467]">Changes in status will be logged here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((log) => (
                    <div key={log.id} className="bg-white border border-[#d0d5dd] rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-[12px] font-bold text-[#101828]">
                          {log.passportNumber}
                        </div>
                        <div className="text-[10px] text-[#475467] font-medium">
                          {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'dd/MM/yyyy HH:mm') : 'Just now'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 text-center py-1 px-2 rounded bg-gray-50 border border-gray-100 text-[11px] font-semibold text-[#475467]">
                          {log.oldStatus}
                        </div>
                        <ChevronRight size={14} className="text-[#d0d5dd]" />
                        <div className={cn(
                          "flex-1 text-center py-1 px-2 rounded text-[11px] font-bold",
                          log.newStatus === 'Passed' ? "bg-[#ecfdf3] text-[#027a48]" : 
                          log.newStatus === 'Failed' ? "bg-[#fef3f2] text-[#b42318]" : 
                          "bg-[#fffaeb] text-[#b54708]"
                        )}>
                          {log.newStatus}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {hasMoreHistory && (
                    <button 
                      onClick={() => setHistoryLimit(prev => prev + 10)}
                      className="w-full py-3 text-[12px] font-bold text-[#067647] bg-white border border-[#d0d5dd] rounded-xl shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCcw size={14} />
                      Load Older Logs
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
          {activeTab === 'add' && (
            <motion.div 
              key="add"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-[#d0d5dd]"
            >
              <div className="flex items-center gap-2 mb-6 text-[#067647]">
                <Plus size={24} className="font-bold" />
                <h2 className="text-xl font-bold tracking-tight text-[#101828]">Add Passport</h2>
              </div>
              
              <form onSubmit={handleAddPassport} className="space-y-4">
                <div className="field">
                  <label className="block text-[11px] font-bold text-[#475467] uppercase mb-1 ml-1">Passport Number</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., A01234567"
                    className={cn(
                      "w-full bg-white border border-[#d0d5dd] rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-[#067647]/20 outline-none transition-all",
                      formErrors.passport && "border-[#b42318] ring-1 ring-[#b42318]/10"
                    )}
                    value={newPassport}
                    onChange={(e) => {
                      setNewPassport(e.target.value.toUpperCase());
                      if (formErrors.passport) setFormErrors(prev => ({ ...prev, passport: undefined }));
                    }}
                  />
                  {formErrors.passport && (
                    <div className="flex items-center gap-1 mt-1 text-[#b42318] text-[10px] font-bold">
                      <AlertCircle size={10} /> {formErrors.passport}
                    </div>
                  )}
                </div>

                <div className="field">
                  <label className="block text-[11px] font-bold text-[#475467] uppercase mb-1 ml-1">Occupation Code</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., 959101"
                    className={cn(
                      "w-full bg-white border border-[#d0d5dd] rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-[#067647]/20 outline-none transition-all",
                      formErrors.occupation && "border-[#b42318] ring-1 ring-[#b42318]/10"
                    )}
                    value={newOccupation}
                    onChange={(e) => {
                      setNewOccupation(e.target.value);
                      if (formErrors.occupation) setFormErrors(prev => ({ ...prev, occupation: undefined }));
                    }}
                  />
                  {formErrors.occupation && (
                    <div className="flex items-center gap-1 mt-1 text-[#b42318] text-[10px] font-bold">
                      <AlertCircle size={10} /> {formErrors.occupation}
                    </div>
                  )}
                </div>

                <div className="field">
                  <label className="block text-[11px] font-bold text-[#475467] uppercase mb-1 ml-1">Nationality</label>
                  <input 
                    type="text" 
                    readOnly
                    className="w-full bg-[#f9fafb] border border-[#d0d5dd] rounded-lg p-2.5 text-sm font-semibold text-[#999]"
                    value={newNationality}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setActiveTab('results')}
                    className="w-full py-2.5 rounded-lg font-bold text-[#101828] bg-white border border-[#d0d5dd] text-[13px]"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={isRefreshing}
                    type="submit"
                    className="w-full bg-[#067647] text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-[#05603a] transition-all flex items-center justify-center gap-2 text-[13px]"
                  >
                    {isRefreshing ? (
                      <RefreshCcw size={16} className="animate-spin" />
                    ) : (
                      'Add Passport'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#d0d5dd]">
                <div className="flex items-center gap-2 mb-6">
                  <Bell className="text-[#067647]" size={20} />
                  <h2 className="text-lg font-bold text-[#101828]">Notifications</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border-t border-[#f2f4f7] pt-4">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-[#475467]">Frequent Auto-Check</span>
                      {(!prefs.telegramBotToken || !prefs.telegramChatId) && (
                        <span className="text-[9px] text-amber-600 font-bold uppercase mt-1 flex items-center gap-1">
                          <AlertCircle size={10} /> Needs Config
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        if (!prefs.telegramBotToken || !prefs.telegramChatId) {
                          // Visual feedback is provided by the input fields highlighting
                          return;
                        }
                        updatePreference('autoCheckEnabled', !prefs.autoCheckEnabled);
                      }}
                      className={cn(
                        "w-10 h-5 rounded-full p-0.5 transition-all duration-300 relative",
                        prefs.autoCheckEnabled ? "bg-[#067647]" : "bg-[#ccc]",
                        (!prefs.telegramBotToken || !prefs.telegramChatId) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 bg-white rounded-full transition-all duration-300 transform",
                        prefs.autoCheckEnabled ? "translate-x-5" : "translate-x-0"
                      )} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#d0d5dd]">
                <div className="flex items-center gap-2 mb-6">
                  <ExternalLink className="text-[#067647]" size={20} />
                  <h2 className="text-lg font-bold text-[#101828]">Telegram Settings</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="field">
                    <label className="block text-[11px] font-bold text-[#475467] uppercase mb-1 ml-1">Bot Token</label>
                    <input 
                      type="password"
                      className={cn(
                        "w-full bg-white border rounded-lg p-2.5 text-xs font-mono focus:ring-2 outline-none transition-all",
                        prefs.telegramBotToken ? "border-[#d0d5dd] focus:ring-[#067647]/20" : "border-amber-300 bg-amber-50/10 focus:ring-amber-200"
                      )}
                      value={prefs.telegramBotToken || ''}
                      placeholder="Required for notifications"
                      onChange={(e) => updatePreference('telegramBotToken', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="block text-[11px] font-bold text-[#475467] uppercase mb-1 ml-1">Chat ID</label>
                    <input 
                      type="text"
                      className={cn(
                        "w-full bg-white border rounded-lg p-2.5 text-xs font-mono focus:ring-2 outline-none transition-all",
                        prefs.telegramChatId ? "border-[#d0d5dd] focus:ring-[#067647]/20" : "border-amber-300 bg-amber-50/10 focus:ring-amber-200"
                      )}
                      value={prefs.telegramChatId || ''}
                      placeholder="Required for notifications"
                      onChange={(e) => updatePreference('telegramChatId', e.target.value)}
                    />
                  </div>
                  {(!prefs.telegramBotToken || !prefs.telegramChatId) && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                      <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={14} />
                      <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                        Please provide your Bot Token and Chat ID to enable automated background results checking and notifications.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-[#d0d5dd] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <h2 className="text-[13px] font-bold text-[#101828]">Sign Out</h2>
                  <p className="text-[10px] text-[#475467] truncate max-w-[150px]">{user.email}</p>
                </div>
                <button 
                  onClick={logout}
                  className="bg-[#b42318] text-white p-2.5 rounded-lg shadow-md active:scale-95 transition-all"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-[#d0d5dd] px-6 py-3 pb-8 flex justify-between items-center z-40">
        <button 
          onClick={() => setActiveTab('results')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'results' ? "text-[#067647]" : "text-[#475467] opacity-60"
          )}
        >
          <Search size={20} weight={activeTab === 'results' ? "bold" : "regular"} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Results</span>
        </button>

        <button 
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'history' ? "text-[#067647]" : "text-[#475467] opacity-60"
          )}
        >
          <History size={20} weight={activeTab === 'history' ? "fill" : "regular"} />
          <span className="text-[10px] font-bold uppercase tracking-wider">History</span>
        </button>

        <button 
          onClick={() => setActiveTab('add')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'add' ? "text-[#067647]" : "text-[#475467] opacity-60"
          )}
        >
          <Plus size={22} weight={activeTab === 'add' ? "bold" : "regular"} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Add</span>
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'settings' ? "text-[#067647]" : "text-[#475467] opacity-60"
          )}
        >
          <Settings size={20} weight={activeTab === 'settings' ? "fill" : "regular"} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Setup</span>
        </button>
      </nav>

      {/* Overlay Loading */}
      {isRefreshing && activeTab !== 'add' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white px-4 py-2 rounded-full shadow-xl border border-sky-100 flex items-center gap-2"
          >
            <RefreshCcw size={12} className="text-sky-600 animate-spin" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Checking Cloud...</span>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirmId(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#101828]/60 backdrop-blur-sm px-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-[320px] shadow-2xl border border-[#d0d5dd]"
            >
              <div className="w-12 h-12 bg-[#fef3f2] rounded-full flex items-center justify-center mb-4 mx-auto">
                <Trash2 size={24} className="text-[#b42318]" />
              </div>
              <h3 className="text-[16px] font-bold text-[#101828] text-center mb-2">Delete Entry?</h3>
              <p className="text-[13px] text-[#475467] text-center mb-6 leading-relaxed">
                Are you sure you want to delete this entry? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 bg-white border border-[#d0d5dd] rounded-lg text-sm font-bold text-[#344054] hover:bg-[#f9fafb] transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleDelete(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="flex-1 py-2.5 bg-[#b42318] rounded-lg text-sm font-bold text-white shadow-md active:scale-95 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
