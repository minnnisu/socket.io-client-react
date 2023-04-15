import { useEffect, useState } from "react";
import io from "socket.io-client";
import "./App.css";
import ss from "socket.io-stream";
const crypto = require("crypto");
const streamToBlob = require("stream-to-blob");

function App() {
  const [socket, setSocket] = useState();
  const [msgData, setMsgData] = useState([]);
  const [imgMsgData, setImgMsgData] = useState("");

  const [msgInput, setMsgInput] = useState("");

  const password = "McQfTjWnZr4u7x!A";

  useEffect(() => {
    const socketIo = io("http://localhost:3001", {
      cors: { origin: "*" },
    });

    setSocket(socketIo);

    // receive text message from server
    socketIo.on("receiveMsg", (receive) => {
      setMsgData((prev) => [
        ...prev,
        { sender: receive.name, msg: receive.msg },
      ]);
    });

    ss(socketIo).on("receiveImg", async (tempStream, data) => {
      console.log("receiveImg");
      const KEY = Buffer.from(password, "utf8");
      const IV = Buffer.from(password, "utf8");
      const decipherStream = crypto.createDecipheriv("aes-128-cbc", KEY, IV);
      const decipher = tempStream.pipe(decipherStream);
      const blob = await streamToBlob(decipher);
      const url = window.URL.createObjectURL(blob);
      console.log(url);
      setImgMsgData(url);
    });

    return () => {
      if (socket) {
        socket.emit("disconnect");
      }
    };
  }, []);

  function msgInputChangeHandler(e) {
    setMsgInput(e.target.value);
  }

  function msgSubmitHandler() {
    socket.emit("sendMsg", { name: socket.id, msg: msgInput });
  }

  function imgChangeHandler(event) {
    if (event.target.files) {
      const file = event.target.files[0];
      const stream = ss.createStream();

      const KEY = Buffer.from(password, "utf8");
      const IV = Buffer.from(password, "utf8");
      const encrypt = crypto.createCipheriv("aes-128-cbc", KEY, IV);
      // upload a file to the server.
      ss(socket).emit("sendImg", stream, { size: file.size });
      ss.createBlobReadStream(file).pipe(encrypt).pipe(stream);
    }
  }

  return (
    <div className="App">
      <div className="msg_container">
        <div className="msg_conversation_container">
          {msgData.map((item, index) => (
            <div
              key={index}
              className={
                item.sender === socket.id
                  ? "msg_conversation_item me"
                  : "msg_conversation_item other"
              }
            >
              <div className="wrapper">
                <div className="name">{item.sender}</div>
                <div className="msg">{item.msg}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="msg_input_form">
          <input type="text" onChange={msgInputChangeHandler} />
          <button onClick={msgSubmitHandler}>메시지 전송</button>
        </div>
        <div>
          <input type="file" onChange={imgChangeHandler} />
        </div>
        <img src={imgMsgData} width={500} alt="receive_img" />
      </div>
    </div>
  );
}

export default App;
