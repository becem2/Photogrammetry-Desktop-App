import { useState, FormEvent } from "react";
import { User, Building2, Phone, Briefcase } from 'lucide-react';
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../Config/Firebase";

interface AdditionalInfoCardProps {
    uid: string;
    email: string;
    onComplete: () => void;
}

function AdditionalInfoCard({ uid, email, onComplete }: AdditionalInfoCardProps) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [organization, setOrganization] = useState("");
    const [role, setRole] = useState("");
    const [mobilePhone, setMobilePhone] = useState("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await setDoc(doc(db, "Users", uid), {
                email,
                firstName,
                lastName,
                organization,
                role,
                mobilePhone
            }, { merge: true });

            console.log("Additional info saved successfully!");
            onComplete();
        } catch (error) {
            console.log((error as Error).message);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-10 w-3/5 min-w-96 h-auto shadow-lg text-left border border-gray-300">
            <h1 className="text-2xl font-bold mb-2 text-gray-900">Complete Your Profile</h1>
            <p className="text-sm text-gray-500 mb-6">Please provide additional information to finish setting up your account</p>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>

                {/* First Name */}
                <div className="flex flex-col gap-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        First Name
                    </label>
                    <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-inset">
                        <User size={20} className="mr-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="First Name"
                            className="border-none outline-none flex-1 text-sm w-full"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                    </div>
                </div>

                {/* Last Name */}
                <div className="flex flex-col gap-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Last Name
                    </label>
                    <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-inset">
                        <User size={20} className="mr-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Last Name"
                            className="border-none outline-none flex-1 text-sm w-full"
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                </div>

                {/* Organization */}
                <div className="flex flex-col gap-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Organization
                    </label>
                    <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-inset">
                        <Building2 size={20} className="mr-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Your Organization"
                            className="border-none outline-none flex-1 text-sm w-full"
                            required
                            value={organization}
                            onChange={(e) => setOrganization(e.target.value)}
                        />
                    </div>
                </div>

                {/* Role */}
                <div className="flex flex-col gap-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Role
                    </label>
                    <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-inset">
                        <Briefcase size={20} className="mr-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Your Role"
                            className="border-none outline-none flex-1 text-sm w-full"
                            required
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        />
                    </div>
                </div>

                {/* Mobile Phone */}
                <div className="flex flex-col gap-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Mobile Phone
                    </label>
                    <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-inset">
                        <Phone size={20} className="mr-3 text-gray-400" />
                        <input
                            type="tel"
                            placeholder="Your Mobile Phone"
                            className="border-none outline-none flex-1 text-sm w-full"
                            required
                            value={mobilePhone}
                            onChange={(e) => setMobilePhone(e.target.value)}
                        />
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors duration-300 hover:bg-emerald-700 cursor-pointer"
                >
                    Complete Profile
                </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-7">
                © 2026 DroneMesh Pro. All rights reserved.
            </p>
        </div>
    );
}

export default AdditionalInfoCard;