import { actionForCommand } from "../controllers/actions";
import Effect from "../effects/effect";
import { config, speechDetectionController } from "../controllers/controls";
import { getElementById } from "../utils/dom_helpers";

export default class ListenerController {
  effects: Effect[];
  speechWindow: Window;

  constructor(effects: Effect[]) {
    this.effects = effects;

    const iframe = getElementById("speech") as HTMLIFrameElement;
    this.speechWindow = iframe.contentWindow as Window;

    // set up handlers
    this.speechWindow.addEventListener("load", () => {
      this.startIfAllowed();
    });
    window.addEventListener("message", (event) =>
      this.onVoiceCommand(event.data)
    );
    speechDetectionController.onChange(this.onCheckboxChange);
  }

  onVoiceCommand = (command: string) => {
    console.log("command received:", command);

    const action = actionForCommand(command);
    if (!action) {
      console.warn(`command "${command}" not found`);
      return;
    }
    action.callback(this.effects);
  };

  onCheckboxChange = (value: boolean) => {
    if (value) {
      this.startIfAllowed();
    } else {
      this.stop();
    }
  };

  isAllowed() {
    return config.speechDetection;
  }

  startIfAllowed() {
    if (this.isAllowed()) {
      this.speechWindow.postMessage("start", "*");
    }
  }

  stop() {
    this.speechWindow.postMessage("stop", "*");
  }
}