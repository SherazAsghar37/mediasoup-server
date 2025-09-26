const createRouterChannel: string = "request:create-router";
const getRouterRtpCapabilitiesChannel: string =
  "request:get-router-rtp-capabilities";
const createSendTransportChannel: string = "request:create-send-transport";
const createRecvTransportChannel: string = "request:create-recv-transport";

const connectTransportChannel: string = "request:connect-transport";
const transportProducerChannel: string = "request:transport-producer";
const transportConsumerChannel: string = "request:transport-consumer";

const pauseChannel: string = "request:pause";
const resumeChannel: string = "request:resume";

const responseGetRTPCapabilitiesChannel: string =
  "response:get-router-rtp-capabilities";
const responseCreateSendTransportChannel: string =
  "response:create-send-transport";
const responseCreateRecvTransportChannel: string =
  "response:create-recv-transport";
const responseConnectTransportChannel: string = "response:connect-transport";
const responseTransportProducerChannel: string = "response:transport-producer";
const responseTransportConsumerChannel: string = "response:transport-consumer";

export {
  createRouterChannel,
  createSendTransportChannel,
  createRecvTransportChannel,
  connectTransportChannel,
  transportProducerChannel,
  transportConsumerChannel,
  pauseChannel,
  resumeChannel,
  getRouterRtpCapabilitiesChannel,
  responseGetRTPCapabilitiesChannel,
  responseCreateSendTransportChannel,
  responseCreateRecvTransportChannel,
  responseConnectTransportChannel,
  responseTransportProducerChannel,
  responseTransportConsumerChannel,
};
