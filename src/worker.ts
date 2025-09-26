import mediasoup from "mediasoup";

/**
 * Asynchronously creates and initializes a mediasoup Worker.
 * A Worker is necessary for handling the low-level operations of media routing.
 *
 * @returns A Promise that resolves to a mediasoup Worker instance.
 */
export const createWorker = async (): Promise<
  mediasoup.types.Worker<mediasoup.types.AppData>
> => {
  const newWorker = await mediasoup.createWorker({
    rtcMinPort: 2000, // Minimum port number for RTC traffic
    rtcMaxPort: 2020, // Maximum port number for RTC traffic
  });

  console.log(`Worker process ID ${newWorker.pid}`);

  /**
   * Event handler for the 'died' event on the worker.
   * This is crucial for handling failures in the media handling layer and ensuring system stability.
   */
  newWorker.on("died", (error) => {
    console.error("mediasoup worker has died");
    // Gracefully shut down the process to allow for recovery or troubleshooting.
    setTimeout(() => {
      process.exit();
    }, 2000);
  });

  return newWorker;
};