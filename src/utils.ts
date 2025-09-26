export default abstract class Utils{
    static onSubscription(err: Error | null | undefined, count: unknown): void {
        if (err) {
            console.error("Failed to subscribe: ", err);
        } else {
            console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
        }
    }
}