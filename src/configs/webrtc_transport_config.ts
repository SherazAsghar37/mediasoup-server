export const webRtcTransportOptions = {
  /**
   * Array of IP addresses for the transport to listen on.
   * Necessary for receiving incoming network connections.
   */
  listenIps: [
    {
      ip: "0.0.0.0",
      announcedIp: "192.168.100.16",
    },
  ],
  /**
   * Enables User Datagram Protocol (UDP) for the transport.
   * UDP is often preferred for real-time media due to its lower latency compared to TCP.
   */
  enableUdp: true,
  /**
   * Enables Transmission Control Protocol (TCP) for the transport.
   * TCP may be used if UDP is blocked or unreliable on the network.
   */
  enableTcp: true,
  /**
   * Prefers UDP over TCP for the transport.
   * Helps ensure lower latency if both protocols are enabled.
   */
  preferUdp: true,
};
