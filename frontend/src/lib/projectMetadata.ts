export type ProjectEvidence = {
    title: string;
    description: string;
    imageUrl: string;
    videoUrl: string;
    proofLinks: string[];
    createdAt: number;
    creatorAddress?: string;
};

const STORAGE_KEY_PREFIX = "pifp_project_metadata_v1";

function canUseStorage(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function storageKeyForAddress(address: string): string {
    return `${STORAGE_KEY_PREFIX}:${address.toLowerCase()}`;
}

export function loadProjectMetadataMap(address: string): Record<string, ProjectEvidence> {
    if (!canUseStorage()) return {};
    if (!address) return {};

    try {
        const raw = window.localStorage.getItem(storageKeyForAddress(address));
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, ProjectEvidence>;
        return parsed ?? {};
    } catch {
        return {};
    }
}

export function saveProjectMetadata(address: string, projectId: number, metadata: ProjectEvidence): void {
    if (!canUseStorage()) return;
    if (!address) return;

    const existing = loadProjectMetadataMap(address);
    existing[String(projectId)] = metadata;
    window.localStorage.setItem(storageKeyForAddress(address), JSON.stringify(existing));
    window.dispatchEvent(new Event("pifp:projects-updated"));
}
