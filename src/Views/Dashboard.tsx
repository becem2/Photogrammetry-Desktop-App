

import { type User } from "firebase/auth";

interface DashboardProps {
    user: User | null;
    onLogout: () => void;
}

function Dashboard({ user, onLogout }: DashboardProps) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-4xl">
                <div className="flex flex-col gap-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                            <p className="text-sm text-gray-500 mt-2">
                                Welcome back{user?.email ? `, ${user.email}` : ""}.
                            </p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="bg-emerald-600 text-white font-semibold px-5 py-3 rounded-lg transition-colors hover:bg-emerald-700"
                        >
                            Sign Out
                        </button>
                    </div>

                    <div className="rounded-3xl border border-gray-200 p-8 bg-slate-50">
                        <p className="text-gray-700 text-base">
                            Your secure dashboard is still in developpement, if you would be patient we will 
                            continue to devlop it sometimes this year (hopefully) !!!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;