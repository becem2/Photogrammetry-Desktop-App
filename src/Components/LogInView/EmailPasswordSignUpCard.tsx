import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Mail, Lock, User, Building2 } from 'lucide-react';

import Button from "./SocialLogInButtons";
import { auth, facebookProvider, githubProvider, googleProvider, db } from '../../Config/Firebase'
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { setDoc, doc } from "firebase/firestore";

// Email/password sign-up form plus social sign-up shortcuts.
function SignUpCard({ onSwitch, onSignUpSuccess }: { onSwitch: () => void; onSignUpSuccess: (email: string) => void; }) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [confirmPassword, setConfirmPassword] = useState("");
    const [fName, setfName] = useState("");
    const [lName, setlName] = useState("");
    const [org, setOrg] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!acceptedTerms) return;

        if (password !== confirmPassword) {
            console.log("Passwords do not match!");
            return;
        }

        if (password.length < 6) {
            console.log("Password must be at least 6 characters.");
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            const user = auth.currentUser;
            
            if (user) {
                await setDoc(doc(db, "Users", user.uid), {
                    email: user.email,
                    firstName: fName,
                    lastName: lName,
                    organization: org
                });
                
                console.log("User created and stored successfully!");
                onSignUpSuccess(email);
            }
        } catch (error) {
            console.log((error as Error).message);
        }
    };



    // Social sign-in helpers map each provider to the matching Firebase auth flow.
    const signInWithFacebook = async () => {
        try {
            await signInWithPopup(auth, facebookProvider);
        } catch (error) {
            console.log(error);
        }
    }


    const signInWithApple = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.log(error);
        }
    }



    const signInWithGithub = async () => {
        try {
            await signInWithPopup(auth, githubProvider);
        } catch (error) {
            console.log(error);
        }
    }


    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            
            const userEmail = result.user.email;

            if (userEmail) {
                setEmail(userEmail);
            }

            console.log("Google Sign-In Successful");
        } catch (error) {
            console.error("Error during Google Sign-In:", error);
        }
    }

    return (
        <div className="bg-white rounded-2xl p-10 w-3/5 min-w-96 h-auto shadow-lg text-left">
            <h1 className="text-2xl font-bold mb-2 text-gray-900">Create Your Account</h1>
            <p className="text-sm text-gray-500 mb-6">Join DroneMesh Pro for professional photogrammetry</p>

            <div className="grid grid-cols-2 gap-2.5 mb-5">
                <Button text="Google" onClick={signInWithGoogle} />
                <Button text="Facebook" onClick={signInWithFacebook} />
                <Button text="Apple" onClick={signInWithApple} />
                <Button text="Github" onClick={signInWithGithub} />
            </div>

            <div className="flex items-center text-xs text-gray-400 my-5">
                <span className="flex-1 h-px bg-gray-300"></span>
                <span className="px-3">Or continue with email</span>
                <span className="flex-1 h-px bg-gray-300"></span>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="flex gap-5 w-full">
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-inset">
                            <User size={20} className="mr-3 text-gray-400" />
                            <input type="text" placeholder="Jeffery" className="border-none outline-none flex-1 text-sm w-full" required value={fName} onChange={(e) => setfName(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-inset">
                            <User size={20} className="mr-3 text-gray-400" />
                            <input type="text" placeholder="Epstein" className="border-none outline-none flex-1 text-sm w-full" required value={lName} onChange={(e) => setlName(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Organization</label>
                    <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-inset">
                        <Building2 size={20} className="mr-3 text-gray-400" />
                        <input type="text" placeholder="National School of Engineering" className="border-none outline-none flex-1 text-sm w-full" required value={org} onChange={(e) => setOrg(e.target.value)} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-inset">
                        <Mail size={20} className="mr-3 text-gray-400" />
                        <input type="email" placeholder="you@example.com" className="border-none outline-none flex-1 text-sm w-full" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                    <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-inset">
                        <Lock size={20} className="mr-3 text-gray-400" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="border-none outline-none flex-1 text-sm w-full"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <div className="flex items-center cursor-pointer ml-2" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff size={20} className="text-gray-400" /> : <Eye size={20} className="text-gray-400" />}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                    <div className={`flex items-center border rounded-lg px-3 py-2 bg-white transition-colors ${password !== confirmPassword && confirmPassword ? 'border-red-500' : 'border-gray-300'}`}>
                        <Lock size={20} className="mr-3 text-gray-400" />
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            className="border-none outline-none flex-1 text-sm w-full"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <div className="flex items-center cursor-pointer ml-2" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? <EyeOff size={20} className="text-gray-400" /> : <Eye size={20} className="text-gray-400" />}
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-2 my-1">
                    <input
                        type="checkbox"
                        className="mt-0.5 cursor-pointer accent-emerald-600"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                    />
                    <label className="text-xs text-gray-600">
                        I agree to the <a href="#" className="text-emerald-600 no-underline font-medium">Terms of Service</a> and <a href="#" className="text-emerald-600 no-underline font-medium">Privacy Policy</a>
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={!acceptedTerms}
                    className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-lg border-none cursor-pointer transition-colors hover:bg-emerald-700 mt-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Sign Up
                </button>
            </form>

            <p className="text-sm text-center text-gray-500 mt-6">
                Already have an account? <a href="#" onClick={onSwitch} className="text-emerald-600 no-underline font-semibold">Sign in</a>
            </p>
            <p className="text-xs text-gray-400 text-center mt-7">© 2026 DroneMesh Pro. All rights reserved.</p>
        </div>
    );
}

export default SignUpCard;