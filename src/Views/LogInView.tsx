import { useEffect, useState } from "react";
import LogInCard from "../Components/LogInView/LogInCard";
import SignUpOptionsCard from "../Components/LogInView/SignUpOptionsCard";
import AdditionalInfoCard from "../Components/LogInView/AdditionalInfoCard";
import ForgetPasswordCard from "../Components/LogInView/ForgerPasswordCard";
import CheckYourEmailCard from "../Components/LogInView/CheckYourEmail";
import LeftSide from "../Components/LogInView/LeftSide";
import { User } from "firebase/auth";

// Top-level login/sign-up screen that swaps between auth states and profile completion.
interface LogInSignUpProps {
    onUserDataComplete: () => void;
    pendingProfileUser?: {
        uid: string;
        email: string;
        displayName: string;
        providerId: string;
    } | null;
}

const splitDisplayName = (displayName: string) => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
        return { firstName: "", lastName: "" };
    }

    const nameParts = trimmedName.split(/\s+/);
    return {
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" "),
    };
};

function LogInSignUp({ onUserDataComplete, pendingProfileUser = null }: LogInSignUpProps) {
    const [isLogIn, setIsLogIn] = useState(true);
    const [isForgetPassword, setIsForgetPassword] = useState(false);
    const [isCheckYourEmail, setIsCheckYourEmail] = useState(false);
    const [isAdditionalInfo, setIsAdditionalInfo] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState("");
    const [currentUserUid, setCurrentUserUid] = useState("");
    const [currentUserEmail, setCurrentUserEmail] = useState("");
    const [currentUserProvider, setCurrentUserProvider] = useState("password");
    const [prefilledFirstName, setPrefilledFirstName] = useState("");
    const [prefilledLastName, setPrefilledLastName] = useState("");

    useEffect(() => {
        if (!pendingProfileUser?.uid) {
            return;
        }

        const prefilledNames = splitDisplayName(pendingProfileUser.displayName || "");

        setCurrentUserUid(pendingProfileUser.uid);
        setCurrentUserEmail(pendingProfileUser.email || "");
        setCurrentUserProvider(pendingProfileUser.providerId || "password");
        setPrefilledFirstName(prefilledNames.firstName);
        setPrefilledLastName(prefilledNames.lastName);
        setIsLogIn(false);
        setIsForgetPassword(false);
        setIsCheckYourEmail(false);
        setIsAdditionalInfo(true);
    }, [pendingProfileUser]);

    const isProfileCompletionRequired = isAdditionalInfo && currentUserUid.length > 0;

    useEffect(() => {
        if (!isProfileCompletionRequired) {
            return;
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [isProfileCompletionRequired]);

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
        const prefilledNames = splitDisplayName(user.displayName || "");
        setCurrentUserUid(user.uid);
        setCurrentUserEmail(user.email || "");
        setCurrentUserProvider(user.providerData[0]?.providerId || "password");
        setPrefilledFirstName(prefilledNames.firstName);
        setPrefilledLastName(prefilledNames.lastName);
        setIsAdditionalInfo(true);
    };

    return (
        <div className="flex h-screen w-full m-0 p-0">
            <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center">
                <LeftSide />
            </div>
            <div className="bg-white flex-1 flex items-center justify-center p-4 md:p-8">
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
                        authProvider={currentUserProvider}
                        initialFirstName={prefilledFirstName}
                        initialLastName={prefilledLastName}
                        onComplete={() => { 
                            setIsAdditionalInfo(false); 
                            setIsLogIn(true); 
                            onUserDataComplete();
                        }}
                    />
                ) : (
                    <SignUpOptionsCard 
                        onSwitch={() => {
                            if (!isProfileCompletionRequired) {
                                setIsLogIn(true);
                            }
                        }} 
                        onSignUpSuccess={handleSignUpSuccess}
                    />
                )}
            </div>
        </div>
    );
}   

export default LogInSignUp;