"use client";

import React, { useState } from "react";

const Fingerprint = () => {
    const [message, setMessage] = useState<string>("");

    const handleFingerprint = async () => {
        if (!("credentials" in navigator)) {
            alert("❌ Your device does not support fingerprint/biometric authentication.");
            return;
        }

        try {
            // Generate dummy challenge (server normally sends this)
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const publicKey: PublicKeyCredentialRequestOptions = {
                challenge,
                timeout: 60000,
                userVerification: "required", // enforce biometrics if available
            };

            const credential = await navigator.credentials.get({
                publicKey,
            });

            if (credential) {
                setMessage("✅ Fingerprint authentication successful!");
            } else {
                setMessage("❌ Authentication failed.");
            }
        } catch (error) {
            console.error(error);
            setMessage("❌ Error: " + (error as Error).message);
        }
    };

    return (
        <div className="flex flex-col items-center gap-16 mx-auto">
            <button
                onClick={handleFingerprint}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
            >
                Authenticate with Fingerprint
            </button>

            <p className="text-center text-gray-500">{message}</p>
        </div>
    );
};

export default Fingerprint;