import { FaMoneyBillWave, FaHeart, FaChartPie } from 'react-icons/fa';

export default function MobileNav({ activeTab, setActiveTab }) {
    return (
        <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-2 z-50 pb-safe">
            <div className="flex justify-around items-center">
                <NavButton
                    active={activeTab === 'expenses'}
                    onClick={() => setActiveTab('expenses')}
                    icon={<FaMoneyBillWave />}
                    label="Expenses"
                />
                <NavButton
                    active={activeTab === 'marriage'}
                    onClick={() => setActiveTab('marriage')}
                    icon={<FaHeart />}
                    label="Marriage"
                />
            </div>
        </div>
    );
}

function NavButton({ active, onClick, icon, label }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg w-full transition ${active ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'
                }`}
        >
            <span className="text-xl">{icon}</span>
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
}