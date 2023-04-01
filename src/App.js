import { useEffect, useState } from "react";
import io from "socket.io-client";
import crypto from "crypto-js";
import "./App.css";
import { useRef } from "react";
import { Buffer } from "buffer";

function App() {
  const imageReceiveBase64 = useRef("");
  const imageSendBase64 = useRef([]);
  const [socket, setSocket] = useState();
  const [userName, setUserName] = useState("");
  const [msgData, setMsgData] = useState({ msg: "", msgList: [] });
  const [imgData, setImgData] = useState("");

  const secretKey =
    "xGHQkCIOr46599weIoqfxiyoBCt4pfBomFAnzuDLfTRTKCj0vZqX9SI4aSVnlKXg";

  useEffect(() => {
    const socketIo = io("http://localhost:3001", {
      cors: { origin: "*" },
    });

    setSocket(socketIo);

    // receive text message from server
    socketIo.on("receive message", (msg) => {
      console.log(msg);
      setMsgData((prev) => ({
        msg: prev.msg,
        msgList: [...prev.msgList, msg],
      }));
    });

    socketIo.on("receiveImageData", (header, body) => {
      if (header.senderSocketID === socketIo.id) {
        return;
      }
      if (header.isEnd) {
        setImgData(imageReceiveBase64.current);
        imageReceiveBase64.current = "";
        return;
      }
      const plainText = decryptDES(body.toString("utf-8"));
      imageReceiveBase64.current += plainText;
      console.log(imageReceiveBase64.current);
      socketIo.emit("moreData", {
        index: header.index + 1,
        recieverSocketID: header.senderSocketID,
        senderSocketID: socketIo.id,
      });
    });

    socketIo.on("requestMoreImageData", (data) => {
      if (imageSendBase64.current.length === data.index) {
        socketIo.emit(
          "sendImageData",
          {
            index: null,
            isEnd: true,
            recieverSocketID: data.senderSocketID,
            senderSocketID: socketIo.id,
          },
          Buffer.from("").toString("utf-8")
        );
      } else {
        const cipherText = encrypteDES(imageSendBase64.current[data.index]);
        console.log(typeof cipherText);
        socketIo.emit(
          "sendImageData",
          {
            index: data.index,
            isEnd: false,
            recieverSocketID: data.senderSocketID,
            senderSocketID: socketIo.id,
          },
          Buffer.from(cipherText).toString("utf-8")
        );
      }
    });

    return () => {
      if (socket) {
        socket.emit("disconnect");
      }
    };
  }, []);

  function arrayBufferToCipherText(buffer) {
    var binary = "";
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    console.log(binary);
    return window.btoa(binary);
  }

  // send text message to server
  function submitMsg(e) {
    e.preventDefault();
    socket.emit("send message", {
      name: userName,
      msg: msgData.msg,
    });
  }

  function sendImageData(index, recieverSocketID = null) {
    const cipherText = encrypteDES(imageSendBase64.current[index]);
    socket.emit(
      "sendImageInit",
      {
        index,
        isEnd: false,
        recieverSocketID,
        senderSocketID: socket.id,
      },
      Buffer.from(cipherText).toString("utf-8")
    );
  }

  function onClickImageSendBtn(event) {
    event.preventDefault();
    sendImageData(0);
  }

  function imgChangeHandler(event) {
    if (event.target.files) {
      Array.from(event.target.files).forEach((image) => {
        encodeFileToBase64(image).then((data) => {
          console.log(data);
          const base64Array = splitBase64ToByte(data, 200 * 1024);
          imageSendBase64.current = base64Array;
          console.log(imageSendBase64.current);
        });
      });
    }
  }

  function encrypteDES(data) {
    return crypto.DES.encrypt(data, secretKey).toString();
  }

  function decryptDES(data) {
    console.log(data);
    const decrypted = crypto.DES.decrypt(data, secretKey);
    return decrypted.toString(crypto.enc.Utf8);
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
      <div className="input-form">
        <span>이름</span>
        <input type="text" onChange={(e) => setUserName(e.target.value)} />{" "}
        <span>메시지</span>
        <input
          type="text"
          onChange={(e) => {
            setMsgData((prev) => ({
              msg: e.target.value,
              msgList: prev.msgList,
            }));
          }}
        />
        <button onClick={submitMsg}>전송</button>
      </div>
      <div className="msg_container">
        <div className="my_message">
          {msgData.msgList.map((msg, index) => (
            <div key={index}>
              <span>{msg.name}:</span> <span>{msg.msg}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <input type="file" onChange={imgChangeHandler} />
        <button onClick={onClickImageSendBtn}>이미지 전송</button>
      </div>
      {imgData && <img src={imgData} alt="이미지" />}
    </div>
  );
}

export default App;
