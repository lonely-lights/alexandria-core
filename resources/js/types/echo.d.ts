/**
 * Ambient typing for Laravel Echo (laravel-echo + Pusher) when injected
 * onto `window.Echo` by the consumer app's bootstrap. Echo is optional —
 * NotesDrawer + future real-time surfaces guard with `if (!window.Echo)`
 * so the app degrades to polling when Echo isn't loaded. Typing it here
 * lets those guards type-check without each call site having to cast.
 *
 * The shape declared here is the minimum subset core consumes; consumer
 * apps that need broader Echo typing can install `laravel-echo`'s own
 * declarations alongside.
 */
declare global {
    interface EchoChannel {
        listen: <T = unknown>(event: string, callback: (data: T) => void) => EchoChannel;
        stopListening: (event: string) => EchoChannel;
    }

    interface EchoInstance {
        private: (channel: string) => EchoChannel;
        channel: (channel: string) => EchoChannel;
    }

    interface Window {
        Echo?: EchoInstance;
    }
}

export {};
