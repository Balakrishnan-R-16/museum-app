import SockJS from "sockjs-client";
import { Stomp } from "stompjs";

let stompClient = null;

export const connectSocket = (onUpdate) => {
  const socket = new SockJS("https://museum-backend-eb4b.onrender.com/ws");
  stompClient = Stomp.over(socket);

  stompClient.connect({}, () => {
    stompClient.subscribe("/topic/updates", () => {
      onUpdate();
    });
  });
};
