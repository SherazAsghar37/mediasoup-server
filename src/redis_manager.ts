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
  responseCreateProducerChannel,
  responseCreateConsumerChannel,
  resumeChannel,
  createProducerChannel,
  createConsumerChannel,
} from "./configs/redis_config";
import { MediaKind } from "mediasoup/types";
import { CreateProducerRequestDto } from "./@types/CreateProducerRequestDto";
import { CreateConsumerRequestDto } from "./@types/CreateConsumerRequestDto";

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
    redisSubscriber.subscribe(createProducerChannel, Utils.onSubscription);
    redisSubscriber.subscribe(createConsumerChannel, Utils.onSubscription);

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
        case createProducerChannel:
          this.onCreateProducer(message);
          break;
        case createConsumerChannel:
          this.onCreateConsumer(message);
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
    try {
      console.log("onCreateRouter", message);
      const data: CreateRouterRequestDto = JSON.parse(message);
      const router = await this.mediaSoupManager.createRouter(data.roomId);
    } catch (error) {
      console.error("Error in onCreateRouter:", error);
    }
  }

  async onGetRouterRtpCapabilities(message: string) {
    try {
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
    } catch (error) {
      console.error("Error in onGetRouterRtpCapabilities:", error);
    }
  }

  async onCreateSendTransport(message: string) {
    try {
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
    } catch (error) {
      console.error("Error in onCreateSendTransport:", error);
    }
  }
  async onCreateRecvTransport(message: string) {
    try {
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
          sessionId: data.sessionId,
          transportOptions: transport,
        })
      );
    } catch (error) {
      console.error("Error in onCreateRecvTransport:", error);
    }
  }
  async onConnectTransport(message: string) {
    try {
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
    } catch (error) {
      console.error("Error in onConnectTransport:", error);
    }
  }
  async onCreateProducer(message: string) {
    try {
      console.log("onCreateProducer");
      const data: CreateProducerRequestDto = JSON.parse(message);
      const rtpParameters = JSON.parse(data.rtpParameters);
      const kind: MediaKind = data.kind;
      const response = await this.mediaSoupManager.createProducer(
        data.roomId,
        data.userId,
        data.transportId,
        kind,
        rtpParameters
      );
      redisPublisher.publish(
        responseCreateProducerChannel,
        JSON.stringify({
          userId: data.userId,
          roomId: data.roomId,
          id: response.id,
          appData: data.appData,
          sessionId: data.sessionId,
          kind: response.kind,
          rtpParameters: JSON.stringify(response.rtpParameters),
        })
      );
    } catch (error) {
      console.error("Error in onCreateProducer:", error);
    }
  }
  async onCreateConsumer(message: string) {
    try {
      console.log("onCreateConsumer");
      const data: CreateConsumerRequestDto = JSON.parse(message);

      const rtpCapabilities = JSON.parse(data.rtpCapabilities);
      const kind: MediaKind = data.kind;

      const response = await this.mediaSoupManager.createConsumer(
        data.roomId,
        data.userId,
        data.transportId,
        data.producerId,
        rtpCapabilities
      );

      redisPublisher.publish(
        responseCreateConsumerChannel,
        JSON.stringify({
          userId: data.userId,
          id: response.id,
          participantId: data.participantId,
          producerId: response.producerId,
          sessionId: data.sessionId,
          appData: data.appData,
          kind: kind,
          rtpParameters: JSON.stringify(response.rtpParameters),
        })
      );
    } catch (error) {
      console.error("Error in onCreateConsumer:", error);
    }
  }

  async onResumeConsumer(message: string) {
    try {
      console.log("onResumeConsumer", message);
      const data: ResumeConsumerRequestDto = JSON.parse(message);
      await this.mediaSoupManager.resumeConsumer(data.consumerId);
    } catch (error) {
      console.error("Error in onResumeConsumer:", error);
    }
  }
  async onPauseConsumer(message: string) {
    try {
      console.log("onPauseConsumer", message);
      const data: PauseConsumerRequestDto = JSON.parse(message);
      await this.mediaSoupManager.pauseConsumer(data.consumerId);
    } catch (error) {
      console.error("Error in onPauseConsumer:", error);
    }
  }
}
