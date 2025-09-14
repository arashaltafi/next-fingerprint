"use client";

import React, { useState } from "react";

function bufferToBase64Url(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let str = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBuffer(base64url: string) {
    // pad
    base64url = base64url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64url.length % 4) base64url += "=";
    const str = atob(base64url);
    const buf = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i);
    return buf.buffer;
}

const Fingerprint = () => {
    const [msg, setMsg] = useState<string>("برای شروع ثبت یا احراز هویت کنید.");
    const storageKey = "webauthn_credential_id";

    const supportsWebAuthn = () => {
        return !!(window.PublicKeyCredential && navigator.credentials);
    };

    const createCredential = async () => {
        if (!supportsWebAuthn()) {
            setMsg("دستگاه یا مرورگر شما WebAuthn را پشتیبانی نمی‌کند.");
            return;
        }

        try {
            // challenge و user.id معمولاً از سرور می‌آیند — اینجا برای دمو تولید می‌کنیم
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const userId = new Uint8Array(16);
            window.crypto.getRandomValues(userId);

            const publicKey: PublicKeyCredentialCreationOptions = {
                challenge: challenge.buffer,
                rp: {
                    name: "Demo App",
                    id: window.location.hostname, // باید با origin / domain همخوانی داشته باشه
                },
                user: {
                    id: userId.buffer,
                    name: "demo.user@example.com",
                    displayName: "Demo User",
                },
                pubKeyCredParams: [
                    { type: "public-key", alg: -7 }, // ES256
                    { type: "public-key", alg: -257 }, // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform", // تلاش برای استفاده از fingerprint/FaceID روی دستگاه کاربر
                    userVerification: "required",
                },
                timeout: 60000,
                attestation: "none",
            };

            const credential = (await navigator.credentials.create({
                publicKey,
            })) as PublicKeyCredential | null;

            if (!credential) {
                setMsg("ثبت اعتبارنامه انجام نشد.");
                return;
            }

            // ذخیره credential ID برای استفاده در احراز هویت بعد
            const rawId = credential.rawId;
            const idBase64 = bufferToBase64Url(rawId);
            localStorage.setItem(storageKey, idBase64);

            setMsg("✅ ثبت اثر انگشت (credential) با موفقیت انجام شد.");
        } catch (err: any) {
            console.error(err);
            setMsg("❌ خطا در ثبت: " + (err?.message ?? String(err)));
        }
    };

    const authenticate = async () => {
        if (!supportsWebAuthn()) {
            setMsg("دستگاه یا مرورگر شما WebAuthn را پشتیبانی نمی‌کند.");
            return;
        }

        const stored = localStorage.getItem(storageKey);
        if (!stored) {
            setMsg("هیچ اعتبارنامه‌ای ثبت نشده — ابتدا Register را بزنید.");
            return;
        }

        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const allowCredential = {
                id: base64UrlToBuffer(stored),
                type: "public-key" as const,
                transports: ["internal" as const],
            };

            const publicKey: PublicKeyCredentialRequestOptions = {
                challenge: challenge.buffer,
                timeout: 60000,
                userVerification: "required",
                allowCredentials: [allowCredential],
            };

            const assertion = (await navigator.credentials.get({
                publicKey,
            })) as PublicKeyCredential | null;

            if (!assertion) {
                setMsg("❌ احراز هویت ناموفق بود.");
                return;
            }

            // در اپ واقعی: باید assertion.response (signature, clientDataJSON, authenticatorData)
            // را به سرور بفرستید و اعتبارسنجی را انجام دهید.
            setMsg("✅ احراز هویت با اثر انگشت موفق بود.");
        } catch (err: any) {
            console.error(err);
            // پیام‌های خطا می‌تواند شامل Cancelled, NotAllowedError, InvalidStateError و ... باشد
            if (err?.name === "NotAllowedError") {
                setMsg("❌ عملیات توسط کاربر لغو یا timeout شد.");
            } else {
                setMsg("❌ خطا در احراز هویت: " + (err?.message ?? String(err)));
            }
        }
    };

    const clearStorage = () => {
        localStorage.removeItem(storageKey);
        setMsg("اطلاعات محلی حذف شد.");
    };

    return (
        <div className="flex items-center justify-center flex-col gap-8">
            <h2 className="text-2xl font-semibold">احراز هویت با اثر انگشت (WebAuthn)</h2>

            <div className="flex gap-3">
                <button
                    onClick={createCredential}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                    Register (ثبت اثر انگشت)
                </button>
                <button
                    onClick={authenticate}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    Authenticate (احراز هویت)
                </button>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => {
                        if (!supportsWebAuthn()) {
                            alert("دستگاه شما WebAuthn را پشتیبانی نمی‌کند.");
                        } else {
                            alert("اگر دستگاه پشتیبانی کند، با بازشدن پرامپت اثر انگشت/بیومتریک دیده می‌شود.");
                        }
                    }}
                    className="px-3 py-2 border rounded-lg"
                >
                    تست پشتیبانی
                </button>

                <button onClick={clearStorage} className="px-3 py-2 border rounded-lg">
                    پاک کردن ذخیره محلی
                </button>
            </div>

            <p className="p-3 bg-gray-100 rounded-md text-gray-800">{msg}</p>

            <p className="text-base text-gray-500">
                توجه: این نمونه برای تست محلی است. در اپ واقعی شما باید challenge را از سرور بگیرید و بعد از assertion
                آن را در سرور اعتبارسنجی کنید.
            </p>
        </div>
    );
}

export default Fingerprint;