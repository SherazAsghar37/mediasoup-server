import { MediaKind } from "mediasoup/types";

interface CreateConsumerRequestDto {
  roomId: string;
  participantId: string;
  userId: string;
  transportId: string;
  producerId: string;
  kind: any;
  rtpCapabilities: string;
  sessionId: string;
  appData: string;
}
