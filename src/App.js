import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    addDoc, 
    collection, 
    query, 
    where, 
    onSnapshot,
    Timestamp,
    orderBy,
    limit,
    updateDoc,
    getDocs
} from 'firebase/firestore';
import { Home, Briefcase, User, LogIn, LogOut, PlusCircle, Search, Clock, Award, Users, CheckCircle, Edit, BrainCircuit, X, Send, School, Building, ExternalLink, Bell, MessageCircle, Bot, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// --- Gemini AI API Key ---
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- App Context ---
const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState('home');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [notifications, setNotifications] = useState([]);

    const navigate = (newPage) => {
        window.history.pushState(null, '', `/${newPage}`);
        setPage(newPage);
    };
    
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname;
            const newPage = path.slice(1) || 'home';
            setPage(newPage);
        };
        window.addEventListener('popstate', handlePopState);
        handlePopState();
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userUnsubscribe = onSnapshot(userDocRef, (userDoc) => {
                    if (userDoc.exists()) setUserData(userDoc.data());
                    else setUserData(null); 
                    setLoading(false);
                });

                const notifQuery = query(collection(db, 'notifications'), where('userId', '==', firebaseUser.uid), orderBy('createdAt', 'desc'));
                const notifUnsubscribe = onSnapshot(notifQuery, (snapshot) => {
                    setNotifications(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
                });

                return () => { userUnsubscribe(); notifUnsubscribe(); };
            } else {
                setUser(null); setUserData(null); setNotifications([]); setLoading(false);
            }
        });
        return () => authUnsubscribe();
    }, []);

    const value = { user, userData, loading, page, navigate, showToast, notifications };

    return (
        <AppContext.Provider value={value}>
            {!loading && children}
            <AnimatePresence>
                {toast.show && <Toast message={toast.message} type={toast.type} />}
            </AnimatePresence>
        </AppContext.Provider>
    );
};

const useApp = () => useContext(AppContext);

// --- Main App Component (Router) ---
export default function App() {
    return (<AppProvider><MainContent /></AppProvider>);
}

const MainContent = () => {
    const { page, user, userData, loading } = useApp();
    const path = window.location.pathname;

    if (!loading && user && !userData) {
        const protectedPages = ['dashboard', 'post-gig'];
        const isAccessingProtected = protectedPages.includes(page) || path.startsWith('/gig/') || path.startsWith('/student/');
        
        if (isAccessingProtected) {
            return <RoleSelectionPage />;
        }
    }

    const renderPage = () => {
        if (path.startsWith('/gig/')) return <GigDetailPage gigId={path.split('/')[2]} />;
        if (path.startsWith('/student/')) return <StudentProfilePage studentId={path.split('/')[2]} />;

        switch (page) {
            case 'gigs': return <GigsPage />;
            case 'dashboard': return <DashboardPage />;
            case 'post-gig': return <PostGigPage />;
            case 'login': return <LoginPage />;
            case 'signup': return <SignUpPage />;
            default: return <HomePage />;
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen font-sans flex flex-col">
            <Navbar />
            <main className="pt-16 flex-grow">{renderPage()}</main>
            <Footer />
            <AIChatbot />
        </div>
    );
}

// --- Components ---

const Navbar = () => {
    const { user, userData, navigate, notifications } = useApp();
    const [showNotifications, setShowNotifications] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.read).length;

    const handleSignOut = async () => {
        await signOut(auth);
        navigate('home');
        setIsMobileMenuOpen(false);
    };

    const handlePostGigClick = () => {
        if (user) {
            navigate('post-gig');
        } else {
            navigate('login');
        }
        setIsMobileMenuOpen(false);
    };
    
    const handleNavClick = (page) => {
        navigate(page);
        setIsMobileMenuOpen(false);
    }

    return (
        <nav className="bg-white/80 backdrop-blur-md shadow-md fixed w-full top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex-shrink-0">
                        <button onClick={() => handleNavClick('home')} className="cursor-pointer flex items-center text-2xl font-bold text-blue-600 bg-transparent border-none">
                            <Briefcase className="h-8 w-8 mr-2" /> CampusGig
                        </button>
                    </div>
                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-4">
                        <button onClick={() => handleNavClick('home')} className="text-gray-600 hover:bg-blue-500 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center bg-transparent border-none"><Home className="w-4 h-4 mr-1"/> Home</button>
                        <button onClick={() => handleNavClick('gigs')} className="text-gray-600 hover:bg-blue-500 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center bg-transparent border-none"><Briefcase className="w-4 h-4 mr-1"/> Find Gigs</button>
                        {user && userData?.role === 'client' && (
                            <button onClick={handlePostGigClick} className="text-gray-600 hover:bg-blue-500 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center bg-transparent border-none"><PlusCircle className="w-4 h-4 mr-1"/> Post a Gig</button>
                        )}
                        {user && (
                            <button onClick={() => handleNavClick('dashboard')} className="text-gray-600 hover:bg-blue-500 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center bg-transparent border-none"><User className="w-4 h-4 mr-1"/> Dashboard</button>
                        )}
                        {user ? (
                            <div className="flex items-center space-x-4 ml-6">
                                <div className="relative">
                                    <button onClick={() => setShowNotifications(!showNotifications)} className="text-gray-600 hover:text-blue-600 relative bg-transparent border-none">
                                        <Bell className="w-6 h-6"/>
                                        {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">{unreadCount}</span>}
                                    </button>
                                    <AnimatePresence>
                                        {showNotifications && <NotificationPanel notifications={notifications} onClose={() => setShowNotifications(false)} />}
                                    </AnimatePresence>
                                </div>
                                <button onClick={handleSignOut} className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600 flex items-center">
                                    <LogOut className="w-4 h-4 mr-2" /> Logout
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2 ml-6">
                                <button onClick={() => handleNavClick('login')} className="text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-md text-sm font-medium flex items-center bg-transparent border-none">
                                    <LogIn className="w-4 h-4 mr-2" /> Login
                                </button>
                                <button onClick={() => handleNavClick('signup')} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 cursor-pointer">
                                    Sign Up
                                </button>
                            </div>
                        )}
                    </div>
                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        {user && (
                             <div className="relative mr-2">
                                <button onClick={() => setShowNotifications(!showNotifications)} className="text-gray-600 hover:text-blue-600 relative bg-transparent border-none p-2">
                                    <Bell className="w-6 h-6"/>
                                    {unreadCount > 0 && <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">{unreadCount}</span>}
                                </button>
                                <AnimatePresence>
                                    {showNotifications && <NotificationPanel notifications={notifications} onClose={() => setShowNotifications(false)} />}
                                </AnimatePresence>
                            </div>
                        )}
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100">
                            <span className="sr-only">Open main menu</span>
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>
            {/* Mobile Menu Panel */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white shadow-lg">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            <button onClick={() => handleNavClick('home')} className="text-gray-600 hover:bg-blue-500 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium"><Home className="w-4 h-4 mr-2 inline-block"/>Home</button>
                            <button onClick={() => handleNavClick('gigs')} className="text-gray-600 hover:bg-blue-500 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium"><Briefcase className="w-4 h-4 mr-2 inline-block"/>Find Gigs</button>
                            {user && userData?.role === 'client' && (
                                <button onClick={handlePostGigClick} className="text-gray-600 hover:bg-blue-500 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium"><PlusCircle className="w-4 h-4 mr-2 inline-block"/>Post a Gig</button>
                            )}
                            {user && (
                                <button onClick={() => handleNavClick('dashboard')} className="text-gray-600 hover:bg-blue-500 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium"><User className="w-4 h-4 mr-2 inline-block"/>Dashboard</button>
                            )}
                        </div>
                        <div className="pt-4 pb-3 border-t border-gray-200">
                             {user ? (
                                <div className="px-2">
                                     <button onClick={handleSignOut} className="w-full text-left bg-red-500 text-white px-3 py-2 rounded-md text-base font-medium hover:bg-red-600 flex items-center">
                                        <LogOut className="w-4 h-4 mr-2" /> Logout
                                    </button>
                                </div>
                            ) : (
                                <div className="px-2 space-y-2">
                                    <button onClick={() => handleNavClick('login')} className="w-full text-left text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md text-base font-medium flex items-center">
                                        <LogIn className="w-4 h-4 mr-2" /> Login
                                    </button>
                                    <button onClick={() => handleNavClick('signup')} className="w-full text-left bg-blue-600 text-white px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700">
                                        Sign Up
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

const NotificationPanel = ({ notifications, onClose }) => {
    const { navigate } = useApp();
    const handleNotificationClick = async (notif) => {
        if (!notif.read) {
            await updateDoc(doc(db, 'notifications', notif.id), { read: true });
        }
        navigate(notif.link);
        onClose();
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 border">
            <div className="p-4 font-bold border-b">Notifications</div>
            <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                    <p className="text-gray-500 p-4">No notifications yet.</p>
                ) : (
                    notifications.map(notif => (
                        <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={`p-4 border-b hover:bg-gray-100 cursor-pointer ${!notif.read ? 'bg-blue-50' : ''}`}>
                            <p className="font-semibold">{notif.title}</p>
                            <p className="text-sm text-gray-600">{notif.message}</p>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
};


const GigCard = ({ gig }) => {
    const { navigate } = useApp();
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300">
            <div className="p-6">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{gig.title}</h3>
                    <span className="text-lg font-semibold text-green-600">${gig.budget}</span>
                </div>
                <p className="text-gray-600 mb-4 h-20 overflow-hidden">{gig.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                    {gig.skills.map(skill => (
                        <span key={skill} className="bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">{skill}</span>
                    ))}
                </div>
                <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                    <div className="text-sm text-gray-500 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Posted {new Date(gig.postedAt?.toDate()).toLocaleDateString()}
                    </div>
                    <button onClick={() => navigate(`gig/${gig.id}`)} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                        View Details
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const ProposalCard = ({ proposal, onAccept, onEdit, isGigOpen }) => {
    const [studentData, setStudentData] = useState(null);
    const { navigate, user } = useApp();

    useEffect(() => {
        const fetchStudentData = async () => {
            const studentDoc = await getDoc(doc(db, 'users', proposal.studentId));
            if(studentDoc.exists()) {
                setStudentData(studentDoc.data());
            }
        }
        fetchStudentData();
    }, [proposal.studentId]);

    if (!studentData) return <div className="bg-white p-4 rounded-lg shadow animate-pulse h-24"></div>;

    return (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-2">
                <button onClick={() => navigate(`student/${proposal.studentId}`)} className="font-bold text-lg text-blue-600 hover:underline cursor-pointer bg-transparent border-none text-left p-0">
                    {studentData.name}
                </button>
                <span className="text-green-600 font-semibold">${proposal.bidAmount}</span>
            </div>
            <p className="text-gray-600 mb-3">{proposal.coverLetter}</p>
            <div className="flex flex-wrap gap-2 mb-4">
                {studentData.skills?.map(skill => (
                    <span key={skill} className="bg-gray-200 text-gray-800 text-xs font-semibold px-2 py-1 rounded-full">{skill}</span>
                ))}
            </div>
            <div className="border-t pt-3 flex justify-end space-x-2">
                {user?.uid === proposal.studentId && proposal.status === 'pending' && (
                     <button onClick={() => onEdit(proposal)} className="bg-yellow-500 text-white px-4 py-1 rounded-md hover:bg-yellow-600 flex items-center">
                        <Edit className="w-4 h-4 mr-1"/> Edit
                    </button>
                )}
                {user?.uid === proposal.studentId && proposal.status === 'accepted' && (
                     <button onClick={() => navigate(`gig/${proposal.gigId}`)} className="bg-green-600 text-white px-4 py-1 rounded-md hover:bg-green-700 flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1"/> View Gig & Chat
                    </button>
                )}
                {isGigOpen && proposal.status === 'pending' && onAccept && (
                    <button onClick={() => onAccept(proposal)} className="bg-green-500 text-white px-4 py-1 rounded-md hover:bg-green-600 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1"/> Accept
                    </button>
                )}
                {proposal.status === 'accepted' && !onAccept && (
                    <span className="text-green-600 font-bold flex items-center"><Award className="w-5 h-5 mr-2"/> Accepted</span>
                )}
            </div>
        </div>
    )
}

const Toast = ({ message, type }) => {
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    return (
        <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-5 right-5 text-white px-6 py-3 rounded-lg shadow-lg z-[100] ${bgColor}`}>
            {message}
        </motion.div>
    );
};

const Footer = () => {
    return (
        <footer className="bg-gray-800 text-white mt-12">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h3 className="text-lg font-bold mb-2">CampusGig</h3>
                        <p className="text-gray-400">Connecting students with opportunities.</p>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold mb-2">Contact Us</h3>
                        <p className="text-gray-400">Have questions? We'd love to hear from you.</p>
                        <a href="mailto:campusgigcom@gmail.com" className="text-blue-400 hover:underline">campusgigcom@gmail.com</a>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold mb-2">About Us</h3>
                        <p className="text-gray-400">CampusGig is a platform dedicated to helping college students gain real-world experience and earn money by connecting them with clients who need their skills.</p>
                    </div>
                </div>
                <div className="mt-8 border-t border-gray-700 pt-4 text-center text-gray-500">
                    &copy; {new Date().getFullYear()} CampusGig. All rights reserved.
                </div>
            </div>
        </footer>
    );
};


// --- Pages ---

const HomePage = () => {
    const [latestGigs, setLatestGigs] = useState([]);
    const { navigate, user } = useApp();
    
    const handlePostGigClick = () => {
        if (user) {
            navigate('post-gig');
        } else {
            navigate('login');
        }
    };

    useEffect(() => {
        const q = query(collection(db, 'gigs'), where('status', '==', 'open'), orderBy('postedAt', 'desc'), limit(3));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const gigsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLatestGigs(gigsData);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div>
            <div className="relative bg-gray-800 text-white overflow-hidden">
                <div className="absolute inset-0">
                    <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop" alt="Students collaborating" className="w-full h-full object-cover opacity-30"/>
                </div>
                <div className="relative max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 text-center">
                    <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-4xl md:text-6xl font-extrabold tracking-tight">Find Your Next College Gig</motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="mt-4 text-lg md:text-xl max-w-3xl mx-auto">The #1 marketplace connecting talented college students with clients who need their skills.</motion.p>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="mt-8 flex justify-center space-x-4">
                        <button onClick={() => navigate('gigs')} className="bg-white text-blue-600 px-8 py-3 rounded-md text-lg font-semibold hover:bg-blue-50">Browse Gigs</button>
                        <button onClick={handlePostGigClick} className="border-2 border-white text-white px-8 py-3 rounded-md text-lg font-semibold hover:bg-white hover:text-blue-600">Post a Gig</button>
                    </motion.div>
                </div>
            </div>
            <div className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">How It Works</h2>
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5 }} className="p-6"><PlusCircle className="w-16 h-16 mx-auto text-blue-600 mb-4" /><h3 className="text-xl font-semibold mb-2">1. Post a Gig</h3><p className="text-gray-600">Clients post job opportunities with detailed descriptions and budgets.</p></motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: 0.2 }} className="p-6"><Search className="w-16 h-16 mx-auto text-blue-600 mb-4" /><h3 className="text-xl font-semibold mb-2">2. Find Talent</h3><p className="text-gray-600">Students apply with their best proposals to showcase their skills.</p></motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: 0.4 }} className="p-6"><Award className="w-16 h-16 mx-auto text-blue-600 mb-4" /><h3 className="text-xl font-semibold mb-2">3. Collaborate</h3><p className="text-gray-600">Clients hire the best student talent and get work done.</p></motion.div>
                    </div>
                </div>
            </div>
            <div className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">Latest Gigs</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {latestGigs.map(gig => <GigCard key={gig.id} gig={gig} />)}
                    </div>
                </div>
            </div>
        </div>
    );
};

const GigsPage = () => {
    const [gigs, setGigs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'gigs'), where('status', '==', 'open'), orderBy('postedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const gigsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGigs(gigsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    const filteredGigs = gigs.filter(gig => 
        gig.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gig.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gig.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Find a Gig</h1>
            <p className="text-lg text-gray-600 mb-8">Browse through hundreds of opportunities perfect for your skills.</p>
            <div className="mb-8"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search by title, skill, or keyword..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"/></div></div>
            {loading ? (<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">{[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-lg shadow-lg h-64 animate-pulse"></div>)}</div>) : (<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">{filteredGigs.length > 0 ? (filteredGigs.map(gig => <GigCard key={gig.id} gig={gig} />)) : (<p className="text-center col-span-full text-gray-500">No gigs found matching your search.</p>)}</div>)}
        </div>
    );
};

const GigDetailPage = ({ gigId }) => {
    const [gig, setGig] = useState(null);
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditingGig, setIsEditingGig] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [acceptedStudent, setAcceptedStudent] = useState(null);
    const { user, userData, showToast, navigate } = useApp();

    useEffect(() => {
        const gigDocRef = doc(db, 'gigs', gigId);
        const unsubscribeGig = onSnapshot(gigDocRef, async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const gigData = { id: docSnapshot.id, ...docSnapshot.data() };
                setGig(gigData);
                if (gigData.status === 'in-progress' && gigData.acceptedStudentId) {
                    const studentDocSnap = await getDoc(doc(db, 'users', gigData.acceptedStudentId));
                    if(studentDocSnap.exists()) setAcceptedStudent(studentDocSnap.data());
                }
            }
            setLoading(false);
        });
        const proposalsQuery = query(collection(db, 'proposals'), where('gigId', '==', gigId));
        const unsubscribeProposals = onSnapshot(proposalsQuery, (snapshot) => {
            setProposals(snapshot.docs.map(pDoc => ({ id: pDoc.id, ...pDoc.data() })));
        });
        return () => { unsubscribeGig(); unsubscribeProposals(); };
    }, [gigId]);

    const handleAcceptProposal = async (proposalToAccept) => {
        if (gig.status !== 'open') return showToast("This gig is no longer open.", "error");
        try {
            await addDoc(collection(db, 'notifications'), { userId: proposalToAccept.studentId, title: 'Proposal Accepted!', message: `Congratulations! Your proposal for "${gig.title}" was accepted.`, link: `gig/${gigId}`, read: false, createdAt: Timestamp.now() });
            const gigDocRef = doc(db, 'gigs', gigId);
            await updateDoc(gigDocRef, { status: 'in-progress', acceptedStudentId: proposalToAccept.studentId, finalBid: proposalToAccept.bidAmount });
            const proposalDocRef = doc(db, 'proposals', proposalToAccept.id);
            await updateDoc(proposalDocRef, { status: 'accepted' });
            showToast("Proposal accepted! The student has been notified.");
        } catch (error) { console.error("Error accepting proposal: ", error); showToast("Failed to accept proposal.", "error"); }
    }

    const isProfileComplete = () => {
        return userData && userData.bio && userData.skills?.length > 0 && userData.phone;
    };

    if (loading) return <div className="text-center py-20">Loading...</div>;
    if (!gig) return <div className="text-center py-20">Gig not found.</div>;

    const isGigOpen = gig.status === 'open';
    const isOwner = userData?.role === 'client' && gig.clientId === user.uid;
    const isAcceptedStudent = user?.uid === gig.acceptedStudentId;

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            {isEditingGig && <EditGigModal gig={gig} onClose={() => setIsEditingGig(false)} />}
            {showChat && <ChatModal gig={gig} onClose={() => setShowChat(false)} />}
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-lg shadow-md">
                    <div className="flex justify-between items-start mb-4"><h1 className="text-3xl font-bold text-gray-900">{gig.title}</h1><span className="text-3xl font-bold text-green-600">${gig.budget}</span></div>
                    {!isGigOpen && (<div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg font-semibold">This gig is currently {gig.status}.</div>)}
                    <div className="text-sm text-gray-500 mb-6">Posted by {gig.clientName || 'A client'} on {new Date(gig.postedAt?.toDate()).toLocaleDateString()}</div>
                    {isOwner && isGigOpen && <button onClick={() => setIsEditingGig(true)} className="mb-4 bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center"><Edit className="w-4 h-4 mr-2"/> Edit Gig</button>}
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Description</h2><p className="text-gray-600 whitespace-pre-wrap mb-6">{gig.description}</p>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Required Skills</h2><div className="flex flex-wrap gap-2">{gig.skills.map(skill => (<span key={skill} className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">{skill}</span>))}</div>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    {isOwner && !isGigOpen && acceptedStudent && (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold mb-4">Contact Information</h2>
                            <p><strong>Name:</strong> {acceptedStudent.name}</p>
                            <p><strong>Email:</strong> {acceptedStudent.email}</p>
                            <p><strong>Phone:</strong> {acceptedStudent.phone || 'Not provided'}</p>
                            <button onClick={() => setShowChat(true)} className="mt-4 w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 flex items-center justify-center"><MessageCircle className="w-5 h-5 mr-2"/> View Chat</button>
                        </div>
                    )}
                    {isAcceptedStudent && (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold mb-4">Contact Information</h2>
                            <p><strong>Client:</strong> {gig.clientName}</p>
                            <p><strong>Email:</strong> {userData.email}</p>
                            <p><strong>Phone:</strong> {userData.phone || 'Not provided'}</p>
                            <button onClick={() => setShowChat(true)} className="mt-4 w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 flex items-center justify-center"><MessageCircle className="w-5 h-5 mr-2"/> View Chat</button>
                        </div>
                    )}
                    {userData?.role === 'student' && isGigOpen && (
                        isProfileComplete() ? <ProposalForm gigId={gigId} proposals={proposals} /> : <CompleteProfilePrompt navigate={navigate} />
                    )}
                    {isOwner && (<div className="bg-white p-6 rounded-lg shadow-md"><h2 className="text-xl font-bold mb-4 flex items-center"><Users className="w-6 h-6 mr-2"/> Proposals ({proposals.length})</h2><div className="space-y-4">{proposals.length > 0 ? (proposals.map(p => <ProposalCard key={p.id} proposal={p} onAccept={handleAcceptProposal} isGigOpen={isGigOpen} />)) : (<p className="text-gray-500">No proposals yet.</p>)}</div></div>)}
                </div>
            </div>
        </div>
    );
};

const CompleteProfilePrompt = ({ navigate }) => (
    <div className="bg-orange-100 p-6 rounded-lg shadow-md text-center">
        <h2 className="text-xl font-bold text-orange-800">Complete Your Profile!</h2>
        <p className="text-orange-700 mt-2 mb-4">You must complete your profile (including bio, skills, and phone number) before you can apply for gigs.</p>
        <button onClick={() => navigate('dashboard')} className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600">Go to Dashboard</button>
    </div>
);

const ProposalForm = ({ gigId, proposals }) => {
    const [coverLetter, setCoverLetter] = useState('');
    const [bidAmount, setBidAmount] = useState('');
    const { user, showToast } = useApp();
    const userHasProposed = proposals.some(p => p.studentId === user?.uid);

    const handleProposalSubmit = async (e) => {
        e.preventDefault();
        if (!user || !coverLetter || !bidAmount) return showToast("Please fill all fields.", "error");
        try {
            await addDoc(collection(db, 'proposals'), { gigId, studentId: user.uid, coverLetter, bidAmount: Number(bidAmount), status: 'pending', submittedAt: Timestamp.now() });
            setCoverLetter(''); setBidAmount('');
            showToast("Proposal submitted successfully!");
        } catch (error) { console.error("Error submitting proposal: ", error); showToast("Failed to submit proposal.", "error"); }
    };

    if (userHasProposed) {
        return (
            <div className="bg-green-100 p-6 rounded-lg shadow-md text-center">
                <h2 className="text-xl font-bold text-green-800">Proposal Submitted!</h2>
                <p className="text-green-700 mt-2">The client will be notified.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Submit a Proposal</h2>
            <form onSubmit={handleProposalSubmit}>
                <div className="mb-4">
                    <label htmlFor="bid" className="block text-sm font-medium text-gray-700">Your Bid ($)</label>
                    <input type="number" id="bid" value={bidAmount} onChange={e => setBidAmount(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div className="mb-4">
                    <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700">Cover Letter</label>
                    <textarea id="coverLetter" rows="5" value={coverLetter} onChange={e => setCoverLetter(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required></textarea>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Submit Proposal</button>
            </form>
        </div>
    );
};


const DashboardPage = () => {
    const { user, userData } = useApp();
    const [allMyGigs, setAllMyGigs] = useState([]);
    const [myProposals, setMyProposals] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [isAiBuilderOpen, setIsAiBuilderOpen] = useState(false);
    const [editingProposal, setEditingProposal] = useState(null);
    const [gigFilter, setGigFilter] = useState('all'); // 'all', 'open', 'in-progress'

    useEffect(() => {
        if (!user || !userData) return;
        if (userData.role === 'client') {
            const q = query(collection(db, 'gigs'), where('clientId', '==', user.uid), orderBy('postedAt', 'desc'));
            const unsub = onSnapshot(q, (snap) => setAllMyGigs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            return () => unsub();
        }
        if (userData.role === 'student') {
            const q = query(collection(db, 'proposals'), where('studentId', '==', user.uid), orderBy('submittedAt', 'desc'));
            const unsub = onSnapshot(q, async (snap) => {
                const data = await Promise.all(snap.docs.map(async pDoc => {
                    const p = { id: pDoc.id, ...pDoc.data() };
                    const gigDoc = await getDoc(doc(db, 'gigs', p.gigId));
                    return { ...p, gig: gigDoc.exists() ? { id: gigDoc.id, ...gigDoc.data() } : { title: 'Gig not found' } };
                }));
                setMyProposals(data);
            });
            return () => unsub();
        }
    }, [user, userData]);
    
    const filteredGigs = allMyGigs.filter(gig => {
        if (gigFilter === 'all') return true;
        return gig.status === gigFilter;
    });

    if (!user || !userData) return <div className="text-center py-20">Please log in to view your dashboard.</div>;

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard</h1>
                    <p className="text-lg text-gray-600">Welcome back, {userData.name}!</p>
                </div>
                {userData.role === 'student' && (
                    <div className="flex space-x-2">
                         <button onClick={() => setIsAiBuilderOpen(true)} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center"><BrainCircuit className="w-5 h-5 mr-2"/> AI Profile Maker</button>
                         <button onClick={() => setIsEditing(!isEditing)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"><Edit className="w-5 h-5 mr-2"/> {isEditing ? 'View Dashboard' : 'Edit Profile'}</button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <ProfileEditForm userData={userData} onSave={() => setIsEditing(false)} />
            ) : (
                <>
                    {userData.role === 'client' && (
                        <div>
                            <div className="flex space-x-2 mb-4 border-b">
                                <button onClick={() => setGigFilter('all')} className={`py-2 px-4 font-semibold ${gigFilter === 'all' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>All My Gigs</button>
                                <button onClick={() => setGigFilter('open')} className={`py-2 px-4 font-semibold ${gigFilter === 'open' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Open</button>
                                <button onClick={() => setGigFilter('in-progress')} className={`py-2 px-4 font-semibold ${gigFilter === 'in-progress' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>In Progress</button>
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
                                {filteredGigs.length > 0 ? (filteredGigs.map(gig => <GigCard key={gig.id} gig={gig} />)) : (<p className="col-span-full">You don't have any gigs in this category.</p>)}
                            </div>
                        </div>
                    )}
                    {userData.role === 'student' && (
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-700 mb-4">My Proposals</h2>
                            <div className="space-y-4">
                                {myProposals.length > 0 ? (
                                    myProposals.map(p => <ProposalCard key={p.id} proposal={p} onEdit={setEditingProposal} />)
                                ) : (
                                    <p>You haven't submitted any proposals yet.</p>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {isAiBuilderOpen && <AIResumeBuilder onClose={() => setIsAiBuilderOpen(false)} />}
            {editingProposal && <EditProposalModal proposal={editingProposal} onClose={() => setEditingProposal(null)} />}
        </div>
    );
};

const StudentProfilePage = ({ studentId }) => {
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudent = async () => {
            const studentDoc = await getDoc(doc(db, 'users', studentId));
            if (studentDoc.exists()) {
                setStudent(studentDoc.data());
            }
            setLoading(false);
        };
        fetchStudent();
    }, [studentId]);

    if (loading) return <div className="text-center py-20">Loading Profile...</div>;
    if (!student) return <div className="text-center py-20">Student not found.</div>;

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-xl p-8">
                <div className="flex items-center space-x-6 mb-8">
                    <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                        {student.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900">{student.name}</h1>
                        <p className="text-gray-600">{student.email}</p>
                        {student.portfolio && <a href={student.portfolio} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center"><ExternalLink className="w-4 h-4 mr-1"/> View Portfolio</a>}
                    </div>
                </div>

                <div className="space-y-8">
                    <div><h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-4">About Me</h2><p className="text-gray-700 whitespace-pre-wrap">{student.bio || 'No bio provided.'}</p></div>
                    <div><h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-4">Skills</h2><div className="flex flex-wrap gap-2">{student.skills?.length > 0 ? student.skills.map(s => <span key={s} className="bg-blue-100 text-blue-800 text-md font-semibold px-4 py-1 rounded-full">{s}</span>) : <p>No skills listed.</p>}</div></div>
                    <div><h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-4">Experience</h2>{student.experience?.length > 0 ? student.experience.map((exp, i) => (<div key={i} className="mb-4"><div className="flex items-center mb-1"><Building className="w-5 h-5 mr-2 text-gray-600"/><h3 className="font-bold text-lg">{exp.title} at {exp.company}</h3></div><p className="text-gray-600 ml-7">{exp.duration}</p><p className="text-gray-700 ml-7 mt-1">{exp.description}</p></div>)) : <p>No experience listed.</p>}</div>
                    <div><h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-4">Education</h2>{student.education?.length > 0 ? student.education.map((edu, i) => (<div key={i} className="mb-4"><div className="flex items-center mb-1"><School className="w-5 h-5 mr-2 text-gray-600"/><h3 className="font-bold text-lg">{edu.degree} from {edu.school}</h3></div><p className="text-gray-600 ml-7">{edu.year}</p></div>)) : <p>No education listed.</p>}</div>
                </div>
            </div>
        </div>
    );
};

const ProfileEditForm = ({ userData, onSave }) => {
    const [formData, setFormData] = useState({
        name: userData.name || '',
        phone: userData.phone || '',
        bio: userData.bio || '',
        skills: userData.skills?.join(', ') || '',
        portfolio: userData.portfolio || '',
        experience: userData.experience?.length > 0 ? userData.experience : [{ title: '', company: '', duration: '', description: '' }],
        education: userData.education?.length > 0 ? userData.education : [{ school: '', degree: '', year: '' }],
    });
    const { user, showToast } = useApp();

    const handleChange = (e, section, index) => {
        if (section) {
            const newSectionData = [...formData[section]];
            newSectionData[index][e.target.name] = e.target.value;
            setFormData({ ...formData, [section]: newSectionData });
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };
    
    const addField = (section) => {
        const newField = section === 'experience' 
            ? { title: '', company: '', duration: '', description: '' }
            : { school: '', degree: '', year: '' };
        setFormData({ ...formData, [section]: [...formData[section], newField] });
    };

    const handleSave = async () => {
        const userDocRef = doc(db, 'users', user.uid);
        try {
            await updateDoc(userDocRef, {
                ...formData,
                skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
            });
            showToast('Profile updated successfully!');
            onSave();
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast('Failed to update profile.', 'error');
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Edit Your Profile</h2>
            <div className="space-y-6">
                <div><label className="block font-medium">Full Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md"/></div>
                <div><label className="block font-medium">Phone Number</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md"/></div>
                <div><label className="block font-medium">Portfolio Link</label><input type="text" name="portfolio" value={formData.portfolio} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md"/></div>
                <div><label className="block font-medium">About Me</label><textarea name="bio" value={formData.bio} onChange={handleChange} rows="4" className="w-full mt-1 p-2 border rounded-md"></textarea></div>
                <div><label className="block font-medium">Skills (comma-separated)</label><input type="text" name="skills" value={formData.skills} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md"/></div>
                
                <div><h3 className="text-xl font-semibold mb-2">Experience</h3>{formData.experience.map((exp, i) => (<div key={i} className="space-y-2 border p-4 rounded-md mb-4"><input type="text" name="title" placeholder="Job Title" value={exp.title} onChange={e => handleChange(e, 'experience', i)} className="w-full p-2 border rounded-md"/><input type="text" name="company" placeholder="Company" value={exp.company} onChange={e => handleChange(e, 'experience', i)} className="w-full p-2 border rounded-md"/><input type="text" name="duration" placeholder="e.g., Jan 2022 - Present" value={exp.duration} onChange={e => handleChange(e, 'experience', i)} className="w-full p-2 border rounded-md"/><textarea name="description" placeholder="Description" value={exp.description} onChange={e => handleChange(e, 'experience', i)} className="w-full p-2 border rounded-md"></textarea></div>))}<button onClick={() => addField('experience')} className="text-sm text-blue-600">+ Add Experience</button></div>
                <div><h3 className="text-xl font-semibold mb-2">Education</h3>{formData.education.map((edu, i) => (<div key={i} className="space-y-2 border p-4 rounded-md mb-4"><input type="text" name="school" placeholder="School/University" value={edu.school} onChange={e => handleChange(e, 'education', i)} className="w-full p-2 border rounded-md"/><input type="text" name="degree" placeholder="Degree" value={edu.degree} onChange={e => handleChange(e, 'education', i)} className="w-full p-2 border rounded-md"/><input type="text" name="year" placeholder="Year of Completion" value={edu.year} onChange={e => handleChange(e, 'education', i)} className="w-full p-2 border rounded-md"/></div>))}<button onClick={() => addField('education')} className="text-sm text-blue-600">+ Add Education</button></div>

                <button onClick={handleSave} className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">Save Profile</button>
            </div>
        </div>
    );
};

const AIResumeBuilder = ({ onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useApp();

    const generateContent = async () => {
        if (!prompt) return showToast("Please enter a prompt.", "error");
        setLoading(true);
        setResult('');
        try {
            const fullPrompt = `As a career coach, rewrite the following user request into a professional resume section. Make it concise and impactful.\n\nUser request: "${prompt}"\n\nProfessional Version:`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
            });
            if (!response.ok) throw new Error(`API error: ${response.statusText}`);
            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            setResult(text);
        } catch (error) {
            console.error("AI generation failed:", error);
            showToast("Failed to generate content. Check your API key.", "error");
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold flex items-center"><BrainCircuit className="mr-2 text-purple-600"/> AI Profile Maker</h2>
                    <button onClick={onClose}><X className="w-6 h-6"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-gray-600">Need help writing your bio or experience? Type a simple request below and let AI polish it for you.</p>
                    <div>
                        <label className="font-medium">Your Request</label>
                        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., write a bio for a react developer with 1 year of experience" rows="3" className="w-full mt-1 p-2 border rounded-md"></textarea>
                    </div>
                    <button onClick={generateContent} disabled={loading} className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 flex items-center justify-center disabled:bg-gray-400">
                        {loading ? 'Generating...' : <><Send className="w-4 h-4 mr-2"/> Generate</>}
                    </button>
                    {result && (
                        <div className="bg-gray-100 p-4 rounded-md">
                            <h3 className="font-semibold mb-2">AI Generated Result:</h3>
                            <p className="text-gray-800 whitespace-pre-wrap">{result}</p>
                            <button onClick={() => navigator.clipboard.writeText(result).then(() => showToast('Copied to clipboard!'))} className="mt-2 text-sm text-blue-600">Copy Text</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const EditGigModal = ({ gig, onClose }) => {
    const [formData, setFormData] = useState({
        title: gig.title,
        description: gig.description,
        skills: gig.skills.join(', '),
        budget: gig.budget,
    });
    const { showToast } = useApp();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await updateDoc(doc(db, 'gigs', gig.id), {
                ...formData,
                skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
                budget: Number(formData.budget),
            });
            showToast("Gig updated successfully!");
            onClose();
        } catch (error) {
            showToast("Failed to update gig.", "error");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl"><div className="p-6 border-b flex justify-between items-center"><h2 className="text-2xl font-bold">Edit Gig</h2><button onClick={onClose}><X className="w-6 h-6"/></button></div><form onSubmit={handleSave} className="p-6 space-y-4"><div><label>Title</label><input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md"/></div><div><label>Description</label><textarea name="description" value={formData.description} onChange={handleChange} rows="4" className="w-full mt-1 p-2 border rounded-md"></textarea></div><div><label>Skills (comma-separated)</label><input type="text" name="skills" value={formData.skills} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md"/></div><div><label>Budget ($)</label><input type="number" name="budget" value={formData.budget} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md"/></div><button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Save Changes</button></form></div>
        </div>
    );
};

const EditProposalModal = ({ proposal, onClose }) => {
    const [formData, setFormData] = useState({
        coverLetter: proposal.coverLetter,
        bidAmount: proposal.bidAmount,
    });
    const { showToast } = useApp();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await updateDoc(doc(db, 'proposals', proposal.id), {
                ...formData,
                bidAmount: Number(formData.bidAmount),
            });
            showToast("Proposal updated successfully!");
            onClose();
        } catch (error) {
            showToast("Failed to update proposal.", "error");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl"><div className="p-6 border-b flex justify-between items-center"><h2 className="text-2xl font-bold">Edit Proposal</h2><button onClick={onClose}><X className="w-6 h-6"/></button></div><form onSubmit={handleSave} className="p-6 space-y-4"><div><label>Cover Letter</label><textarea name="coverLetter" value={formData.coverLetter} onChange={handleChange} rows="5" className="w-full mt-1 p-2 border rounded-md"></textarea></div><div><label>Bid Amount ($)</label><input type="number" name="bidAmount" value={formData.bidAmount} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md"/></div><button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Save Changes</button></form></div>
        </div>
    );
};

const ChatModal = ({ gig, onClose }) => {
    const { user, userData, showToast } = useApp();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    
    const chatId = [gig.clientId, gig.acceptedStudentId].sort().join('_');

    useEffect(() => {
        const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            setMessages(snapshot.docs.map(messageDoc => messageDoc.data()));
        });
        return unsubscribe;
    }, [chatId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: newMessage,
                senderId: user.uid,
                senderName: userData.name,
                createdAt: Timestamp.now(),
            });
            setNewMessage('');
        } catch (error) {
            showToast("Failed to send message.", "error");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[70vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Chat for "{gig.title}"</h2>
                    <button onClick={onClose}><X className="w-6 h-6"/></button>
                </div>
                <div className="flex-grow p-4 overflow-y-auto bg-gray-100">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex mb-3 ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`rounded-lg px-4 py-2 max-w-xs ${msg.senderId === user.uid ? 'bg-blue-600 text-white' : 'bg-gray-300 text-black'}`}>
                                <p className="font-bold text-sm">{msg.senderName}</p>
                                <p>{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t flex">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-grow p-2 border rounded-l-md" placeholder="Type a message..."/>
                    <button type="submit" className="bg-blue-600 text-white px-4 rounded-r-md"><Send/></button>
                </form>
            </div>
        </div>
    );
};


const PostGigPage = () => {
    const { user, userData, showToast, navigate } = useApp();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [skills, setSkills] = useState('');
    const [budget, setBudget] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user || !userData) {
            showToast("You must be logged in to post a gig.", "error");
            navigate('login');
            return;
        }
        try {
            await addDoc(collection(db, 'gigs'), { 
                clientId: user.uid, 
                clientName: userData.name, 
                title, 
                description, 
                skills: skills.split(',').map(s => s.trim()).filter(Boolean), 
                budget: Number(budget), 
                postedAt: Timestamp.now(), 
                status: 'open' 
            });
            showToast('Gig posted successfully!');
            navigate('dashboard');
        } catch (error) { 
            console.error("Error posting gig: ", error); 
            showToast("Failed to post gig.", "error"); 
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8"><div className="bg-white p-8 rounded-lg shadow-lg"><h1 className="text-3xl font-bold text-gray-800 mb-6">Post a New Gig</h1><form onSubmit={handleSubmit} className="space-y-6"><div><label htmlFor="title" className="block text-sm font-medium text-gray-700">Gig Title</label><input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required /></div><div><label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label><textarea id="description" rows="6" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required></textarea></div><div><label htmlFor="skills" className="block text-sm font-medium text-gray-700">Required Skills (comma-separated)</label><input type="text" id="skills" value={skills} onChange={e => setSkills(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required /></div><div><label htmlFor="budget" className="block text-sm font-medium text-gray-700">Budget ($)</label><input type="number" id="budget" value={budget} onChange={e => setBudget(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required /></div><div><button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-semibold">Post Gig</button></div></form></div></div>
    );
};

const AuthForm = ({ isLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('student');
    const [error, setError] = useState('');
    const { navigate } = useApp();

    const handleEmailPasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                navigate('home');
            } else {
                if (!name || !role) return setError("Please provide your name and select a role.");
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                const newUser = { uid: user.uid, email: user.email, name, role, createdAt: Timestamp.now(), skills: [], portfolio: '', bio: '', experience: [], education: [], phone: '' };
                await setDoc(doc(db, 'users', user.uid), newUser);
                navigate('dashboard');
            }
        } catch (err) { setError(err.message); }
    };

    const handleGoogleSignIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            navigate('home');
        } catch (err) { setError(err.message); }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"><div className="max-w-md w-full space-y-8"><div><h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">{isLogin ? 'Sign in to your account' : 'Create a new account'}</h2></div><div className="bg-white p-8 rounded-xl shadow-lg space-y-6"><button onClick={handleGoogleSignIn} className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Sign in with Google</button><div className="flex items-center justify-center"><div className="border-t border-gray-300 w-full"></div><p className="px-2 text-sm text-gray-500 bg-white">OR</p><div className="border-t border-gray-300 w-full"></div></div><form className="space-y-6" onSubmit={handleEmailPasswordSubmit}>{!isLogin && (<><div><label htmlFor="name" className="sr-only">Full Name</label><input id="name" name="name" type="text" required value={name} onChange={e => setName(e.target.value)} className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Full Name" /></div><div className="flex justify-around"><label className="flex items-center"><input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" /><span className="ml-2 text-gray-700">I'm a Student</span></label><label className="flex items-center"><input type="radio" name="role" value="client" checked={role === 'client'} onChange={() => setRole('client')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" /><span className="ml-2 text-gray-700">I'm a Client</span></label></div></>)}<div><label htmlFor="email-address" className="sr-only">Email address</label><input id="email-address" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Email address" /></div><div><label htmlFor="password" className="sr-only">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Password" /></div>{error && <p className="text-red-500 text-sm">{error}</p>}<div><button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{isLogin ? 'Sign in' : 'Sign up'}</button></div></form></div><p className="text-center text-sm text-gray-600">{isLogin ? "Don't have an account? " : "Already have an account? "}<button onClick={() => navigate(isLogin ? 'signup' : 'login')} className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer bg-transparent border-none p-0">{isLogin ? 'Sign up' : 'Sign in'}</button></p></div></div>
    );
};

const RoleSelectionPage = () => {
    const { user, navigate } = useApp();
    const [loading, setLoading] = useState(false);

    const handleRoleSelect = async (role) => {
        setLoading(true);
        const userRef = doc(db, 'users', user.uid);
        const newUser = {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            role: role,
            createdAt: Timestamp.now(),
            skills: [], portfolio: '', bio: '', experience: [], education: [], phone: ''
        };
        await setDoc(userRef, newUser);
        
        if (role === 'student') {
            navigate('dashboard');
        } else {
            navigate('home');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                <h1 className="text-2xl font-bold mb-4">Welcome to CampusGig!</h1>
                <p className="text-gray-600 mb-6">To get started, please tell us who you are.</p>
                <div className="flex justify-center space-x-4">
                    <button onClick={() => handleRoleSelect('student')} disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-md text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400">I'm a Student</button>
                    <button onClick={() => handleRoleSelect('client')} disabled={loading} className="bg-green-600 text-white px-6 py-3 rounded-md text-lg font-semibold hover:bg-green-700 disabled:bg-gray-400">I'm a Client</button>
                </div>
            </div>
        </div>
    );
};

const LoginPage = () => <AuthForm isLogin={true} />;
const SignUpPage = () => <AuthForm isLogin={false} />;

const AIChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{ sender: 'ai', text: 'Hello! How can I help you navigate CampusGig today?' }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [knowledgeBase, setKnowledgeBase] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (isOpen && !knowledgeBase) {
            const fetchKnowledge = async () => {
                try {
                    const querySnapshot = await getDocs(collection(db, "chatbot_knowledge"));
                    const knowledge = querySnapshot.docs.map(knowledgeDoc => `- ${knowledgeDoc.data().text}`).join('\n');
                    setKnowledgeBase(knowledge);
                } catch (error) {
                    console.error("Error fetching chatbot knowledge:", error);
                }
            };
            fetchKnowledge();
        }
    }, [isOpen, knowledgeBase]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const fullPrompt = `You are the CampusGig AI Assistant. Your goal is to help users with their questions about the platform. Use the following information to answer the user's query. If the query is unrelated to CampusGig or you cannot find an answer in the provided information, politely tell them you can't help with that and suggest they contact customer support at campusgigcom@gmail.com.\n\n--- KNOWLEDGE BASE ---\n${knowledgeBase}\n--- END KNOWLEDGE BASE ---\n\nUser Query: "${input}"`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
            });
            if (!response.ok) throw new Error('API Error');
            const data = await response.json();
            const aiResponse = { sender: 'ai', text: data.candidates[0].content.parts[0].text };
            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            const errorResponse = { sender: 'ai', text: "I'm sorry, I'm having trouble connecting. Please try again later." };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="fixed bottom-5 right-5 z-50">
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(!isOpen)} 
                    className="bg-blue-600 text-white rounded-full p-4 shadow-lg">
                    <Bot size={28} />
                </motion.button>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-20 right-5 z-50 w-96 h-[60vh] bg-white rounded-lg shadow-2xl flex flex-col">
                        <div className="p-4 bg-blue-600 text-white rounded-t-lg flex justify-between items-center">
                            <h3 className="font-bold">CampusGig Assistant</h3>
                            <button onClick={() => setIsOpen(false)}><X/></button>
                        </div>
                        <div className="flex-grow p-4 overflow-y-auto">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex mb-3 ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`rounded-lg px-3 py-2 max-w-xs ${msg.sender === 'ai' ? 'bg-gray-200' : 'bg-blue-500 text-white'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                             {loading && <div className="flex justify-start"><div className="rounded-lg px-3 py-2 bg-gray-200">...</div></div>}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 border-t flex">
                            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} className="flex-grow p-2 border rounded-l-md" placeholder="Ask a question..."/>
                            <button onClick={handleSend} className="bg-blue-600 text-white px-4 rounded-r-md"><Send/></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
