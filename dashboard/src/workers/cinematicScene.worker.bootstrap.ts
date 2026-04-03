const workerGlobal = globalThis as typeof globalThis & {
    global?: typeof globalThis
}

workerGlobal.global ??= workerGlobal

void import('./cinematicScene.worker')
