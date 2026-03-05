export type ProjectEvidence = {
    title: string;
    description: string;
    imageUrl: string;
    videoUrl: string;
    proofLinks: string[];
    proofHash?: string;
    createdAt: number;
    creatorAddress?: string;
};

const STORAGE_KEY_PREFIX = "pifp_project_metadata_v2";
const LEGACY_STORAGE_KEY_PREFIX = "pifp_project_metadata_v1";
const HASH_STORAGE_KEY = "pifp_project_metadata_by_hash_v1";

function canUseStorage(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function storageKeyForContract(contractAddress: string): string {
    return `${STORAGE_KEY_PREFIX}:${contractAddress.toLowerCase()}`;
}

function readMap(raw: string | null): Record<string, ProjectEvidence> {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as Record<string, ProjectEvidence>;
        return parsed ?? {};
    } catch {
        return {};
    }
}

function normalizeHashKey(proofHash: string): string {
    return proofHash.trim().toLowerCase();
}

export function loadProjectMetadataMap(contractAddress: string): Record<string, ProjectEvidence> {
    if (!canUseStorage()) return {};
    if (!contractAddress) return {};

    const current = readMap(window.localStorage.getItem(storageKeyForContract(contractAddress)));
    if (Object.keys(current).length > 0) return current;

    const merged: Record<string, ProjectEvidence> = {};
    for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key?.startsWith(`${LEGACY_STORAGE_KEY_PREFIX}:`)) continue;
        const legacyMap = readMap(window.localStorage.getItem(key));
        for (const [projectId, metadata] of Object.entries(legacyMap)) {
            merged[projectId] = merged[projectId] ?? metadata;
        }
    }

    return merged;
}

export function saveProjectMetadata(contractAddress: string, projectId: number, metadata: ProjectEvidence): void {
    if (!canUseStorage()) return;
    if (!contractAddress) return;

    const existing = loadProjectMetadataMap(contractAddress);
    existing[String(projectId)] = metadata;
    window.localStorage.setItem(storageKeyForContract(contractAddress), JSON.stringify(existing));

    if (metadata.proofHash) {
        const byHash = readMap(window.localStorage.getItem(HASH_STORAGE_KEY));
        byHash[normalizeHashKey(metadata.proofHash)] = metadata;
        window.localStorage.setItem(HASH_STORAGE_KEY, JSON.stringify(byHash));
    }
    window.dispatchEvent(new Event("pifp:projects-updated"));
}

export function loadProjectMetadataByProofHash(proofHash: string): ProjectEvidence | null {
    if (!canUseStorage()) return null;
    if (!proofHash) return null;

    const byHash = readMap(window.localStorage.getItem(HASH_STORAGE_KEY));
    return byHash[normalizeHashKey(proofHash)] ?? null;
}
