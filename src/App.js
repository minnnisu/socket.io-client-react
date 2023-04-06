import { useEffect, useState } from "react";
import io from "socket.io-client";
import "./App.css";
import { useRef } from "react";
import ss from "socket.io-stream";
const crypto = require("crypto");
const streamToBlob = require("stream-to-blob");

function App() {
  const imageReceiveBase64 = useRef("");
  const imageSendBase64 = useRef([]);
  const [socket, setSocket] = useState();
  const [userName, setUserName] = useState("");
  const [userMsg, setUserMsg] = useState("");
  const [msgData, setMsgData] = useState([]); // { sender:"", type: "", msg: ""}
  const [img, setImg] = useState("");

  const secretKey =
    "xGHQkCIOr46599weIoqfxiyoBCt4pfBomFAnzuDLfTRTKCj0vZqX9SI4aSVnlKXg";

  useEffect(() => {
    const socketIo = io("http://localhost:3001", {
      cors: { origin: "*" },
    });

    setSocket(socketIo);

    // receive text message from server
    socketIo.on("receive message", (header, body) => {
      setMsgData((prev) => [
        ...prev,
        { sender: header.senderSocketID, type: "textMsg", msg: body.msg },
      ]);
    });

    ss(socketIo).on("receive", async (tempStream, size) => {
      const password = "McQfTjWnZr4u7x!A";
      const KEY = Buffer.from(password, "utf8");
      const IV = Buffer.from(password, "utf8");
      var decipherStream = crypto.createDecipheriv("aes-128-cbc", KEY, IV);
      const decipher = tempStream.pipe(decipherStream);
      const blob = await streamToBlob(decipher);
      const url = window.URL.createObjectURL(blob);
      console.log(url);
      setImg(url);
    });

    return () => {
      if (socket) {
        socket.emit("disconnect");
      }
    };
  }, []);

  // function onClickSubmitBtn(e) {
  //   e.preventDefault();
  //   socket.emit("send message", {
  //     header: { senderSocketID: socket.id },
  //     body: { msg: userMsg },
  //   });

  // }

  function imgChangeHandler(event) {
    if (event.target.files) {
      var file = event.target.files[0];
      var stream = ss.createStream();

      const password = "McQfTjWnZr4u7x!A";
      const KEY = Buffer.from(password, "utf8");
      const IV = Buffer.from(password, "utf8");
      var encrypt = crypto.createCipheriv("aes-128-cbc", KEY, IV);
      // upload a file to the server.
      ss(socket).emit("file", stream, { size: file.size });
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
                {item.type === "msg" ? (
                  <>
                    <div className="name">{item.sender}</div>
                    <div className="msg">{item.msg}</div>
                  </>
                ) : (
                  <>
                    <div className="name">{item.sender}</div>
                    <img src={item.msg} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="msg_input_form">
          <input
            type="text"
            onChange={(e) => {
              setUserMsg(e.target.value);
            }}
          />
          <div>
            <input type="file" onChange={imgChangeHandler} />
          </div>
          <button>전송</button>
        </div>
        <img src={img} width={500} />
      </div>
    </div>
  );
}

export default App;
