import { useEffect, useState } from "react";
import io from "socket.io-client";
import crypto from "crypto-js";
import "./App.css";
import { useRef } from "react";
import { Buffer } from "buffer";
import ss from "socket.io-stream";
import stream from "stream";
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
      const blob = await streamToBlob(tempStream);
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

      // upload a file to the server.
      ss(socket).emit("file", stream, { size: file.size });
      ss.createBlobReadStream(file).pipe(stream);

      // Array.from(event.target.files).forEach((image) => {
      //   encodeFileToBase64(image).then((data) => {
      //     const base64Array = splitBase64ToByte(data, 200 * 1024);
      //     socket.emit(
      //       "send",
      //       JSON.stringify({ data: encrypteDES(base64Array) })
      // });
    }
  }

  function encrypteDES(data) {
    const temp = [];
    for (const item of data) {
      temp.push(crypto.DES.encrypt(item, secretKey).toString());
    }
    return temp;
  }

  function decryptDES(data) {
    let temp = "";
    for (const item of data) {
      temp += crypto.DES.decrypt(item, secretKey).toString(crypto.enc.Utf8);
    }
    return temp;
  }

  function splitBase64ToByte(data, length) {
    let idx = 0;
    let left = data.length;
    const base64Array = [];
    if (data.length < length) {
      base64Array.push(data.slice(0, Math.floor(data.length / 2)));
      base64Array.push(data.slice(Math.floor(data.length / 2) + 1));
    } else {
      while (true) {
        if (left > length) {
          const temp = data.slice(idx, idx + length);
          base64Array.push(temp);
          idx += length;
          left -= length;
        } else {
          const temp = data.slice(idx);
          base64Array.push(temp);
          break;
        }
      }
    }
    return base64Array;
  }

  const encodeFileToBase64 = (image) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(image);
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
    });
  };

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
