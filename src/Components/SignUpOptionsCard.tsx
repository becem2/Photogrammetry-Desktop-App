import { FormEvent, useState } from "react";
import { Mail, Eye, EyeOff, Lock } from 'lucide-react';

import Button from "./SocialLogInButtons";
import { createUserWithEmailAndPassword, signInWithPopup, User, sendEmailVerification } from "firebase/auth";
import { auth, googleProvider, facebookProvider, githubProvider, appleProvider } from "../Config/Firebase";

interface SignUpOptionsCardProps {
    onSwitch: () => void;
    onSignUpSuccess: (user: User) => void;
}

function SignUpOptionsCard({ onSwitch, onSignUpSuccess }: SignUpOptionsCardProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            console.log("Passwords do not match!");
            return;
        }
        if (password.length < 6) {
            console.log("Password must be at least 6 characters.");
            return;
        }
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(result.user);
            onSignUpSuccess(result.user);
        } catch (error) {
            console.log((error as Error).message);
        }
    };

    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            onSignUpSuccess(result.user);
        } catch (error) {
            console.log(error);
        }
    };

    const signInWithFacebook = async () => {
        try {
            const result = await signInWithPopup(auth, facebookProvider);
            onSignUpSuccess(result.user);
        } catch (error) {
            console.log(error);
        }
    };

    const signInWithApple = async () => {
        try {
            const result = await signInWithPopup(auth, appleProvider);
            onSignUpSuccess(result.user);
        } catch (error) {
            console.log(error);
        }
    };

    const signInWithGithub = async () => {
        try {
            const result = await signInWithPopup(auth, githubProvider);
            onSignUpSuccess(result.user);
        } catch (error) {
            console.log(error);
        }
    };

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
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">Email Address</label>
                    <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-inset">
                        <Mail size={20} className="mr-3 text-gray-400" />
                        <input
                            type="email"
                            placeholder="you@example.com"
                            className="border-none outline-none flex-1 text-sm text-gray-900"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">Password</label>
                    <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-inset">
                        <Lock size={20} className="mr-3 text-gray-400" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="border-none outline-none flex-1 text-sm text-gray-900"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <div className="flex items-center cursor-pointer ml-2" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff size={20} className="text-gray-400" /> : <Eye size={20} className="text-gray-400" />}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">Confirm Password</label>
                    <div className={`flex items-center border rounded-lg px-3 py-2 bg-white transition-all duration-200 ${password !== confirmPassword && confirmPassword ? 'border-red-500' : 'border-gray-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-inset'}`}>
                        <Lock size={20} className="mr-3 text-gray-400" />
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            className="border-none outline-none flex-1 text-sm text-gray-900"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <div className="flex items-center cursor-pointer ml-2" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? <EyeOff size={20} className="text-gray-400" /> : <Eye size={20} className="text-gray-400" />}
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-lg border-none cursor-pointer transition-colors duration-300 hover:bg-emerald-700"
                >
                    Sign Up
                </button>
            </form>

            <p className="text-sm mt-4 text-center text-gray-500">
                Already have an account?{" "}
                <a
                    href="#"
                    className="text-emerald-600 no-underline font-semibold"
                    onClick={(e) => {
                        e.preventDefault();
                        onSwitch();
                    }}
                >
                    Sign in
                </a>
            </p>
            <p className="text-xs text-gray-400 mt-5 text-center">© 2026 DroneMesh Pro. All rights reserved.</p>
        </div>
    );
}

export default SignUpOptionsCard;