const createRouterChannel: string = "request:create-router";
const getRouterRtpCapabilitiesChannel: string =
  "request:get-router-rtp-capabilities";
const createSendTransportChannel: string = "request:create-send-transport";
const createRecvTransportChannel: string = "request:create-recv-transport";

const connectTransportChannel: string = "request:connect-transport";
const createProducerChannel: string = "request:create-producer";
const createConsumerChannel: string = "request:create-consumer";

const pauseChannel: string = "request:pause";
const resumeChannel: string = "request:resume";

const responseGetRTPCapabilitiesChannel: string =
  "response:get-router-rtp-capabilities";
const responseCreateSendTransportChannel: string =
  "response:create-send-transport";
const responseCreateRecvTransportChannel: string =
  "response:create-recv-transport";
const responseConnectTransportChannel: string = "response:connect-transport";
const responseCreateProducerChannel: string = "response:create-producer";
const responseCreateConsumerChannel: string = "response:create-consumer";

export {
  createRouterChannel,
  createSendTransportChannel,
  createRecvTransportChannel,
  connectTransportChannel,
  createProducerChannel,
  createConsumerChannel,
  pauseChannel,
  resumeChannel,
  getRouterRtpCapabilitiesChannel,
  responseGetRTPCapabilitiesChannel,
  responseCreateSendTransportChannel,
  responseCreateRecvTransportChannel,
  responseConnectTransportChannel,
  responseCreateProducerChannel,
  responseCreateConsumerChannel,
};
