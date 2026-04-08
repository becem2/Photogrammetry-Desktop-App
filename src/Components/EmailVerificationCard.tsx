import { useState, type FormEvent, useRef, type KeyboardEvent } from "react";
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';

function EmailVerification({ onBack, onVerify, email }: { onBack: () => void, onVerify: (code: string) => void, email: string }) {
    const [code, setCode] = useState<string[]>(new Array(6).fill(""));
    const [isResending, setIsResending] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (value: string, index: number) => {
        if (isNaN(Number(value))) return;

        const newCode = [...code];
        newCode[index] = value.substring(value.length - 1);
        setCode(newCode);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const verificationCode = code.join("");
        if (verificationCode.length === 6) {
            onVerify(verificationCode);
        }
    };

    const handleResend = async () => {
        setIsResending(true);
        console.log("Resending code to:", email);
        setTimeout(() => setIsResending(false), 2000);
    };

    return (
        <div className="bg-white rounded-2xl p-10 w-3/5 min-w-96 h-auto shadow-lg text-left border border-gray-300">
            <button 
                onClick={onBack}
                className="flex items-center text-gray-500 hover:text-emerald-600 transition-colors mb-6 border-none bg-transparent cursor-pointer p-0 text-sm font-medium"
            >
                <ArrowLeft size={18} className="mr-2" />
                Back to Sign Up
            </button>

            <div className="flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-xl mb-6">
                <Mail className="text-emerald-600" size={28} />
            </div>

            <h1 className="text-2xl font-bold mb-2 text-gray-900">Verify your email</h1>
            <p className="text-sm text-gray-500 mb-8">
                We've sent a 6-digit verification code to <span className="font-semibold text-gray-700">{email || "your email"}</span>
            </p>

            <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
                <div className="flex justify-between gap-2">
                    {code.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => (inputRefs.current[index] = el)}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(e.target.value, index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            className="w-12 h-14 text-center text-xl font-bold border border-gray-300 rounded-lg focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600 focus:ring-inset outline-none transition-all duration-200"
                            required
                        />
                    ))}
                </div>

                <button
                    type="submit"
                    disabled={code.some(d => d === "")}
                    className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-lg border-none cursor-pointer transition-colors hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Verify Account
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                    Didn't receive the code?
                </p>
                <button
                    onClick={handleResend}
                    disabled={isResending}
                    className="mt-2 flex items-center justify-center w-full text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors bg-transparent border-none cursor-pointer disabled:text-gray-400"
                >
                    <RefreshCw size={16} className={`mr-2 ${isResending ? 'animate-spin' : ''}`} />
                    {isResending ? "Sending..." : "Resend Code"}
                </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-10">© 2026 DroneMesh Pro. All rights reserved.</p>
        </div>
    );
}

export default EmailVerification;