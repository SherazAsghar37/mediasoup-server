import { MediaKind } from "mediasoup/types";

interface CreateTransportProducerRequestDto {
  roomId: string;
  userId: string;
  transportId: string;
  kind: string;
  rtpParameters: string;
  sessionId: string;
}
