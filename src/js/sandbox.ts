import Listener from "./listener";

const listener = new Listener();
listener.onCommand((command) => console.log(command));
listener.start();
