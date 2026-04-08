import { useState } from "react";
import LogInCard from "../Components/LogInCard";
import SignUpOptionsCard from "../Components/SignUpOptionsCard";
import AdditionalInfoCard from "../Components/AdditionalInfoCard";
import ForgetPasswordCard from "../Components/ForgerPasswordCard";
import CheckYourEmailCard from "../Components/CheckYourEmail";
import LeftSide from "../Components/LeftSide";
import { User } from "firebase/auth";

interface LogInSignUpProps {
    onUserDataComplete: () => void;
}

function LogInSignUp({ onUserDataComplete }: LogInSignUpProps) {
    const [isLogIn, setIsLogIn] = useState(true);
    const [isForgetPassword, setIsForgetPassword] = useState(false);
    const [isCheckYourEmail, setIsCheckYourEmail] = useState(false);
    const [isAdditionalInfo, setIsAdditionalInfo] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState("");
    const [currentUserUid, setCurrentUserUid] = useState("");
    const [currentUserEmail, setCurrentUserEmail] = useState("");

    const handleEmailSubmitted = (email: string) => {
        setSubmittedEmail(email);
        setIsCheckYourEmail(true);
        setIsForgetPassword(false);
    };

    const handleTryDifferentEmail = () => {
        setIsCheckYourEmail(false);
        setIsForgetPassword(true);
        setSubmittedEmail("");
    };

    const handleBackToLogin = () => {
        setIsCheckYourEmail(false);
        setIsForgetPassword(false);
        setIsLogIn(true);
    };

    const handleSignUpSuccess = (user: User) => {
        setCurrentUserUid(user.uid);
        setCurrentUserEmail(user.email || "");
        setIsAdditionalInfo(true);
    };

    return (
        <div className="flex flex-row min-h-screen w-screen m-0 p-0">
            <div className="bg-blue-600 flex-1 flex items-center justify-center">
                <LeftSide />
            </div>
            <div className="bg-white flex-1 flex items-center justify-center">
                {isLogIn ? (
                    isCheckYourEmail ? (
                        <CheckYourEmailCard
                            email={submittedEmail}
                            onBackToLogin={handleBackToLogin}
                            onTryDifferentEmail={handleTryDifferentEmail}
                        />
                    ) : isForgetPassword ? (
                        <ForgetPasswordCard
                            onBack={() => setIsForgetPassword(false)}
                            onEmailSubmitted={handleEmailSubmitted}
                        />
                    ) : (
                        <LogInCard
                            onSignUp={() => setIsLogIn(false)}
                            onForgot={() => setIsForgetPassword(true)}
                        />
                    )
                ) : isAdditionalInfo ? (
                    <AdditionalInfoCard 
                        uid={currentUserUid} 
                        email={currentUserEmail} 
                        onComplete={() => { 
                            setIsAdditionalInfo(false); 
                            setIsLogIn(true); 
                            onUserDataComplete();
                        }}
                    />
                ) : (
                    <SignUpOptionsCard 
                        onSwitch={() => setIsLogIn(true)} 
                        onSignUpSuccess={handleSignUpSuccess}
                    />
                )}
            </div>
        </div>
    );
}   

export default LogInSignUp;