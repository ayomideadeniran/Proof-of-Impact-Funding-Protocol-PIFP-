export async function sha256ToFeltHex(input: string): Promise<string> {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const arr = new Uint8Array(digest);
    // Clamp to 251 bits for Starknet felt range.
    arr[0] &= 0x07;
    return `0x${Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

