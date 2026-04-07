

// Types for the props to control navigation from outside
interface CheckYourEmailCardProps {
    email: string;
    onBackToLogin: () => void;
    onTryDifferentEmail: () => void;
}

function CheckYourEmailCard({ 
    email,
    onBackToLogin, 
    onTryDifferentEmail 
}: CheckYourEmailCardProps) {

    return (
        <div className="bg-white rounded-2xl p-10 w-3/5 min-w-96 h-auto shadow-lg text-left">
            {/* Back Button */}
            <div className="flex justify-start mb-5 hover:cursor-pointer">
                <button
                    type="button"
                    onClick={onBackToLogin}
                    className="text-gray-500 text-sm flex items-center gap-2 transition-colors hover:text-gray-900 border-none bg-transparent p-0 cursor-pointer"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    <span>Back to Login</span>
                </button>
            </div>

            {/* Main Content */}
            <div className="flex flex-col items-center text-center">
                {/* Success Icon Box */}
                <div className="bg-emerald-100 w-16 h-16 rounded-lg flex justify-center items-center mb-6">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg viewBox="0 0 52 52" className="absolute w-full h-full text-emerald-600" fill="none">
                            <circle cx="26" cy="26" r="25" stroke="currentColor" strokeWidth="2"/>
                            <path stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M16 26l8 8 16-16"/>
                        </svg>
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
                <p className="text-sm text-gray-500 mb-2">
                    We've sent password reset instructions to
                </p>
                
                <p className="text-sm text-emerald-600 font-semibold mb-4">{email}</p>
                
                <p className="text-sm text-gray-500 mb-6">
                    If you don't see the email, check your spam folder or try again with a different email address.
                </p>

                {/* Primary Action Button */}
                <button 
                    type="button" 
                    onClick={onTryDifferentEmail}
                    className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-lg border-none cursor-pointer transition-colors hover:bg-emerald-700"
                >
                    Try Different Email
                </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-7">© 2026 DroneMesh Pro. All rights reserved.</p>
        </div>
    );
}

export default CheckYourEmailCard;