import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Clock, Plus, Target, Heart, Edit, Trash2, Save, X, Dumbbell, BarChart2, LayoutDashboard, ChevronDown, ChevronUp, Image as ImageIcon, Loader2, AlertTriangle, Sparkles, Trophy, List, CalendarDays, ChevronLeft, ChevronRight, Upload } from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, addDoc } from 'firebase/firestore';

// --- Firebase Configuration ---
// IMPORTANT: Replace these placeholder values with your own Firebase project's configuration!
// To keep your app secure, make sure your GitHub repository is set to PRIVATE.
const firebaseConfig = {
    apiKey: "AIzaSyDgY7PXsISXfYkFkiQWToYB7Ukgjobipmo",
    authDomain: "stargym-app-maclee.firebaseapp.com",
    projectId: "stargym-app-maclee",
    storageBucket: "stargym-app-maclee.firebasestorage.app",
    messagingSenderId: "727597086175",
    appId: "1:727597086175:web:f6f08d47aae8ad2726406a"
};

// --- App Initialization ---
// We only initialize the app if the config is valid
let app;
const isConfigValid = firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_API_KEY");
if (isConfigValid) {
    app = initializeApp(firebaseConfig);
}

const auth = isConfigValid ? getAuth(app) : null;
const db = isConfigValid ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-fitness-app';

// --- Helper Components ---

const Modal = ({ children, isOpen, onClose, title = "编辑窗口" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="text-white">
                <p className="mb-6">{message}</p>
                <div className="flex justify-end space-x-4">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                        取消
                    </button>
                    <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center">
                        <AlertTriangle size={18} className="mr-2" />
                        确认
                    </button>
                </div>
            </div>
        </Modal>
    );
};


const StatCard = ({ icon, title, value, unit, color }) => (
    <div className="bg-gray-800 p-6 rounded-xl flex items-center space-x-4 transform hover:scale-105 transition-transform duration-300">
        <div className={`p-3 rounded-lg ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-gray-400 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-white">{value} <span className="text-base font-normal text-gray-300">{unit}</span></p>
        </div>
    </div>
);

// --- Main Application ---

export default function App() {
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [plans, setPlans] = useState([]);
    const [prs, setPrs] = useState([]);
    const [view, setView] = useState('dashboard'); // dashboard, planner, stats
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [isSmartImportModalOpen, setIsSmartImportModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: () => {} });

    // --- Firebase Authentication and Data Loading ---
    useEffect(() => {
        if (!isConfigValid || !auth) {
            setLoading(false);
            return;
        }
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                try {
                    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                        await signInWithCustomToken(auth, __initial_auth_token);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Authentication Error:", error);
                }
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!userId || !isConfigValid || !db) {
            if(isConfigValid) setLoading(false);
            return;
        };
        
        setIsAuthReady(true);
        setLoading(true);
        let planLoaded = false;
        let prLoaded = false;

        const checkLoadingDone = () => {
            if (planLoaded && prLoaded) {
                setLoading(false);
            }
        };

        const plansCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/plans`);
        const qPlans = query(plansCollectionRef);
        const unsubscribePlans = onSnapshot(qPlans, (snapshot) => {
            setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            planLoaded = true;
            checkLoadingDone();
        }, (error) => console.error("Error fetching plans: ", error));

        const prsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/prs`);
        const qPrs = query(prsCollectionRef);
        const unsubscribePrs = onSnapshot(qPrs, (snapshot) => {
            setPrs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            prLoaded = true;
            checkLoadingDone();
        }, (error) => console.error("Error fetching PRs: ", error));

        return () => {
            unsubscribePlans();
            unsubscribePrs();
        };

    }, [userId]);


    // --- Data Processing for Stats ---
    const statsData = useMemo(() => {
        const dailyLogs = plans.flatMap(p => p.phases || []).flatMap(phase => phase.dailyWorkouts || []);
        const totalVolume = dailyLogs.flatMap(d => d.exercises || []).reduce((acc, ex) => acc + ((ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0)), 0);
        const completedWorkouts = dailyLogs.filter(d => d.isCompleted).length;
        const categoryDistribution = dailyLogs.flatMap(d => d.exercises || []).reduce((acc, ex) => {
            const cat = ex.category || '其他';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});
        const pieData = Object.keys(categoryDistribution).map(key => ({ name: key, value: categoryDistribution[key] }));
        const weeklyVolume = dailyLogs.reduce((acc, log) => {
            if (!log.date) return acc;
            const weekStart = new Date(log.date);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            const volume = (log.exercises || []).reduce((vol, ex) => vol + ((ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0)), 0);
            acc[weekKey] = (acc[weekKey] || 0) + volume;
            return acc;
        }, {});
        const barData = Object.keys(weeklyVolume).sort().slice(-8).map(key => ({ week: key, '训练总量(kg)': weeklyVolume[key] }));
        return { totalVolume, completedWorkouts, pieData, barData };
    }, [plans]);


    // --- CRUD Operations ---
    const handleSavePlan = async (planToSave) => {
        if (!userId || !db) return;
        const { id, ...planData } = planToSave;
        const planRef = id ? doc(db, `artifacts/${appId}/users/${userId}/plans`, id) : doc(collection(db, `artifacts/${appId}/users/${userId}/plans`));
        
        const newPlan = { ...planData, id: planRef.id, createdAt: planToSave.createdAt || new Date().toISOString() };
        
        try {
            await setDoc(planRef, newPlan);
            setIsPlanModalOpen(false);
            setIsSmartImportModalOpen(false);
            setEditingPlan(null);
        } catch (error) { console.error("Error saving plan: ", error); }
    };

    const handleDeletePlanRequest = (planId) => {
        setConfirmModal({ isOpen: true, title: "删除计划", message: "你确定要删除这个计划吗？此操作不可撤销。", onConfirm: () => { handleDeletePlanConfirm(planId); setConfirmModal({ isOpen: false }); }, onClose: () => setConfirmModal({ isOpen: false }) });
    };

    const handleDeletePlanConfirm = async (planId) => {
        if (!userId || !db) return;
        try { await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/plans`, planId)); } catch (error) { console.error("Error deleting plan: ", error); }
    };

    const handleSavePR = async (prToSave) => {
        if (!userId || !db) return;
        try {
            if (prToSave.id) {
                const prRef = doc(db, `artifacts/${appId}/users/${userId}/prs`, prToSave.id);
                await setDoc(prRef, prToSave, { merge: true });
            } else {
                await addDoc(collection(db, `artifacts/${appId}/users/${userId}/prs`), prToSave);
            }
        } catch (error) { console.error("Error saving PR:", error); }
    };
    
    const handleDeletePR = async (prId) => {
        if (!userId || !db) return;
        try { await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/prs`, prId)); } catch (error) { console.error("Error deleting PR:", error); }
    };

    const handleOpenPlanModal = (plan = null) => {
        setEditingPlan(plan);
        setIsPlanModalOpen(true);
    };
    
    const handleToggleWorkoutComplete = async (planId, phaseIndex, workoutDate, isCompleted) => {
        const plan = plans.find(p => p.id === planId);
        if (!plan || !plan.phases || !plan.phases[phaseIndex]) return;

        const updatedPhases = plan.phases.map((phase, pIdx) => {
            if (pIdx === phaseIndex) {
                return {
                    ...phase,
                    dailyWorkouts: phase.dailyWorkouts.map(w => w.date === workoutDate ? { ...w, isCompleted: !isCompleted } : w)
                };
            }
            return phase;
        });

        const updatedPlan = { ...plan, phases: updatedPhases };
        await handleSavePlan(updatedPlan);
    };

    // --- Render Methods ---
    
    if (!isConfigValid) {
      return (
        <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
          <div className="text-center p-8 bg-red-900/50 border border-red-700 rounded-lg max-w-2xl">
            <div className="flex justify-center mb-4">
                <AlertTriangle className="text-red-400" size={48} />
            </div>
            <h1 className="text-2xl font-bold text-red-300 mb-4">Firebase 配置错误</h1>
            <p className="text-red-200">应用无法连接到数据库，因为缺少有效的Firebase配置。</p>
            <p className="text-gray-400 mt-4">
              要修复此问题，请将您从Firebase项目获得的配置信息，直接替换到代码文件顶部的 `firebaseConfig` 对象中的占位符。
            </p>
            <code className="block bg-gray-800 text-left p-4 rounded-md mt-4 text-sm text-yellow-300 overflow-x-auto">
              const firebaseConfig = &#123; <br />
              &nbsp;&nbsp;apiKey: "YOUR_API_KEY_HERE", <span className="text-gray-500">// &lt;-- 替换这里</span><br />
              &nbsp;&nbsp;authDomain: "YOUR_AUTH_DOMAIN_HERE", <span className="text-gray-500">// &lt;-- 替换这里</span><br />
              &nbsp;&nbsp;...<br />
              &#125;;
            </code>
          </div>
        </div>
      );
    }

    const renderView = () => {
        if (loading) {
            return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div></div>;
        }
        switch (view) {
            case 'dashboard': return <DashboardView plans={plans} stats={statsData} onToggleComplete={handleToggleWorkoutComplete} />;
            case 'planner': return <PlannerView plans={plans} onAddPlan={() => handleOpenPlanModal(null)} onEditPlan={handleOpenPlanModal} onDeletePlan={handleDeletePlanRequest} onSavePlan={handleSavePlan} onImportPlan={() => setIsSmartImportModalOpen(true)} />;
            case 'stats': return <StatsView stats={statsData} prs={prs} onSavePR={handleSavePR} onDeletePR={handleDeletePR} />;
            default: return <DashboardView plans={plans} stats={statsData} onToggleComplete={handleToggleWorkoutComplete} />;
        }
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans">
            <div className="container mx-auto p-4 md:p-8">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8">
                    <div className="flex items-center space-x-3 mb-4 md:mb-0">
                        <Dumbbell className="text-blue-400" size={40} />
                        <div>
                            <h1 className="text-3xl font-bold">StarGym</h1>
                            <p className="text-gray-400">你的AI健身与康复伙伴</p>
                        </div>
                    </div>
                    <nav className="flex items-center bg-gray-800 rounded-full p-2 space-x-2">
                        <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}><LayoutDashboard size={16} className="inline mr-2"/>仪表盘</button>
                        <button onClick={() => setView('planner')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${view === 'planner' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}><Calendar size={16} className="inline mr-2"/>计划中心</button>
                        <button onClick={() => setView('stats')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${view === 'stats' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}><BarChart2 size={16} className="inline mr-2"/>数据统计</button>
                    </nav>
                </header>
                
                <main>
                    {isAuthReady ? renderView() : <div className="text-center p-8">正在连接到您的健身数据...</div>}
                </main>

                <Modal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)}>
                    <PlanForm initialPlan={editingPlan} onSave={handleSavePlan} onClose={() => setIsPlanModalOpen(false)} />
                </Modal>
                 <Modal isOpen={isSmartImportModalOpen} onClose={() => setIsSmartImportModalOpen(false)} title="智能导入计划 (图片/表格)">
                    <SmartImportForm plans={plans} onImport={handleSavePlan} onClose={() => setIsSmartImportModalOpen(false)} />
                </Modal>
                <ConfirmModal {...confirmModal} onClose={() => setConfirmModal({isOpen: false})} />
                
                <footer className="text-center mt-12 text-gray-500 text-xs">
                    <p>用户ID: {userId}</p>
                    <p>&copy; 2025 StarGym. All Rights Reserved.</p>
                </footer>
            </div>
        </div>
    );
}

// --- View Components ---

const DashboardView = ({ plans, stats, onToggleComplete }) => {
    const today = new Date().toISOString().split('T')[0];
    const todaysWorkouts = plans.flatMap((p, pIndex) => 
        (p.phases || []).flatMap((phase, phIndex) => 
            (phase.dailyWorkouts || []).filter(w => w.date === today)
            .map(w => ({...w, planId: p.id, planName: p.name, phaseIndex: phIndex, phaseName: phase.name}))
        )
    ).filter(w => plans.find(p => p.id === w.planId)?.status === 'active');

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard icon={<Dumbbell size={24} />} title="总训练量" value={stats.totalVolume.toLocaleString()} unit="kg" color="bg-blue-500" />
                <StatCard icon={<Target size={24} />} title="已完成训练" value={stats.completedWorkouts} unit="次" color="bg-green-500" />
                <StatCard icon={<Calendar size={24} />} title="进行中计划" value={plans.filter(p => p.status === 'active').length} unit="个" color="bg-yellow-500" />
            </div>
            <div className="bg-gray-800 p-6 rounded-2xl">
                <h2 className="text-2xl font-bold mb-4 flex items-center"><Clock size={24} className="mr-3 text-blue-400"/>今日训练</h2>
                {todaysWorkouts.length > 0 ? (
                    <div className="space-y-4">
                        {todaysWorkouts.map((workout, index) => (
                            <div key={index} className="bg-gray-700 p-4 rounded-lg">
                               <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-lg">{workout.name}</p>
                                        <p className="text-sm text-gray-400">{workout.planName} - {workout.phaseName}</p>
                                    </div>
                                    <button onClick={() => onToggleComplete(workout.planId, workout.phaseIndex, workout.date, workout.isCompleted)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${workout.isCompleted ? 'bg-green-500 text-white' : 'bg-gray-600 hover:bg-green-600'}`}>{workout.isCompleted ? '已完成' : '标记为完成'}</button>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-600 space-y-2">
                                    {(workout.exercises || []).map((ex, i) => (<p key={i} className="text-sm text-gray-300">{formatExercise(ex)}</p>))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (<p className="text-gray-400">今天没有安排训练。好好休息！</p>)}
            </div>
        </div>
    );
};

const PlannerView = ({ plans, onAddPlan, onEditPlan, onDeletePlan, onSavePlan, onImportPlan }) => {
    const [viewMode, setViewMode] = useState('calendar'); // 'list' or 'calendar'

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">计划中心</h2>
                <div className="flex items-center gap-4">
                    <div className="bg-gray-800 p-1 rounded-lg flex space-x-1">
                        <button onClick={() => setViewMode('calendar')} title="日历视图" className={`p-2 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}><CalendarDays size={20} /></button>
                        <button onClick={() => setViewMode('list')} title="列表视图" className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}><List size={20} /></button>
                    </div>
                    <button onClick={onImportPlan} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"><Upload size={16} className="mr-2" />智能导入</button>
                    <button onClick={onAddPlan} className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"><Plus size={20} className="mr-2" />创建新计划</button>
                </div>
            </div>
            {viewMode === 'list' ? (
                <ListPlannerView plans={plans} onEditPlan={onEditPlan} onDeletePlan={onDeletePlan} onSavePlan={onSavePlan} />
            ) : (
                <CalendarPlannerView plans={plans} onSavePlan={onSavePlan} />
            )}
        </div>
    );
};

const ListPlannerView = ({ plans, onEditPlan, onDeletePlan, onSavePlan }) => {
    const [openPlanId, setOpenPlanId] = useState(null);
    const togglePlanDetails = (planId) => setOpenPlanId(openPlanId === planId ? null : planId);
    return (
        <div className="space-y-4">
            {plans.length > 0 ? plans.map(plan => (
                <div key={plan.id} className="bg-gray-800 rounded-2xl overflow-hidden">
                    <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => togglePlanDetails(plan.id)}>
                        <div className="flex items-center space-x-4">
                            <span className={`p-2 rounded-full ${plan.type === 'rehab' ? 'bg-green-500' : 'bg-yellow-500'}`}>{plan.type === 'rehab' ? <Heart size={20} /> : <Target size={20} />}</span>
                            <div>
                                <p className="font-bold text-lg">{plan.name}</p>
                                <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                                    <span>类型: {plan.type === 'rehab' ? '康复' : '主要'}</span>
                                    <span className="font-semibold">模式: {plan.trainingMode === 'CrossFit' ? 'CrossFit' : '通用'}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${plan.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}`}>{plan.status === 'active' ? '进行中' : '待办'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={(e) => { e.stopPropagation(); onEditPlan(plan); }} className="p-2 text-gray-400 hover:text-blue-400 transition-colors"><Edit size={18} /></button>
                            <button onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.id); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                            {openPlanId === plan.id ? <ChevronUp/> : <ChevronDown/>}
                        </div>
                    </div>
                    {openPlanId === plan.id && (<div className="p-4 bg-gray-800 border-t border-gray-700"><PlanEditor plan={plan} onSavePlan={onSavePlan} /></div>)}
                </div>
            )) : (<div className="text-center py-12 bg-gray-800 rounded-2xl"><p className="text-gray-400">还没有任何计划。</p><p className="text-gray-500 mt-2">点击“创建新计划”开始你的健身之旅吧！</p></div>)}
        </div>
    );
};

const CalendarPlannerView = ({ plans, onSavePlan }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [isAddWorkoutModalOpen, setIsAddWorkoutModalOpen] = useState(false);

    const workoutsByDate = useMemo(() => {
        const map = new Map();
        plans.forEach(plan => {
            (plan.phases || []).forEach(phase => {
                (phase.dailyWorkouts || []).forEach(workout => {
                    const date = workout.date;
                    if (!map.has(date)) {
                        map.set(date, []);
                    }
                    map.get(date).push({ ...workout, planName: plan.name, phaseName: phase.name, planId: plan.id, trainingMode: plan.trainingMode });
                });
            });
        });
        return map;
    }, [plans]);

    const handleAddWorkout = async (planId, newWorkout) => {
        const plan = plans.find(p => p.id === planId);
        if (plan) {
            // This logic needs to be smarter; for now, adds to the first phase.
            // A better UI would let the user choose the phase.
            const targetPhaseIndex = (plan.phases && plan.phases.length > 0) ? 0 : -1;
            let newPhases = [...(plan.phases || [])];
            if (targetPhaseIndex !== -1) {
                newPhases[targetPhaseIndex].dailyWorkouts.push(newWorkout);
            } else {
                newPhases.push({ name: "第一阶段", dailyWorkouts: [newWorkout] });
            }
            const updatedPlan = { ...plan, phases: newPhases };
            await onSavePlan(updatedPlan);
            setIsAddWorkoutModalOpen(false);
        }
    };

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const changeMonth = (offset) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const renderCalendar = () => {
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-start-${i}`} className="p-2"></div>);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasWorkout = workoutsByDate.has(dateStr);
            const isSelected = selectedDate === dateStr;
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            
            days.push(
                <div key={day} onClick={() => setSelectedDate(dateStr)} className={`p-2 text-center border border-gray-700 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-700'} ${isToday ? 'border-blue-400' : ''}`}>
                    <div className="font-semibold">{day}</div>
                    {hasWorkout && <div className="w-2 h-2 bg-yellow-400 rounded-full mx-auto mt-1"></div>}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="bg-gray-800 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-700"><ChevronLeft/></button>
                <h3 className="text-xl font-bold">{currentDate.toLocaleString('default', { month: 'long' })} {year}</h3>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-700"><ChevronRight/></button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-xs text-gray-400 mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map(day => <div key={day} className="text-center font-bold">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {renderCalendar()}
            </div>
            {selectedDate && (
                <div className="mt-6">
                    <div className="flex justify-between items-center mb-3">
                         <h4 className="text-lg font-bold">
                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })} 的训练
                        </h4>
                        <button onClick={() => setIsAddWorkoutModalOpen(true)} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg text-sm"><Plus size={16} className="mr-1" />添加训练</button>
                    </div>
                    <div className="space-y-3 bg-gray-700/50 p-4 rounded-lg">
                        {(workoutsByDate.get(selectedDate) || []).map((workout, index) => (
                            <div key={index}>
                                <p className="font-bold">{workout.name} <span className="text-xs text-gray-400">({workout.planName} - {workout.phaseName})</span></p>
                                <ul className="list-disc list-inside text-sm text-gray-300 pl-2">
                                    {(workout.exercises || []).map((ex, i) => <li key={i}>{formatExercise(ex)}</li>)}
                                </ul>
                            </div>
                        ))}
                        {!workoutsByDate.has(selectedDate) && <p className="text-gray-400">该日无训练安排。</p>}
                    </div>
                </div>
            )}
             <Modal isOpen={isAddWorkoutModalOpen} onClose={() => setIsAddWorkoutModalOpen(false)} title={`为 ${selectedDate} 添加训练`}>
                <AddWorkoutForm date={selectedDate} plans={plans} onSave={handleAddWorkout} onClose={() => setIsAddWorkoutModalOpen(false)} />
            </Modal>
        </div>
    );
};

const AddWorkoutForm = ({ date, plans, onSave, onClose }) => {
    const [planId, setPlanId] = useState(plans.length > 0 ? plans[0].id : '');
    const [workoutName, setWorkoutName] = useState('新训练');
    const [exercises, setExercises] = useState([]);
    const [showImageUploader, setShowImageUploader] = useState(false);
    const [showAISuggestion, setShowAISuggestion] = useState(false);
    
    const selectedPlan = useMemo(() => plans.find(p => p.id === planId), [planId, plans]);
    const currentCategories = selectedPlan?.trainingMode === 'CrossFit' ? ['Weightlifting', 'Gymnastics', 'Metcon'] : ['胸', '背', '腿', '肩', '手臂', '核心', '其他'];

    const addExercise = () => {
        setExercises(prev => [...prev, { name: '', scoreType: 'Weight & Reps', sets: 3, reps: 10, weight: 0, time: '', distance: '', category: currentCategories[0] }]);
    };

    const handleExerciseChange = (index, field, value) => {
        setExercises(prev => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
    };
    
    const handleRecognizeExercises = (recognizedExercises) => {
        const newExercises = recognizedExercises.map(ex => ({
            name: ex.name || '未知动作',
            scoreType: ex.scoreType || 'Weight & Reps',
            sets: ex.sets || 3,
            reps: ex.reps || 10,
            weight: ex.weight || 0,
            time: ex.time || '',
            distance: ex.distance || '',
            category: ex.category || currentCategories[0]
        }));
        setExercises(prev => [...prev, ...newExercises]);
        setShowImageUploader(false);
    };

    const handleAISuggestions = (suggestedExercises) => {
        setExercises(prev => [...prev, ...suggestedExercises]);
        setShowAISuggestion(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!planId) {
            alert("请选择一个计划。");
            return;
        }
        if (exercises.length === 0) {
            alert("请至少添加一个训练动作。");
            return;
        }
        const newWorkout = {
            date,
            name: workoutName,
            exercises,
            isCompleted: false,
        };
        onSave(planId, newWorkout);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">归属计划</label>
                <select value={planId} onChange={e => setPlanId(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3">
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({p.trainingMode})</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">训练日名称</label>
                <input type="text" value={workoutName} onChange={e => setWorkoutName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3" />
            </div>

            <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAISuggestion(!showAISuggestion)} className="flex items-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"><Sparkles size={16} className="mr-2" />{showAISuggestion ? '关闭AI建议' : 'AI生成'}</button>
                <button type="button" onClick={() => setShowImageUploader(!showImageUploader)} className="flex items-center bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"><ImageIcon size={16} className="mr-2" />{showImageUploader ? '关闭识别' : '图片识别'}</button>
            </div>

            {showAISuggestion && <AISuggestionGenerator trainingMode={selectedPlan?.trainingMode || 'General'} onGenerate={handleAISuggestions} />}
            {showImageUploader && <ImageRecognitionUploader trainingMode={selectedPlan?.trainingMode || 'General'} onRecognize={handleRecognizeExercises} />}

            <div className="space-y-3">
                <h4 className="text-md font-semibold text-gray-200 border-b border-gray-600 pb-2 mb-2">训练动作</h4>
                {exercises.map((ex, index) => (
                    <ExerciseEditor 
                        key={index} 
                        exercise={ex} 
                        onChange={(field, value) => handleExerciseChange(index, field, value)}
                        onRemove={() => setExercises(prev => prev.filter((_, i) => i !== index))}
                        categories={currentCategories}
                    />
                ))}
                <button type="button" onClick={addExercise} className="text-blue-400 hover:text-blue-300 text-sm font-semibold">+ 添加动作</button>
            </div>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg">取消</button>
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg flex items-center"><Save size={18} className="mr-2" />保存</button>
            </div>
        </form>
    );
};


const PlanEditor = ({ plan, onSavePlan }) => {
    const [editedPlan, setEditedPlan] = useState(plan);
    const [openPhaseIndex, setOpenPhaseIndex] = useState(0);

    const handlePhaseChange = (phaseIndex, field, value) => {
        const newPhases = editedPlan.phases.map((p, i) => 
            i === phaseIndex ? { ...p, [field]: value } : p
        );
        setEditedPlan(prev => ({ ...prev, phases: newPhases }));
    };

    const handleExerciseChange = (phaseIndex, workoutIndex, exIndex, field, value) => {
        const newPhases = [...editedPlan.phases];
        const newWorkouts = [...newPhases[phaseIndex].dailyWorkouts];
        const newExercises = [...newWorkouts[workoutIndex].exercises];
        newExercises[exIndex] = { ...newExercises[exIndex], [field]: value };
        newWorkouts[workoutIndex].exercises = newExercises;
        newPhases[phaseIndex].dailyWorkouts = newWorkouts;
        setEditedPlan(prev => ({ ...prev, phases: newPhases }));
    };
    
    const addPhase = () => {
        const newPhase = { name: `新阶段 ${(editedPlan.phases || []).length + 1}`, dailyWorkouts: [] };
        setEditedPlan(prev => ({ ...prev, phases: [...(prev.phases || []), newPhase] }));
    };

    const addWorkoutDay = (phaseIndex) => {
        const newWorkout = { date: new Date().toISOString().split('T')[0], name: '新的训练日', exercises: [], isCompleted: false };
        const newPhases = editedPlan.phases.map((p, i) => 
            i === phaseIndex ? { ...p, dailyWorkouts: [...(p.dailyWorkouts || []), newWorkout] } : p
        );
        setEditedPlan(prev => ({ ...prev, phases: newPhases }));
    };
    
    const addExercise = (phaseIndex, workoutIndex) => {
        const categories = editedPlan.trainingMode === 'CrossFit' ? ['Weightlifting', 'Gymnastics', 'Metcon'] : ['胸', '背', '腿', '肩', '手臂', '核心', '其他'];
        const newExercise = { name: '新动作', scoreType: 'Weight & Reps', sets: 3, reps: 10, weight: 20, time: '', distance: '', category: categories[0] };
        const newPhases = [...editedPlan.phases];
        newPhases[phaseIndex].dailyWorkouts[workoutIndex].exercises.push(newExercise);
        setEditedPlan(prev => ({ ...prev, phases: newPhases }));
    };
    
    const removeExercise = (phaseIndex, workoutIndex, exIndex) => {
        const newPhases = [...editedPlan.phases];
        newPhases[phaseIndex].dailyWorkouts[workoutIndex].exercises.splice(exIndex, 1);
        setEditedPlan(prev => ({ ...prev, phases: newPhases }));
    };

    const removeWorkoutDay = (phaseIndex, workoutIndex) => {
        const newPhases = editedPlan.phases.map((p, i) => 
            i === phaseIndex ? { ...p, dailyWorkouts: p.dailyWorkouts.filter((_, wi) => wi !== workoutIndex) } : p
        );
        setEditedPlan(prev => ({ ...prev, phases: newPhases }));
    };

    const removePhase = (phaseIndex) => {
        const newPhases = editedPlan.phases.filter((_, i) => i !== phaseIndex);
        setEditedPlan(prev => ({ ...prev, phases: newPhases }));
    };

    return (
        <div className="space-y-4">
            {(editedPlan.phases || []).map((phase, pIndex) => (
                <div key={pIndex} className="bg-gray-700/50 rounded-lg overflow-hidden border border-gray-600">
                    <div className="p-3 flex justify-between items-center cursor-pointer bg-gray-700" onClick={() => setOpenPhaseIndex(openPhaseIndex === pIndex ? null : pIndex)}>
                        <input 
                            type="text" 
                            value={phase.name} 
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handlePhaseChange(pIndex, 'name', e.target.value)}
                            className="bg-transparent font-bold text-lg text-white w-full"
                        />
                        <div className="flex items-center">
                           <button type="button" onClick={(e) => { e.stopPropagation(); removePhase(pIndex); }} className="p-1 text-red-500 hover:text-red-400"><Trash2 size={16}/></button>
                           {openPhaseIndex === pIndex ? <ChevronUp /> : <ChevronDown />}
                        </div>
                    </div>
                    {openPhaseIndex === pIndex && (
                        <div className="p-4 space-y-4">
                            {(phase.dailyWorkouts || []).map((workout, wIndex) => (
                                <div key={wIndex} className="bg-gray-800 p-4 rounded-lg space-y-3">
                                    <div className="flex justify-between items-center">
                                        <input type="text" value={workout.name} onChange={(e) => handlePhaseChange(pIndex, 'dailyWorkouts', phase.dailyWorkouts.map((dw, dwi) => dwi === wIndex ? {...dw, name: e.target.value} : dw))} className="bg-transparent text-white font-bold text-lg w-1/2" />
                                        <input type="date" value={workout.date} onChange={(e) => handlePhaseChange(pIndex, 'dailyWorkouts', phase.dailyWorkouts.map((dw, dwi) => dwi === wIndex ? {...dw, date: e.target.value} : dw))} className="bg-gray-600 text-white p-1 rounded" />
                                        <button onClick={() => removeWorkoutDay(pIndex, wIndex)} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>
                                    </div>
                                    {(workout.exercises || []).map((ex, eIndex) => (
                                        <ExerciseEditor 
                                            key={eIndex}
                                            exercise={ex}
                                            onChange={(field, value) => handleExerciseChange(pIndex, wIndex, eIndex, field, value)}
                                            onRemove={() => removeExercise(pIndex, wIndex, eIndex)}
                                            categories={editedPlan.trainingMode === 'CrossFit' ? ['Weightlifting', 'Gymnastics', 'Metcon'] : ['胸', '背', '腿', '肩', '手臂', '核心', '其他']}
                                        />
                                    ))}
                                    <button onClick={() => addExercise(pIndex, wIndex)} className="text-blue-400 hover:text-blue-300 text-sm font-semibold">+ 添加动作</button>
                                </div>
                            ))}
                            <div className="flex justify-end mt-4">
                                <button onClick={() => addWorkoutDay(pIndex)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">添加训练日</button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
            <div className="flex justify-end space-x-3 mt-4">
                <button onClick={addPhase} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">添加阶段</button>
                <button onClick={() => onSavePlan(editedPlan)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">保存整个计划</button>
            </div>
        </div>
    );
};

const ExerciseEditor = ({ exercise, onChange, onRemove, categories }) => {
    return (
        <div className="grid grid-cols-12 gap-2 items-center text-sm p-2 bg-gray-600/50 rounded-md">
            <input value={exercise.name} onChange={(e) => onChange('name', e.target.value)} className="col-span-12 md:col-span-3 bg-gray-600 p-1 rounded" placeholder="动作名称" />
            
            <select value={exercise.scoreType} onChange={(e) => onChange('scoreType', e.target.value)} className="col-span-6 md:col-span-2 bg-gray-600 p-1 rounded">
                <option value="Weight & Reps">负重&次数</option>
                <option value="Reps Only">仅次数</option>
                <option value="Time">时间</option>
                <option value="Distance">距离</option>
            </select>

            <div className="col-span-6 md:col-span-5 flex items-center gap-1">
                {exercise.scoreType === 'Weight & Reps' && <>
                    <input type="number" value={exercise.sets} onChange={(e) => onChange('sets', parseInt(e.target.value) || 0)} className="w-1/3 bg-gray-600 p-1 rounded" placeholder="组" />
                    <span className="text-gray-400">x</span>
                    <input type="number" value={exercise.reps} onChange={(e) => onChange('reps', parseInt(e.target.value) || 0)} className="w-1/3 bg-gray-600 p-1 rounded" placeholder="次" />
                    <span className="text-gray-400">@</span>
                    <input type="number" value={exercise.weight} onChange={(e) => onChange('weight', parseFloat(e.target.value) || 0)} className="w-1/3 bg-gray-600 p-1 rounded" placeholder="kg" />
                </>}
                 {exercise.scoreType === 'Reps Only' && <>
                    <input type="number" value={exercise.sets} onChange={(e) => onChange('sets', parseInt(e.target.value) || 0)} className="w-1/2 bg-gray-600 p-1 rounded" placeholder="组" />
                    <span className="text-gray-400">x</span>
                    <input type="number" value={exercise.reps} onChange={(e) => onChange('reps', parseInt(e.target.value) || 0)} className="w-1/2 bg-gray-600 p-1 rounded" placeholder="次" />
                </>}
                {exercise.scoreType === 'Time' && <>
                    <input type="text" value={exercise.time} onChange={(e) => onChange('time', e.target.value)} className="w-full bg-gray-600 p-1 rounded" placeholder="mm:ss" />
                </>}
                {exercise.scoreType === 'Distance' && <>
                    <input type="number" value={exercise.distance} onChange={(e) => onChange('distance', parseFloat(e.target.value) || 0)} className="w-full bg-gray-600 p-1 rounded" placeholder="米" />
                </>}
            </div>

            <select value={exercise.category} onChange={(e) => onChange('category', e.target.value)} className="col-span-10 md:col-span-1 bg-gray-600 p-1 rounded">
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <button type="button" onClick={onRemove} className="col-span-2 md:col-span-1 text-red-500 hover:text-red-400 flex justify-center"><X size={16}/></button>
        </div>
    );
};

const formatExercise = (ex) => {
    let details = '';
    switch (ex.scoreType) {
        case 'Time':
            details = `时间: ${ex.time}`;
            break;
        case 'Distance':
            details = `距离: ${ex.distance} 米`;
            break;
        case 'Reps Only':
            details = `${ex.sets || 0}组 x ${ex.reps || 0}次`;
            break;
        case 'Weight & Reps':
        default:
            details = `${ex.sets || 0}组 x ${ex.reps || 0}次 @ ${ex.weight || 0}kg`;
    }
    return `${ex.name}: ${details}`;
};

const ImageRecognitionUploader = ({ trainingMode, onRecognize }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const handleImageChange = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (loadEvent) => setImageSrc(loadEvent.target.result); reader.readAsDataURL(file); } };
    const handlePaste = (e) => { const items = e.clipboardData.items; for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf('image') !== -1) { const file = items[i].getAsFile(); const reader = new FileReader(); reader.onload = (loadEvent) => setImageSrc(loadEvent.target.result); reader.readAsDataURL(file); break; } } };
    
    const handleRecognition = async () => { 
        if (!imageSrc) { setError('请先上传或粘贴一张图片。'); return; } 
        setIsLoading(true); 
        setError(''); 
        const base64ImageData = imageSrc.split(',')[1]; 
        
        const isCrossFit = trainingMode === 'CrossFit';
        const prompt = `Analyze the provided image of a workout plan. Extract all exercises. For each, identify its name and all relevant metrics (sets, reps, weight, time, distance). Based on the metrics, determine the most appropriate scoreType from this list: ['Weight & Reps', 'Reps Only', 'Time', 'Distance']. Also, classify each exercise. If the training mode is CrossFit, use these categories: ['Weightlifting', 'Gymnastics', 'Metcon']. Otherwise, use these categories: ['胸', '背', '腿', '肩', '手臂', '核心']. Return a JSON array of objects.`;

        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    "name": { "type": "STRING", "description": "动作名称" },
                    "scoreType": { "type": "STRING", "description": "计分方式: 'Weight & Reps', 'Reps Only', 'Time', or 'Distance'" },
                    "sets": { "type": "NUMBER", "description": "组数 (if applicable)" },
                    "reps": { "type": "NUMBER", "description": "次数 (if applicable)" },
                    "weight": { "type": "NUMBER", "description": "重量(kg) (if applicable)" },
                    "time": { "type": "STRING", "description": "时间, 格式 'mm:ss' (if applicable)" },
                    "distance": { "type": "NUMBER", "description": "距离(米) (if applicable)" },
                    "category": { "type": "STRING", "description": isCrossFit ? "CrossFit 分类" : "训练部位" }
                },
                required: ["name", "scoreType", "category"]
            }
        };

        const payload = { 
            contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: base64ImageData } }] }], 
            generationConfig: { responseMimeType: "application/json", responseSchema: schema } 
        };

        try { 
            const apiKey = ""; 
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`; 
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); 
            if (!response.ok) { const errorBody = await response.text(); throw new Error(`API request failed with status ${response.status}: ${errorBody}`); } 
            const result = await response.json(); 
            if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) { 
                const jsonText = result.candidates[0].content.parts[0].text; 
                const parsedJson = JSON.parse(jsonText); 
                onRecognize(parsedJson); 
                setImageSrc(null); 
            } else { 
                throw new Error("未能从图片中识别出有效的训练内容。"); 
            } 
        } catch (err) { 
            console.error(err); 
            setError(`识别失败: ${err.message}`); 
        } finally { 
            setIsLoading(false); 
        } 
    };

    return (
        <div className="bg-gray-700 p-4 rounded-lg border-2 border-dashed border-gray-500 space-y-4 my-4">
            {!imageSrc && (<div onPaste={handlePaste} className="flex flex-col items-center justify-center p-6 text-gray-400"><p className="mb-2">将图片粘贴到此处，或</p><input type="file" id="imageUpload" accept="image/*" onChange={handleImageChange} className="hidden" /><label htmlFor="imageUpload" className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">选择文件</label></div>)}
            {imageSrc && (<div className="flex flex-col items-center space-y-4"><img src={imageSrc} alt="预览" className="max-h-64 rounded-lg" /><div className="flex space-x-4"><button onClick={() => setImageSrc(null)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">清除图片</button><button onClick={handleRecognition} disabled={isLoading} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center disabled:bg-green-800">{isLoading ? <><Loader2 className="animate-spin mr-2" /> 正在识别...</> : "开始识别"}</button></div></div>)}
            {error && <p className="text-red-400 text-center text-sm">{error}</p>}
        </div>
    );
};

const AISuggestionGenerator = ({ trainingMode, onGenerate }) => {
    const [goal, setGoal] = useState('增肌');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => { 
        setIsLoading(true); 
        setError(''); 

        const isCrossFit = trainingMode === 'CrossFit';
        const prompt = `You are an expert fitness coach. A user wants a workout for the goal '${goal}'. The training mode is '${trainingMode}'. Generate 5-6 suitable exercises. For each exercise, provide: name, scoreType (from 'Weight & Reps', 'Reps Only', 'Time', 'Distance'), and all relevant metrics (sets, reps, weight, time, distance). Also provide a 'category' ('Weightlifting', 'Gymnastics', 'Metcon' for CrossFit, or body part for General). Return a JSON array.`;

        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    "name": { "type": "STRING", "description": "动作名称" },
                    "scoreType": { "type": "STRING", "description": "计分方式: 'Weight & Reps', 'Reps Only', 'Time', or 'Distance'" },
                    "sets": { "type": "NUMBER", "description": "组数 (if applicable)" },
                    "reps": { "type": "NUMBER", "description": "次数 (if applicable)" },
                    "weight": { "type": "NUMBER", "description": "重量(kg) (if applicable)" },
                    "time": { "type": "STRING", "description": "时间, 格式 'mm:ss' (if applicable)" },
                    "distance": { "type": "NUMBER", "description": "距离(米) (if applicable)" },
                    "category": { "type": "STRING", "description": isCrossFit ? "CrossFit 分类" : "训练部位" }
                },
                required: ["name", "scoreType", "category"]
            }
        };

        const payload = { 
            contents: [{ role: "user", parts: [{ text: prompt }] }], 
            generationConfig: { responseMimeType: "application/json", responseSchema: schema }
        };

        try { 
            const apiKey = ""; 
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`; 
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); 
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }
            const result = await response.json(); 
            if (result.candidates && result.candidates[0].content.parts.length > 0) { 
                const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text); 
                onGenerate(parsedJson); 
            } else { 
                throw new Error("未能生成有效的训练建议。"); 
            } 
        } catch (err) { 
            console.error(err); 
            setError(`生成失败: ${err.message}`); 
        } finally { 
            setIsLoading(false); 
        } 
    };

    return (
        <div className="bg-gray-700 p-4 rounded-lg border-2 border-dashed border-gray-500 space-y-4 my-4">
            <div className="flex items-center justify-between gap-4 flex-wrap"><label htmlFor="goal-select" className="text-white font-medium">选择你的今日目标:</label><select id="goal-select" value={goal} onChange={(e) => setGoal(e.target.value)} className="bg-gray-600 text-white p-2 rounded-lg focus:ring-2 focus:ring-purple-500"><option value="增肌">增肌</option><option value="减脂">减脂</option><option value="提升耐力">提升耐力</option><option value="全身力量">全身力量</option></select><button onClick={handleGenerate} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center disabled:bg-purple-800">{isLoading ? <><Loader2 className="animate-spin mr-2" /> 正在生成...</> : <><Sparkles size={16} className="mr-2" /> 生成建议</>}</button></div>
             {error && <p className="text-red-400 text-center text-sm">{error}</p>}
        </div>
    );
};

// --- Stats View and its Tabs ---
const StatsView = ({ stats, prs, onSavePR, onDeletePR }) => {
    const [activeTab, setActiveTab] = useState('analysis');
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">数据中心</h2>
                <div className="bg-gray-800 p-1 rounded-lg flex space-x-1">
                    <button onClick={() => setActiveTab('analysis')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'analysis' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>训练分析</button>
                    <button onClick={() => setActiveTab('pr')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'pr' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>PR 记录</button>
                </div>
            </div>
            {activeTab === 'analysis' && <AnalysisTab stats={stats} />}
            {activeTab === 'pr' && <PRTab prs={prs} onSavePR={onSavePR} onDeletePR={onDeletePR} />}
        </div>
    );
};

const AnalysisTab = ({ stats }) => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d'];
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const handleAnalysis = async () => { 
        setIsLoading(true); 
        setError(''); 
        setAnalysis(''); 
        const prompt = `You are a data-driven fitness analyst. Here is a summary of a user's recent workout data: ${JSON.stringify(stats)}. Analyze this data and provide a concise summary of their performance in Chinese. Then, offer 3 actionable tips for improvement. For example, if you see they are neglecting a body part, suggest exercises for it. If their volume is stagnant, suggest progressive overload techniques. Keep the tone encouraging and positive. Format the output with a title 'AI表现分析', a '总结' section, and a '建议' section. Use markdown for formatting.`; 
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], };
        try { 
            const apiKey = ""; 
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`; 
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); 
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }
            const result = await response.json(); 
            if (result.candidates && result.candidates[0].content.parts.length > 0) { 
                setAnalysis(result.candidates[0].content.parts[0].text); 
            } else { 
                throw new Error("未能生成有效的分析报告。"); 
            } 
        } catch (err) { 
            console.error(err); 
            setError(`分析失败: ${err.message}`); 
        } finally { 
            setIsLoading(false); 
        } 
    };
    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <button onClick={handleAnalysis} disabled={isLoading} className="flex items-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-purple-800"><Sparkles size={16} className="mr-2" />{isLoading ? '正在分析...' : 'AI分析我的表现'}</button>
            </div>
            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">{error}</div>}
            {analysis && (
                <div className="bg-gray-800 p-6 rounded-2xl prose prose-invert prose-p:text-gray-300 prose-headings:text-white">
                    {analysis.split('\n').map((line, i) => { if (line.startsWith('### ')) return <h3 key={i} className="font-bold text-lg mt-4 mb-2">{line.substring(4)}</h3>; if (line.startsWith('## ')) return <h2 key={i} className="font-bold text-xl mb-4 border-b border-gray-600 pb-2">{line.substring(3)}</h2>; if (line.startsWith('* ')) return <p key={i} className="ml-4">&bull; {line.substring(2)}</p>; return <p key={i}>{line}</p>; })}
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 p-6 rounded-2xl"><h3 className="font-bold text-lg mb-4">每周训练总量 (kg)</h3><ResponsiveContainer width="100%" height={300}><BarChart data={stats.barData}><CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /><XAxis dataKey="week" stroke="#A0AEC0" /><YAxis stroke="#A0AEC0" /><Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} /><Legend /><Bar dataKey="训练总量(kg)" fill="#3B82F6" /></BarChart></ResponsiveContainer></div>
                <div className="bg-gray-800 p-6 rounded-2xl"><h3 className="font-bold text-lg mb-4">训练分类统计</h3><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={stats.pieData} cx="50%" cy="50%" labelLine={false} outerRadius={120} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{stats.pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} /></PieChart></ResponsiveContainer></div>
            </div>
        </div>
    );
};

const PRTab = ({ prs, onSavePR, onDeletePR }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPR, setEditingPR] = useState(null);
    const [guidance, setGuidance] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleOpenModal = (pr = null) => { setEditingPR(pr); setIsModalOpen(true); };
    const handleCloseModal = () => { setEditingPR(null); setIsModalOpen(false); };

    const handleGetGuidance = async () => {
        setIsLoading(true);
        setError('');
        setGuidance('');
        const prompt = `You are an expert CrossFit L2 coach. A user has provided their personal records (PRs). Their goal is to become a more well-rounded athlete. Analyze the following PRs: ${JSON.stringify(prs)}. Based on these records, identify potential strengths, weaknesses, and imbalances. Provide a concise analysis and 3-5 actionable training recommendations in Chinese. For example, suggest accessory exercises, mobility work, or a focus for their next training cycle. Keep the tone encouraging and professional. Format the response in Markdown with a title 'AI 训练指导', a '强项与弱项分析' section, and a '训练建议' section.`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        try {
            const apiKey = ""; 
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`; 
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); 
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }
            const result = await response.json(); 
            if (result.candidates && result.candidates[0].content.parts.length > 0) { 
                setGuidance(result.candidates[0].content.parts[0].text); 
            } else { 
                throw new Error("未能生成有效的指导建议。"); 
            }
        } catch (err) { 
            console.error(err); 
            setError(`生成指导建议失败: ${err.message}`); 
        } finally { 
            setIsLoading(false); 
        }
    };

    const prCategories = {
        '力量举重': prs.filter(p => p.category === '力量举重'),
        '奥林匹克举重': prs.filter(p => p.category === '奥林匹克举重'),
        '体操与WODs': prs.filter(p => p.category === '体操与WODs'),
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">个人纪录 (PR) 中心</h3>
                <div className='flex gap-2'>
                     <button onClick={handleGetGuidance} disabled={isLoading || prs.length === 0} className="flex items-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"><Sparkles size={16} className="mr-2" />{isLoading ? 'AI分析中...' : 'AI生成训练指导'}</button>
                    <button onClick={() => handleOpenModal(null)} className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"><Plus size={16} className="mr-2" />添加/更新PR</button>
                </div>
            </div>
            
            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">{error}</div>}
            {guidance && (
                <div className="bg-gray-800 p-6 rounded-2xl prose prose-invert prose-p:text-gray-300 prose-headings:text-white">
                    {guidance.split('\n').map((line, i) => { if (line.startsWith('### ')) return <h3 key={i} className="font-bold text-lg mt-4 mb-2">{line.substring(4)}</h3>; if (line.startsWith('## ')) return <h2 key={i} className="font-bold text-xl mb-4 border-b border-gray-600 pb-2">{line.substring(3)}</h2>; if (line.startsWith('* ')) return <p key={i} className="ml-4">&bull; {line.substring(2)}</p>; return <p key={i}>{line}</p>; })}
                </div>
            )}

            <div className="space-y-6">
                {Object.keys(prCategories).map(category => (
                    prCategories[category].length > 0 && (
                        <div key={category}>
                            <h4 className="text-lg font-semibold text-blue-300 mb-3">{category}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {prCategories[category].map(pr => (
                                    <div key={pr.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="font-bold">{pr.name}</p>
                                            <p className="text-2xl text-yellow-400 font-mono">{pr.value} <span className="text-base text-gray-400">{pr.unit}</span></p>
                                            <p className="text-xs text-gray-500">on {pr.date}</p>
                                        </div>
                                        <div className="flex flex-col space-y-2">
                                            <button onClick={() => handleOpenModal(pr)} className="text-gray-400 hover:text-blue-400"><Edit size={16} /></button>
                                            <button onClick={() => onDeletePR(pr.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                ))}
            </div>

            {prs.length === 0 && !isLoading && (
                 <div className="text-center py-12 bg-gray-800 rounded-2xl"><p className="text-gray-400">你还没有记录任何PR。</p><p className="text-gray-500 mt-2">点击“添加/更新PR”按钮，开始记录你的成就吧！</p></div>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingPR ? '更新PR' : '添加新PR'}>
                <PRForm initialPR={editingPR} onSave={onSavePR} onClose={handleCloseModal} />
            </Modal>
        </div>
    );
};

const PRForm = ({ initialPR, onSave, onClose }) => {
    const [pr, setPr] = useState(initialPR || { name: '', value: '', unit: 'kg', date: new Date().toISOString().split('T')[0], category: '力量举重' });
    const handleChange = (e) => { const { name, value } = e.target; setPr(p => ({ ...p, [name]: value })); };
    const handleSubmit = (e) => { e.preventDefault(); onSave(pr); onClose(); };

    const commonMovements = {
        '力量举重': ['Back Squat (后蹲)', 'Front Squat (前蹲)', 'Overhead Squat (过顶蹲)', 'Deadlift (硬拉)', 'Bench Press (卧推)'],
        '奥林匹克举重': ['Snatch (抓举)', 'Clean (上搏)', 'Jerk (挺举)', 'Clean & Jerk (挺举)'],
        '体操与WODs': ['Fran', 'Murph', 'Cindy', 'Max Pull-ups (最大引体次数)', 'Max Muscle-ups (最大双力臂次数)']
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div><label className="block text-sm font-medium text-gray-300 mb-2">分类</label><select name="category" value={pr.category} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 transition"><option value="力量举重">力量举重</option><option value="奥林匹克举重">奥林匹克举重</option><option value="体操与WODs">体操与WODs</option></select></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-2">动作名称</label><input list="movements" type="text" name="name" value={pr.name} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 transition" required /><datalist id="movements">{commonMovements[pr.category].map(m => <option key={m} value={m} />)}</datalist></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">纪录</label><input type="text" name="value" value={pr.value} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 transition" required /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">单位</label><select name="unit" value={pr.unit} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 transition"><option value="kg">kg</option><option value="lbs">lbs</option><option value="reps">reps (次数)</option><option value="sec">sec (秒)</option><option value="min:sec">min:sec (分:秒)</option></select></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-300 mb-2">日期</label><input type="date" name="date" value={pr.date} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 transition" required /></div>
            <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">取消</button><button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center"><Save size={18} className="mr-2" />保存PR</button></div>
        </form>
    );
};

const PlanForm = ({ initialPlan, onSave, onClose }) => {
    const [plan, setPlan] = useState(initialPlan || { name: '', type: 'main', status: 'active', scope: 'weekly', phases: [], trainingMode: 'General' });
    const handleChange = (e) => { const { name, value } = e.target; setPlan(prev => ({ ...prev, [name]: value })); };
    const handleSubmit = (e) => { 
        e.preventDefault(); 
        const planToSave = { ...plan, phases: plan.phases || [] };
        onSave(planToSave); 
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">计划名称</label><input type="text" name="name" value={plan.name} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 transition" required /></div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">训练模式</label>
                    <select name="trainingMode" value={plan.trainingMode} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 transition">
                        <option value="General">通用健身</option>
                        <option value="CrossFit">CrossFit</option>
                    </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">计划类型</label><select name="type" value={plan.type} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 transition"><option value="main">主要计划</option><option value="rehab">康复计划</option></select></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">状态</label><select name="status" value={plan.status} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 transition"><option value="active">进行中</option><option value="todo">待办</option></select></div>
            </div>
            <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">取消</button><button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center"><Save size={18} className="mr-2" />保存计划</button></div>
        </form>
    );
};

const SmartImportForm = ({ plans, onImport, onClose }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [parsedPlan, setParsedPlan] = useState(null);
    const [targetPlanId, setTargetPlanId] = useState('new_plan');

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                setImageSrc(loadEvent.target.result);
                setParsedPlan(null);
                setError('');
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    setImageSrc(loadEvent.target.result);
                    setParsedPlan(null);
                    setError('');
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    };

    const handleRecognition = async () => {
        if (!imageSrc) {
            setError('请先上传或粘贴一张图片。');
            return;
        }
        setIsLoading(true);
        setError('');
        setParsedPlan(null);

        const base64ImageData = imageSrc.split(',')[1];
        const prompt = `Analyze the image of a weekly workout plan (which could be a table or handwritten notes). Extract the following structure:
1.  A main 'name' for the entire weekly plan.
2.  A 'trainingMode', which should be either 'CrossFit' or 'General'. Infer this from the exercise names. Default to 'General' if unsure.
3.  An array of 'phases'. Each phase should have a 'name' (e.g., "Week 1", "Activation Phase") and an array of 'dailyWorkouts'.
4.  For each daily workout:
    a. Extract a 'name' for the day (e.g., "Day 1: Legs", "Monday Squats").
    b. Extract an array of 'exercises'. For each exercise:
        i.  'name' (e.g., "Back Squat").
        ii. 'scoreType': Infer the most logical type from ['Weight & Reps', 'Reps Only', 'Time', 'Distance'].
        iii. 'category': If trainingMode is 'CrossFit', classify into ['Weightlifting', 'Gymnastics', 'Metcon']. Otherwise, classify by body part ['胸', '背', '腿', '肩', '手臂', '核心'].
        iv. All relevant metrics: 'sets', 'reps', 'weight', 'time' (as "mm:ss"), 'distance' (in meters). Only include metrics relevant to the scoreType.
Return a single JSON object. Assign progressive dates to each daily workout, starting from next Monday.`;

        const exerciseSchema = {
            type: "OBJECT",
            properties: {
                "name": { "type": "STRING" },
                "scoreType": { "type": "STRING", "enum": ['Weight & Reps', 'Reps Only', 'Time', 'Distance'] },
                "sets": { "type": "NUMBER" },
                "reps": { "type": "NUMBER" },
                "weight": { "type": "NUMBER" },
                "time": { "type": "STRING" },
                "distance": { "type": "NUMBER" },
                "category": { "type": "STRING" }
            },
            required: ["name", "scoreType", "category"]
        };
        
        const dailyWorkoutSchema = {
            type: "OBJECT",
            properties: {
                "date": { "type": "STRING", "description": "Date in YYYY-MM-DD format" },
                "name": { "type": "STRING" },
                "isCompleted": { "type": "BOOLEAN", "default": false },
                "exercises": { type: "ARRAY", items: exerciseSchema }
            },
            required: ["date", "name", "exercises"]
        };

        const phaseSchema = {
            type: "OBJECT",
            properties: {
                "name": { "type": "STRING" },
                "dailyWorkouts": { type: "ARRAY", items: dailyWorkoutSchema }
            },
            required: ["name", "dailyWorkouts"]
        };

        const schema = {
            type: "OBJECT",
            properties: {
                "name": { "type": "STRING" },
                "trainingMode": { "type": "STRING", "enum": ["CrossFit", "General"] },
                "phases": { type: "ARRAY", items: phaseSchema }
            },
            required: ["name", "trainingMode", "phases"]
        };

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: base64ImageData } }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: schema }
        };

        try {
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }
            const result = await response.json();
            if (result.candidates && result.candidates[0].content.parts.length > 0) {
                const jsonText = result.candidates[0].content.parts[0].text;
                const parsedJson = JSON.parse(jsonText);
                const finalPlan = {
                    type: 'main',
                    status: 'todo',
                    ...parsedJson,
                    phases: (parsedJson.phases || []).map(phase => ({
                        ...phase,
                        dailyWorkouts: (phase.dailyWorkouts || []).map(dw => ({
                            isCompleted: false,
                            ...dw,
                            exercises: (dw.exercises || []).map(ex => ({
                                sets: 0, reps: 0, weight: 0, time: '', distance: 0,
                                ...ex
                            }))
                        }))
                    }))
                };
                setParsedPlan(finalPlan);
            } else {
                throw new Error("未能从图片中识别出有效的周计划。");
            }
        } catch (err) {
            console.error(err);
            setError(`识别失败: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePlanChange = (field, value) => {
        setParsedPlan(prev => ({ ...prev, [field]: value }));
    };

    const handlePhaseChange = (pIndex, field, value) => {
        setParsedPlan(prev => ({
            ...prev,
            phases: prev.phases.map((p, i) => i === pIndex ? { ...p, [field]: value } : p)
        }));
    };
    
    const handleExerciseChange = (pIndex, wIndex, eIndex, field, value) => {
        setParsedPlan(prev => ({
            ...prev,
            phases: prev.phases.map((p, pi) => pi === pIndex ? {
                ...p,
                dailyWorkouts: p.dailyWorkouts.map((w, wi) => wi === wIndex ? {
                    ...w,
                    exercises: w.exercises.map((e, ei) => ei === eIndex ? { ...e, [field]: value } : e)
                } : w)
            } : p)
        }));
    };
    
    const removeExercise = (pIndex, wIndex, eIndex) => {
        setParsedPlan(prev => ({
            ...prev,
            phases: prev.phases.map((p, pi) => pi === pIndex ? {
                ...p,
                dailyWorkouts: p.dailyWorkouts.map((w, wi) => wi === wIndex ? {
                    ...w,
                    exercises: w.exercises.filter((_, ei) => ei !== eIndex)
                } : w)
            } : p)
        }));
    };

    const handleSubmit = () => {
        if (!parsedPlan) {
            setError("没有可保存的计划。");
            return;
        }

        if (targetPlanId === 'new_plan') {
            onImport(parsedPlan);
        } else {
            const existingPlan = plans.find(p => p.id === targetPlanId);
            if (!existingPlan) {
                setError('选择的目标计划不存在。');
                return;
            }
            const updatedPlan = {
                ...existingPlan,
                phases: [
                    ...(existingPlan.phases || []),
                    ...(parsedPlan.phases || [])
                ]
            };
            onImport(updatedPlan);
        }
    };

    return (
        <div className="space-y-4">
            {!parsedPlan && (
                <div className="bg-gray-700 p-4 rounded-lg border-2 border-dashed border-gray-500 space-y-4 my-4">
                    {!imageSrc && (
                        <div onPaste={handlePaste} className="flex flex-col items-center justify-center p-6 text-gray-400">
                            <p className="mb-2">将您的周计划图片粘贴到此处，或</p>
                            <input type="file" id="smartImageUpload" accept="image/*" onChange={handleImageChange} className="hidden" />
                            <label htmlFor="smartImageUpload" className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">选择文件</label>
                        </div>
                    )}
                    {imageSrc && (
                        <div className="flex flex-col items-center space-y-4">
                            <img src={imageSrc} alt="预览" className="max-h-64 rounded-lg" />
                            <div className="flex space-x-4">
                                <button onClick={() => setImageSrc(null)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">清除图片</button>
                                <button onClick={handleRecognition} disabled={isLoading} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center disabled:bg-green-800">
                                    {isLoading ? <><Loader2 className="animate-spin mr-2" /> 正在识别...</> : "开始识别"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isLoading && <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin h-12 w-12 text-blue-400" /></div>}
            {error && <p className="text-red-400 text-center text-sm p-4 bg-red-900/50 rounded-lg">{error}</p>}

            {parsedPlan && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">导入到</label>
                            <select value={targetPlanId} onChange={(e) => setTargetPlanId(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3">
                                <option value="new_plan">-- 创建一个新计划 --</option>
                                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className={targetPlanId === 'new_plan' ? 'block' : 'hidden'}>
                            <label className="block text-sm font-medium text-gray-300 mb-2">新计划名称</label>
                            <input type="text" value={parsedPlan.name} onChange={(e) => handlePlanChange('name', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3" placeholder="计划名称" />
                        </div>
                    </div>

                    {(parsedPlan.phases || []).map((phase, pIndex) => (
                        <div key={pIndex} className="bg-gray-700/50 p-4 rounded-lg space-y-3 border border-gray-600">
                             <input type="text" value={phase.name} onChange={(e) => handlePhaseChange(pIndex, 'name', e.target.value)} className="bg-transparent font-bold text-lg text-white w-full mb-2" />
                            {(phase.dailyWorkouts || []).map((workout, wIndex) => {
                                const categories = parsedPlan.trainingMode === 'CrossFit' ? ['Weightlifting', 'Gymnastics', 'Metcon'] : ['胸', '背', '腿', '肩', '手臂', '核心', '其他'];
                                return (
                                    <div key={wIndex} className="bg-gray-800 p-4 rounded-lg space-y-3">
                                        <input type="text" value={workout.name} onChange={(e) => handlePhaseChange(pIndex, 'dailyWorkouts', phase.dailyWorkouts.map((dw, dwi) => dwi === wIndex ? {...dw, name: e.target.value} : dw))} className="bg-transparent text-white font-bold text-lg w-full" />
                                        {(workout.exercises || []).map((ex, eIndex) => (
                                            <ExerciseEditor 
                                                key={eIndex}
                                                exercise={ex}
                                                onChange={(field, value) => handleExerciseChange(pIndex, wIndex, eIndex, field, value)}
                                                onRemove={() => removeExercise(pIndex, wIndex, eIndex)}
                                                categories={categories}
                                            />
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg">取消</button>
                        <button type="button" onClick={handleSubmit} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg flex items-center">
                            <Save size={18} className="mr-2" />
                            保存计划
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
