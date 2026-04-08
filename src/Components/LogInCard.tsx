import { FormEvent, useState } from "react";
import { Mail, Eye, EyeOff, Lock } from 'lucide-react';

import Button from "./SocialLogInButtons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../Config/Firebase";

interface LogInCardProps {
    onSignUp: () => void;
    onForgot: () => void;
}



function LogInCard({ onSignUp, onForgot }: LogInCardProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [email,setEmail] = useState("");
    const [password,setPassword] = useState("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth,email,password);
            console.log("User logged in Succesefully!!!");
        } catch (error) {
            console.log((error as Error).message);
            
        }
    }

    return (
        <div className="bg-white rounded-2xl p-10 w-3/5 min-w-96 h-auto shadow-lg text-left border border-gray-300">
            
            <h1 className="text-2xl font-bold mb-2 text-gray-900">Welcome back</h1>
            
            <p className="text-sm text-gray-500 mb-6">Sign in to continue to your projects</p>


            <div className="grid grid-cols-2 gap-2 mb-5">
                <Button text="Google" />
                <Button text="Facebook" />
                <Button text="Apple" />
                <Button text="Github" />
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
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <div className="flex items-center cursor-pointer ml-2" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff size={20} className="text-gray-400" /> : <Eye size={20} className="text-gray-400" />}
                        </div>
                    </div>
                </div>


                <div className="flex justify-between items-center text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="accent-emerald-600" /> 
                        <span>Remember me</span>
                    </label>
                    <a 
                        href="#"
                        className="text-emerald-600 no-underline hover:underline"
                        onClick={(e) => {
                            e.preventDefault();
                            onForgot();
                        }}
                    >
                        Forgot password?
                    </a>
                </div>


                <button 
                    type="submit" 
                    className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-lg border-none cursor-pointer transition-colors duration-300 hover:bg-emerald-700"
                >
                    Sign In
                </button>
            </form>

            <p className="text-sm mt-4 text-center text-gray-500">
                Don't have an account?{" "}
                <a 
                    href="#" 
                    className="text-emerald-600 no-underline font-semibold"
                    onClick={(e) => {
                        e.preventDefault();
                        onSignUp();
                    }}
                >
                    Sign up for free
                </a>
            </p>
            <p className="text-xs text-gray-400 mt-5 text-center">© 2026 DroneMesh Pro. All rights reserved.</p>
        </div>
    );
}

export default LogInCard;