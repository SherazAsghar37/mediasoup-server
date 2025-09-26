import { redisPublisher, redisSubscriber } from "./redis_cleint";
import Utils from "./utils";
import MediaSoupManager from "./media_soup_manager";
import {
  connectTransportChannel,
  createRecvTransportChannel,
  createRouterChannel,
  createSendTransportChannel,
  getRouterRtpCapabilitiesChannel,
  pauseChannel,
  responseConnectTransportChannel,
  responseCreateRecvTransportChannel,
  responseCreateSendTransportChannel,
  responseGetRTPCapabilitiesChannel,
  responseTransportConsumerChannel,
  responseTransportProducerChannel,
  resumeChannel,
  transportConsumerChannel,
  transportProducerChannel,
} from "./configs/redis_config";
import { MediaKind } from "mediasoup/types";
import { CreateTransportProducerRequestDto } from "./@types/CreateTransportProducerRequestDto";
import { CreateTransportConsumerRequestDto } from "./@types/CreateTransportConsumerRequestDto";

export default class RedisManager {
  private mediaSoupManager: MediaSoupManager;

  constructor() {
    this.mediaSoupManager = new MediaSoupManager();
    console.log("Redis Manager initialized");

    redisSubscriber.subscribe(createRouterChannel, Utils.onSubscription);
    redisSubscriber.subscribe(createSendTransportChannel, Utils.onSubscription);
    redisSubscriber.subscribe(createRecvTransportChannel, Utils.onSubscription);
    redisSubscriber.subscribe(
      getRouterRtpCapabilitiesChannel,
      Utils.onSubscription
    );

    redisSubscriber.subscribe(connectTransportChannel, Utils.onSubscription);
    redisSubscriber.subscribe(transportProducerChannel, Utils.onSubscription);
    redisSubscriber.subscribe(transportConsumerChannel, Utils.onSubscription);

    redisSubscriber.subscribe(pauseChannel, Utils.onSubscription);
    redisSubscriber.subscribe(resumeChannel, Utils.onSubscription);

    redisSubscriber.on("message", (channel, message) => {
      switch (channel) {
        case createRouterChannel:
          this.onCreateRouter(message);
          break;
        case getRouterRtpCapabilitiesChannel:
          this.onGetRouterRtpCapabilities(message);
          break;
        case createSendTransportChannel:
          this.onCreateSendTransport(message);
          break;
        case createRecvTransportChannel:
          this.onCreateRecvTransport(message);
          break;
        case connectTransportChannel:
          this.onConnectTransport(message);
          break;
        case transportProducerChannel:
          this.onTransportProducer(message);
          break;
        case transportConsumerChannel:
          this.onTransportConsumer(message);
          break;
        case resumeChannel:
          this.onResumeConsumer(message);
          break;
        case pauseChannel:
          this.onPauseConsumer(message);
          break;
      }
    });
  }

  async onCreateRouter(message: string) {
    const data: CreateRouterRequestDto = JSON.parse(message);
    const router = await this.mediaSoupManager.createRouter(data.roomId);
  }

  async onGetRouterRtpCapabilities(message: string) {
    console.log("onGetRouterRtpCapabilities", message);
    const data: GetRTPCapabilitiesRequestDto = JSON.parse(message);
    const rtpCapabilities = this.mediaSoupManager.getRouterCapabilities(
      data.roomId
    );
    redisPublisher.publish(
      responseGetRTPCapabilitiesChannel,
      JSON.stringify({
        userId: data.userId,
        rtpCapabilities: rtpCapabilities,
      })
    );
  }

  async onCreateSendTransport(message: string) {
    console.log("onCreateSendTransport", message);
    const data: CreateSendTransportRequestDto = JSON.parse(message);
    const transport = await this.mediaSoupManager.createProducerTransport(
      data.roomId,
      data.userId
    );

    console.log("transport", transport);
    redisPublisher.publish(
      responseCreateSendTransportChannel,
      JSON.stringify({
        userId: data.userId,
        transportOptions: transport,
      })
    );
  }
  async onCreateRecvTransport(message: string) {
    console.log("onCreateRecvTransport", message);
    const data: CreateRecvTransportRequestDto = JSON.parse(message);
    const transport = await this.mediaSoupManager.createConsumerTransport(
      data.roomId,
      data.userId
    );
    console.log("Transports", transport);
    redisPublisher.publish(
      responseCreateRecvTransportChannel,
      JSON.stringify({
        userId: data.userId,
        roomId: data.roomId,
        transportOptions: transport,
      })
    );
  }
  async onConnectTransport(message: string) {
    console.log("onConnectTransport");
    const data: ConnectTransportRequestDto = JSON.parse(message);
    const dtlsParameters = JSON.parse(data.dtlsParameters);
    await this.mediaSoupManager.connectTransport(
      data.transportId,
      dtlsParameters
    );
    redisPublisher.publish(
      responseConnectTransportChannel,
      JSON.stringify({
        userId: data.userId,
        userType: data.userType,
      })
    );
  }
  async onTransportProducer(message: string) {
    console.log("onTransportProducer");
    const data: CreateTransportProducerRequestDto = JSON.parse(message);
    const rtpParameters = JSON.parse(data.rtpParameters);
    const kind: MediaKind = JSON.parse(data.kind);
    const response = await this.mediaSoupManager.createProducer(
      data.roomId,
      data.userId,
      data.transportId,
      kind,
      rtpParameters
    );
    redisPublisher.publish(
      responseTransportProducerChannel,
      JSON.stringify({
        userId: data.userId,
        roomId: data.roomId,
        id: response.id,
        sessionId: data.sessionId,
        kind: JSON.stringify(response.kind),
        rtpParameters: JSON.stringify(response.rtpParameters),
      })
    );
  }
  async onTransportConsumer(message: string) {
    console.log("onTransportConsumer", message);
    const data: CreateTransportConsumerRequestDto = JSON.parse(message);

    const rtpCapabilities = JSON.parse(data.rtpCapabilities);
    const kind: MediaKind = JSON.parse(data.kind);

    const response = await this.mediaSoupManager.createConsumer(
      data.roomId,
      data.userId,
      data.transportId,
      data.producerId,
      rtpCapabilities
    );

    redisPublisher.publish(
      responseTransportConsumerChannel,
      JSON.stringify({
        userId: data.userId,
        id: response.id,
        producerId: response.producerId,
        kind: JSON.stringify(kind),
        rtpParameters: JSON.stringify(response.rtpParameters),
      })
    );
  }

  async onResumeConsumer(message: string) {
    console.log("onResumeConsumer", message);
    const data: ResumeConsumerRequestDto = JSON.parse(message);
    await this.mediaSoupManager.resumeConsumer(data.consumerId);
  }
  async onPauseConsumer(message: string) {
    console.log("onPauseConsumer", message);
    const data: PauseConsumerRequestDto = JSON.parse(message);
    await this.mediaSoupManager.pauseConsumer(data.consumerId);
  }
}
