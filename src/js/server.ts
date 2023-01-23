/// <reference path="npm.d.ts"/>
import express from "express";
import http from "http";
import { Server } from "socket.io";
import vosk from "vosk";
import fs from "fs";
import mic from "mic";
import { allCommands } from "./actions";
import { EVENT_NAME } from "./listener";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:1234", "https://afeld-pose.netlify.app/"],
  },
});

const MODEL_PATH = "model";
const SAMPLE_RATE = 44100;

if (!fs.existsSync(MODEL_PATH)) {
  console.log(
    "Please download the model from https://alphacephei.com/vosk/models and unpack as " +
      MODEL_PATH +
      " in the current folder."
  );
  process.exit();
}

vosk.setLogLevel(0);
const model = new vosk.Model(MODEL_PATH);
const commands = allCommands();
console.log("Supported commands:", commands);
const rec = new vosk.Recognizer({
  model: model,
  sampleRate: SAMPLE_RATE,
  grammar: commands,
});

// https://github.com/ashishbajaj99/mic#micoptions
const micInstance = mic({
  rate: String(SAMPLE_RATE),
  channels: "1",
  debug: false,
  device: "default",
});

const micInputStream = micInstance.getAudioStream();

micInputStream.on("audioProcessExitComplete", function () {
  console.log("Cleaning up");
  console.log(rec.finalResult());
  rec.free();
  model.free();
});

process.on("SIGINT", function () {
  console.log("\nStopping");
  micInstance.stop();
});

console.log("Waiting for socket connection…");
io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  // TODO ensure there aren't multiple registered
  micInputStream.on("data", (data) => {
    if (rec.acceptWaveform(data)) {
      const command = rec.result().text;
      // sometimes it's empty
      if (!command) {
        return;
      }
      socket.emit(EVENT_NAME, command);
    }
  });
});

micInputStream.on("data", (data) => {
  if (rec.acceptWaveform(data)) {
    console.log("result:");
    console.log(rec.result());
    console.log("partial:");
    console.log(rec.partialResult());
    console.log("final result:");
    console.log(rec.finalResult());
  }
});

micInstance.start();

const port = 3000;
server.listen(port, () => {
  console.log(`listening on *:${port}`);
});
