interface CloseableServer {
    close(callback: (error?: Error) => void): void;
}

/**
 * Stops accepting connections on SIGTERM/SIGINT, closes optional resources,
 * then exits. The timer is a last resort if a connection will not drain.
 */
export function registerGracefulShutdown(
    server: CloseableServer,
    closeResources: () => Promise<void> = async () => {},
): void {
    let closing = false;
    const shutdown = () => {
        if (closing) return;
        closing = true;
        const forceExit = setTimeout(() => process.exit(1), 10_000);
        server.close(() => {
            void closeResources().finally(() => {
                clearTimeout(forceExit);
                process.exit(0);
            });
        });
    };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
}
