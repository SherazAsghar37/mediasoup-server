/**
 * @module index
 * This module sets up the Socket.IO server and initializes the mediasoup components
 * necessary for media transport.
 * It also handles all socket events related to media transport.
 * @see {@link https://mediasoup.org/}
 * @see {@link https://socket.io/}
 */

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mediasoup from "mediasoup";
import { createWorker } from "./worker";
import { mediaCodecs } from "./configs/codecs_config";
import RedisManager from "./redis_manager";

const app = express();
const port = 4000;
const server = http.createServer(app);

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

/**
 * Create a new instance of the Socket.IO server.
 */
const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

const redisManager:RedisManager = new RedisManager();

// /**
//  * Namespace under which all mediasoup related socket events and data will be handled.
//  * This helps in organizing socket events, making the codebase scalable and manageable.
//  */
// const peers = io.of("/mediasoup");

// /**
//  * A mediasoup worker; it handles the media layer by managing Router instances.
//  * @description It's crucial for the operation of the mediasoup server.
//  */
// let worker: mediasoup.types.Worker<mediasoup.types.AppData>;

// /**
//  * A mediasoup router; it routes RTP (and RTCP) packets between WebRTC transports and others.
//  * It's necessary for managing the flow of media data between producers and consumers.
//  */
// let router: mediasoup.types.Router<mediasoup.types.AppData>;

// /**
//  * A mediasoup WebRTC transport for sending media.
//  * It's essential for establishing a channel for sending media to a peer.
//  */
// let producerTransport:
//   | mediasoup.types.WebRtcTransport<mediasoup.types.AppData>
//   | undefined;

// /**
//  * A mediasoup WebRTC transport for receiving media.
//  * It's essential for establishing a channel for receiving media from a peer.
//  */
// let consumerTransport:
//   | mediasoup.types.WebRtcTransport<mediasoup.types.AppData>
//   | undefined;

// /**
//  * A mediasoup producer; it represents an audio or video source being routed through the server.
//  * It's critical for managing the sending of media data to consumers.
//  */
// let producer: mediasoup.types.Producer<mediasoup.types.AppData> | undefined;

// /**
//  * A mediasoup consumer; it represents an audio or video sink being routed through the server.
//  * It's critical for managing the reception of media data from producers.
//  */
// let consumer: mediasoup.types.Consumer<mediasoup.types.AppData> | undefined;


// // Create and initialize the mediasoup Worker.
// worker = await createWorker();


// /**
//  * Event handler for new peer connections.
//  * This function sets up all necessary event handlers and transports for a connected peer.
//  *
//  * @param socket - The socket object representing the connected peer.
//  */
// peers.on("connection", async (socket) => {
//   console.log(`Peer connected: ${socket.id}`);
//   socket.emit("connection-success", { socketId: socket.id });

//   /**
//    * Event handler for peer disconnection.
//    * This can be used to clean up resources associated with the peer.
//    */
//   socket.on("disconnect", () => {
//     console.log("Peer disconnected");
//   });

//   /**
//    * Create a router for the peer.
//    * A router is required to route media to/from this peer.
//    */
//   router = await worker.createRouter({
//     mediaCodecs: mediaCodecs,
//   });

//   /**
//    * Event handler for fetching router RTP capabilities.
//    * RTP capabilities are required for configuring transports and producers/consumers.
//    * This function is called when a peer requests the router RTP capabilities.
//    * @param {function} callback - A callback function to handle the result of the router RTP capabilities request.
//    */
//   socket.on("getRouterRtpCapabilities", (callback) => {
//     const routerRtpCapabilities = router.rtpCapabilities;
//     callback({ routerRtpCapabilities });
//   });

//   /**
//    * Event handler for creating a transport.
//    * A transport is required for sending or producing media.
//    * This function is called when a peer requests to create a transport.
//    * The callback function is used to send the transport parameters to the peer.
//    * @param {boolean} data.sender - Indicates whether the transport is for sending or receiving media.
//    * @param {function} callback - A callback function to handle the result of the transport creation.
//    */
//   socket.on("createTransport", async ({ sender }, callback) => {
//     if (sender) {
//       producerTransport = await createWebRtcTransport(callback);
//     } else {
//       consumerTransport = await createWebRtcTransport(callback);
//     }
//   });

//   /**
//    * Event handler for connecting the sending transport.
//    * This step is required before the transport can be used to send media.
//    * @param {object} data.dtlsParameters - Datagram Transport Layer Security (DTLS) parameters.
//    * These parameters are necessary for securing the transport with encryption.
//    */
//   socket.on("connectProducerTransport", async ({ dtlsParameters }) => {
//     await producerTransport?.connect({ dtlsParameters });
//   });

//   /**
//    * Event handler for producing media.
//    * This function sets up a producer for sending media to the peer.
//    * A producer represents the source of a single media track (audio or video).
//    */
//   socket.on("transport-produce", async ({ kind, rtpParameters }, callback) => {
//     producer = await producerTransport?.produce({
//       kind,
//       rtpParameters,
//     });

//     producer?.on("transportclose", () => {
//       console.log("Producer transport closed");
//       producer?.close();
//     });

//     callback({ id: producer?.id });
//   });

//   /**
//    * Event handler for connecting the receiving transport.
//    * This step is required before the transport can be used to receive media.
//    */
//   socket.on("connectConsumerTransport", async ({ dtlsParameters }) => {
//     await consumerTransport?.connect({ dtlsParameters });
//   });

//   /**
//    * Event handler for consuming media.
//    * This function sets up a consumer for receiving media from the peer.
//    * A consumer represents the endpoint for receiving media of a single kind
//    * (audio or video) from a remote peer. Creating a consumer involves multiple
//    * steps to ensure that the media can be received and decoded correctly.
//    *
//    * @event
//    * @param {object} rtpCapabilities - The RTP capabilities of the consuming endpoint.
//    * @param {function} callback - A callback function to handle the result of the consume operation.
//    */
//   socket.on("consumeMedia", async ({ rtpCapabilities }, callback) => {
//     try {
//       // Ensure there's a producer to consume from
//       if (producer) {
//         // Check if the router can consume the media from the producer based on the RTP capabilities
//         if (!router.canConsume({ producerId: producer?.id, rtpCapabilities })) {
//           console.error("Cannot consume");
//           return;
//         }
//         console.log("-------> consume");

//         // Create a consumer on the consumer transport
//         consumer = await consumerTransport?.consume({
//           producerId: producer?.id,
//           rtpCapabilities,
//           // Pause the consumer initially if it's a video consumer
//           // This can help save bandwidth until the video is actually needed
//           paused: producer?.kind === "video",
//         });

//         // Event handler for transport closure
//         // This helps ensure that resources are cleaned up when the transport is closed
//         consumer?.on("transportclose", () => {
//           console.log("Consumer transport closed");
//           consumer?.close();
//         });

//         // Event handler for producer closure
//         // This helps ensure that the consumer is closed when the producer is closed
//         consumer?.on("producerclose", () => {
//           console.log("Producer closed");
//           consumer?.close();
//         });

//         // Invoke the callback with the consumer parameters
//         // This allows the client to configure the consumer on its end
//         callback({
//           params: {
//             producerId: producer?.id,
//             id: consumer?.id,
//             kind: consumer?.kind,
//             rtpParameters: consumer?.rtpParameters,
//           },
//         });
//       }
//     } catch (error) {
//       // Handle any errors that occur during the consume process
//       console.error("Error consuming:", error);
//       callback({
//         params: {
//           error,
//         },
//       });
//     }
//   });

//   /**
//    * Event handler for resuming media consumption.
//    * This function resumes media reception if it was previously paused.
//    */
//   socket.on("resumePausedConsumer", async () => {
//     console.log("consume-resume");
//     await consumer?.resume();
//   });
// });

// /**
//  * Asynchronously creates a Web Real-Time Communication (WebRTC) transport using mediasoup.
//  * A transport is required to send or receive media over the network.
//  *
//  * @param callback - A callback function to handle the result of the transport creation.
//  * @returns A promise that resolves to a mediasoup WebRtcTransport object.
//  */

// const createWebRtcTransport = async (
//   callback: (arg0: {
//     params:
//       | {
//           /**
//            * A unique identifier generated by mediasoup for the transport.
//            * Necessary for differentiating between multiple transports.
//            */
//           id: string;
//           /**
//            * Interactive Connectivity Establishment (ICE) parameters.
//            * Necessary for the negotiation of network connections.
//            */
//           iceParameters: mediasoup.types.IceParameters;
//           /**
//            * Array of ICE candidates.
//            * Necessary for establishing network connectivity through NATs and firewalls.
//            */
//           iceCandidates: mediasoup.types.IceCandidate[];
//           /**
//            * Datagram Transport Layer Security (DTLS) parameters.
//            * Necessary for securing the transport with encryption.
//            */
//           dtlsParameters: mediasoup.types.DtlsParameters;
//         }
//       | {
//           /** Error object if any error occurs during transport creation. */ error: unknown;
//         };
//   }) => void
// ) => {
//   try {
//     /**
//      * Configuration options for the WebRTC transport.
//      * Adjusting these options can help optimize network performance and reliability.
//      */
//     const webRtcTransportOptions = {
//       /**
//        * Array of IP addresses for the transport to listen on.
//        * Necessary for receiving incoming network connections.
//        */
//       listenIps: [
//         {
//           ip: "127.0.0.1",
//         },
//       ],
//       /**
//        * Enables User Datagram Protocol (UDP) for the transport.
//        * UDP is often preferred for real-time media due to its lower latency compared to TCP.
//        */
//       enableUdp: true,
//       /**
//        * Enables Transmission Control Protocol (TCP) for the transport.
//        * TCP may be used if UDP is blocked or unreliable on the network.
//        */
//       enableTcp: true,
//       /**
//        * Prefers UDP over TCP for the transport.
//        * Helps ensure lower latency if both protocols are enabled.
//        */
//       preferUdp: true,
//     };

//     /**
//      * Creates a WebRTC transport using the specified options.
//      * This transport will be used to send or receive media.
//      */
//     const transport = await router.createWebRtcTransport(
//       webRtcTransportOptions
//     );

//     console.log(`Transport created: ${transport.id}`);

//     /**
//      * Monitors changes in the DTLS connection state.
//      * Closes the transport if the DTLS state becomes closed.
//      * This helps ensure resources are freed up when the transport is no longer needed.
//      */
//     transport.on("dtlsstatechange", (dtlsState) => {
//       if (dtlsState === "closed") {
//         transport.close();
//       }
//     });

//     /**
//      * Monitors transport closure events.
//      * Useful for logging or cleaning up resources related to the transport.
//      */
//     transport.on("@close", () => {
//       console.log("Transport closed");
//     });

//     /**
//      * Invokes the callback with the transport parameters.
//      * This allows the caller to retrieve the necessary information for establishing a WebRTC connection.
//      */
//     callback({
//       params: {
//         id: transport.id,
//         iceParameters: transport.iceParameters,
//         iceCandidates: transport.iceCandidates,
//         dtlsParameters: transport.dtlsParameters,
//       },
//     });

//     /** Returns the transport object for further use. */
//     return transport;
//   } catch (error) {
//     console.log(error);
//     /**
//      * Invokes the callback with error information if an error occurs.
//      * Allows the caller to handle the error.
//      */
//     callback({
//       params: {
//         error,
//       },
//     });
//   }
// };

// /**
//  * Starts the HTTP server.
//  * This is the main entry point of the application.
//  */
// server.listen(port, () => {
//   console.log(`Server running at http://localhost:${port}`);
// });