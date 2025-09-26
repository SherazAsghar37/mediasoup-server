import { MediaKind } from "mediasoup/types";

interface CreateTransportConsumerRequestDto {
  roomId: string;
  userId: string;
  transportId: string;
  producerId: string;
  kind: string;
  rtpCapabilities: string;
}
