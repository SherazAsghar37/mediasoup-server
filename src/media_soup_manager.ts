import * as mediasoup from "mediasoup";
import { mediaCodecs } from "./configs/codecs_config";
import { webRtcTransportOptions } from "./configs/webrtc_transport_config";
import {
  Consumer,
  MediaKind,
  Producer,
  Router,
  Transport,
  Worker,
} from "mediasoup/types";

interface TransportInfo {
  id: string;
  iceParameters: any;

  iceCandidates: any[];

  dtlsParameters: any;
  error?: string;
}

interface ProducerInfo {
  id: string;
  kind: MediaKind;
  rtpParameters: any;
  userId: string;
}

interface ConsumerInfo {
  id: string;
  kind: MediaKind;
  rtpParameters: any;
  producerId: string;
}

// Efficient resource tracking with reverse mappings
interface ResourceMetadata {
  userId: string;
  roomId: string;
  createdAt: number;
}

interface ProducerMetadata extends ResourceMetadata {
  kind: MediaKind;
}

interface ConsumerMetadata extends ResourceMetadata {
  producerId: string;
}

class MediaSoupManager {
  // Core mediasoup objects
  private workers: Map<string, Worker> = new Map();
  private routers: Map<string, Router> = new Map();
  private transports: Map<string, Transport> = new Map();
  private producers: Map<string, Producer> = new Map();
  private consumers: Map<string, Consumer> = new Map();

  // Efficient metadata tracking - O(1) lookups
  private transportMeta: Map<string, ResourceMetadata> = new Map();
  private producerMeta: Map<string, ProducerMetadata> = new Map();
  private consumerMeta: Map<string, ConsumerMetadata> = new Map();

  // Forward mappings for quick access
  private userTransports: Map<string, Set<string>> = new Map();
  private roomTransports: Map<string, Set<string>> = new Map();
  private userProducers: Map<string, Set<string>> = new Map();
  private roomProducers: Map<string, Set<string>> = new Map();

  async createWorker(roomId: string): Promise<Worker> {
    if (this.workers.has(roomId)) {
      return this.workers.get(roomId)!;
    }

    const newWorker = await mediasoup.createWorker({
      rtcMinPort: 2000,
      rtcMaxPort: 2020,
    });

    newWorker.on("died", () => {
      console.error(`Worker for room ${roomId} died`);
      this.cleanupRoom(roomId);
    });

    this.workers.set(roomId, newWorker);
    return newWorker;
  }

  async createRouter(roomId: string): Promise<Router> {
    if (this.routers.has(roomId)) {
      console.log("Router already exists for room:", roomId);
      return this.routers.get(roomId)!;
    }

    const worker = await this.createWorker(roomId);
    const router = await worker.createRouter({ mediaCodecs });

    this.routers.set(roomId, router);

    // Initialize collections only when needed
    this.roomTransports.set(roomId, new Set());
    this.roomProducers.set(roomId, new Set());

    console.log("Created new router for room:", roomId);

    return router;
  }

  async createProducerTransport(roomId: string, userId: string): Promise<any> {
    const transport = await this.createWebRtcTransport(roomId, userId);
    const transportInfo = this.getTransportInfo(transport);
    return transportInfo;
  }

  async createConsumerTransport(roomId: string, userId: string): Promise<any> {
    const transport: mediasoup.types.WebRtcTransport<mediasoup.types.AppData> =
      await this.createWebRtcTransport(roomId, userId);
    const transportInfo = this.getTransportInfo(transport);
    return transportInfo;
  }

  private async createWebRtcTransport(
    roomId: string,
    userId: string
  ): Promise<mediasoup.types.WebRtcTransport<mediasoup.types.AppData>> {
    const router = this.routers.get(roomId);
    if (!router) {
      throw new Error(`Router not found for room: ${roomId}`);
    }

    const transport = await router.createWebRtcTransport(
      webRtcTransportOptions
    );

    // Single event handler - no loops needed for cleanup
    transport.on("dtlsstatechange", (dtlsState) => {
      if (dtlsState === "closed") {
        this.cleanupTransport(transport.id);
      }
    });

    // Store with metadata - O(1) operations
    this.transports.set(transport.id, transport);
    this.transportMeta.set(transport.id, {
      userId,
      roomId,
      createdAt: Date.now(),
    });

    // Update forward mappings
    this.addToUserSet(this.userTransports, userId, transport.id);
    this.addToRoomSet(this.roomTransports, roomId, transport.id);

    return transport;
  }

  async connectTransport(
    transportId: string,
    dtlsParameters: any
  ): Promise<void> {
    const transport = this.transports.get(transportId);
    if (!transport) {
      throw new Error("Transport not found");
    }
    await transport.connect({ dtlsParameters });
  }

  async createProducer(
    roomId: string,
    userId: string,
    transportId: string,
    kind: MediaKind,
    rtpParameters: mediasoup.types.RtpParameters
  ): Promise<ProducerInfo> {
    // O(1) validation using metadata
    if (
      !this.validateResourceAccess(
        transportId,
        userId,
        roomId,
        this.transportMeta
      )
    ) {
      throw new Error("Unauthorized transport access");
    }

    const transport = this.transports.get(transportId)!;
    const producer = await transport.produce({ kind, rtpParameters });

    // Efficient cleanup handler
    producer.on("transportclose", () => {
      this.cleanupProducer(producer.id);
    });

    // Store with metadata
    this.producers.set(producer.id, producer);
    this.producerMeta.set(producer.id, {
      userId,
      roomId,
      createdAt: Date.now(),
      kind,
    });

    // Update forward mappings
    this.addToUserSet(this.userProducers, userId, producer.id);
    this.addToRoomSet(this.roomProducers, roomId, producer.id);

    return {
      id: producer.id,
      kind: producer.kind,
      rtpParameters: producer.rtpParameters,
      userId,
    };
  }

  async createConsumer(
    roomId: string,
    userId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: mediasoup.types.RtpCapabilities
  ): Promise<ConsumerInfo> {
    // O(1) validations using metadata
    if (
      !this.validateResourceAccess(
        transportId,
        userId,
        roomId,
        this.transportMeta
      )
    ) {
      throw new Error("Unauthorized transport access");
    }

    const producerMeta = this.producerMeta.get(producerId);
    if (!producerMeta) {
      throw new Error("Producer not found");
    }

    // Prevent self-consumption
    if (producerMeta.userId === userId) {
      throw new Error("Cannot consume own producer");
    }

    const router = this.routers.get(roomId)!;
    const transport = this.transports.get(transportId)!;
    const producer = this.producers.get(producerId)!;

    if (!router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error("Cannot consume");
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: producerMeta.kind === "video",
    });

    // Efficient cleanup handlers
    consumer.on("transportclose", () => this.cleanupConsumer(consumer.id));
    consumer.on("producerclose", () => this.cleanupConsumer(consumer.id));

    // Store with metadata
    this.consumers.set(consumer.id, consumer);
    this.consumerMeta.set(consumer.id, {
      userId,
      roomId,
      createdAt: Date.now(),
      producerId,
    });

    return {
      id: consumer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      producerId,
    };
  }

  // Control methods
  async resumeConsumer(consumerId: string): Promise<void> {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) throw new Error("Consumer not found");
    await consumer.resume();
  }

  async pauseConsumer(consumerId: string): Promise<void> {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) throw new Error("Consumer not found");
    await consumer.pause();
  }

  getRouterCapabilities(
    roomId: string
  ): mediasoup.types.RtpCapabilities | undefined {
    return this.routers.get(roomId)?.rtpCapabilities;
  }

  getExistingProducers(roomId: string, excludeUserId?: string): ProducerInfo[] {
    const roomProducerIds = this.roomProducers.get(roomId);
    if (!roomProducerIds) return [];

    const producers: ProducerInfo[] = [];
    for (const producerId of roomProducerIds) {
      const producer = this.producers.get(producerId);
      const meta = this.producerMeta.get(producerId);

      if (producer && meta && meta.userId !== excludeUserId) {
        producers.push({
          id: producer.id,
          kind: producer.kind,
          rtpParameters: producer.rtpParameters,
          userId: meta.userId,
        });
      }
    }
    return producers;
  }

  // Efficient cleanup methods - O(1) operations
  private cleanupTransport(transportId: string): void {
    const transport = this.transports.get(transportId);
    const meta = this.transportMeta.get(transportId);

    if (transport) {
      transport.close();
      this.transports.delete(transportId);
    }

    if (meta) {
      // O(1) cleanup using stored metadata
      this.removeFromUserSet(this.userTransports, meta.userId, transportId);
      this.removeFromRoomSet(this.roomTransports, meta.roomId, transportId);
      this.transportMeta.delete(transportId);
    }
  }

  private cleanupProducer(producerId: string): void {
    const producer = this.producers.get(producerId);
    const meta = this.producerMeta.get(producerId);

    if (producer) {
      producer.close();
      this.producers.delete(producerId);
    }

    if (meta) {
      // O(1) cleanup using stored metadata
      this.removeFromUserSet(this.userProducers, meta.userId, producerId);
      this.removeFromRoomSet(this.roomProducers, meta.roomId, producerId);
      this.producerMeta.delete(producerId);
    }
  }

  private cleanupConsumer(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    const meta = this.consumerMeta.get(consumerId);

    if (consumer) {
      consumer.close();
      this.consumers.delete(consumerId);
    }

    if (meta) {
      this.consumerMeta.delete(consumerId);
    }
  }

  cleanupUserFromRoom(userId: string, roomId: string): void {
    // Get user's transports in this room
    const userTransportIds = this.userTransports.get(userId);
    if (userTransportIds) {
      // Only iterate through user's transports, not all transports
      for (const transportId of userTransportIds) {
        const meta = this.transportMeta.get(transportId);
        if (meta && meta.roomId === roomId) {
          this.cleanupTransport(transportId);
        }
      }
    }

    // Get user's producers in this room
    const userProducerIds = this.userProducers.get(userId);
    if (userProducerIds) {
      // Only iterate through user's producers, not all producers
      for (const producerId of userProducerIds) {
        const meta = this.producerMeta.get(producerId);
        if (meta && meta.roomId === roomId) {
          this.cleanupProducer(producerId);
        }
      }
    }
  }

  private cleanupRoom(roomId: string): void {
    // Clean up all transports in room
    const roomTransportIds = this.roomTransports.get(roomId);
    if (roomTransportIds) {
      // Create copy to avoid modification during iteration
      const transportIds = Array.from(roomTransportIds);
      for (const transportId of transportIds) {
        this.cleanupTransport(transportId);
      }
    }

    const router = this.routers.get(roomId);
    if (router) {
      router.close();
      this.routers.delete(roomId);
    }

    const worker = this.workers.get(roomId);
    if (worker) {
      worker.close();
      this.workers.delete(roomId);
    }

    // Clean up collections
    this.roomTransports.delete(roomId);
    this.roomProducers.delete(roomId);
  }

  // Helper methods for set operations
  private addToUserSet(
    map: Map<string, Set<string>>,
    userId: string,
    id: string
  ): void {
    if (!map.has(userId)) {
      map.set(userId, new Set());
    }
    map.get(userId)!.add(id);
  }

  private addToRoomSet(
    map: Map<string, Set<string>>,
    roomId: string,
    id: string
  ): void {
    if (!map.has(roomId)) {
      map.set(roomId, new Set());
    }
    map.get(roomId)!.add(id);
  }

  private removeFromUserSet(
    map: Map<string, Set<string>>,
    userId: string,
    id: string
  ): void {
    const set = map.get(userId);
    if (set) {
      set.delete(id);
      if (set.size === 0) {
        map.delete(userId);
      }
    }
  }

  private removeFromRoomSet(
    map: Map<string, Set<string>>,
    roomId: string,
    id: string
  ): void {
    const set = map.get(roomId);
    if (set) {
      set.delete(id);
    }
  }

  // O(1) validation using metadata
  private validateResourceAccess(
    resourceId: string,
    userId: string,
    roomId: string,
    metaMap: Map<string, ResourceMetadata>
  ): boolean {
    const meta = metaMap.get(resourceId);
    return meta?.userId === userId && meta?.roomId === roomId;
  }

  private getTransportInfo(
    transport: mediasoup.types.WebRtcTransport<mediasoup.types.AppData>
  ) {
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  // Monitoring and stats
  getRoomStats(roomId: string) {
    return {
      hasRouter: this.routers.has(roomId),
      transports: this.roomTransports.get(roomId)?.size || 0,
      producers: this.roomProducers.get(roomId)?.size || 0,
      consumers: this.consumers.size, // Approximate, could be more precise
    };
  }

  getUserStats(userId: string) {
    return {
      transports: this.userTransports.get(userId)?.size || 0,
      producers: this.userProducers.get(userId)?.size || 0,
    };
  }

  isRoomEmpty(roomId: string): boolean {
    const transportIds = this.roomTransports.get(roomId);
    return !transportIds || transportIds.size === 0;
  }
}

export default MediaSoupManager;
