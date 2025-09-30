import { MediaKind } from "mediasoup/types";

interface CreateProducerRequestDto {
  roomId: string;
  userId: string;
  transportId: string;
  kind: any;
  rtpParameters: string;
  sessionId: string;
  appData: string;
}
