import { useEffect, useState } from "react";
import io from "socket.io-client";
import crypto from "crypto-js";
import "./App.css";
import { useRef } from "react";
import { log } from "util";

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

    // receive encrypted base64 file from server
    socketIo.on("receciveBase64", (data) => {
      // // decrypt using DES
      // const decrypted = crypto.DES.decrypt(data.base64Data, secretKey);
      // console.log(decrypted.toString(crypto.enc.Utf8));
      // setImgData((prev) => ({
      //   ...prev,
      //   imgBase64: decrypted.toString(crypto.enc.Utf8),
      // }));
      // decrypt using DES
      // let plainText = "";
      // for (let i = 0; i < data; i++) {
      //   const decrypted = crypto.DES.decrypt(data, secretKey);
      //   plainText += decrypted.toString(crypto.enc.Utf8);
      // }
      // console.log(plainText);
      // setImgData((prev) => ({
      //   ...prev,
      //   imgBase64: plainText.toString(crypto.enc.Utf8),
      // }));
    });

    function decryptDES(data) {
      const decrypted = crypto.DES.decrypt(data, secretKey);
      return decrypted.toString(crypto.enc.Utf8);
    }

    socketIo.on("receiveImageData", (data) => {
      const parsedData = JSON.parse(data);
      if (parsedData.senderSocketID === socketIo.id) {
        return;
      }
      if (parsedData.isEnd) {
        setImgData(imageReceiveBase64.current);
        imageReceiveBase64.current = "";
        return;
      }
      const plainText = decryptDES(parsedData.base64Data);
      imageReceiveBase64.current += plainText;
      console.log(imageReceiveBase64.current);
      socketIo.emit(
        "moreData",
        JSON.stringify({
          index: parsedData.index + 1,
          recieverSocketID: parsedData.senderSocketID,
          senderSocketID: socketIo.id,
        })
      );
    });

    socketIo.on("requestMoreImageData", (data) => {
      const parsedData = JSON.parse(data);
      if (imageSendBase64.current.length === parsedData.index) {
        socketIo.emit(
          "sendImageData",
          JSON.stringify({
            index: null,
            isEnd: true,
            base64Data: null,
            recieverSocketID: parsedData.senderSocketID,
            senderSocketID: socketIo.id,
          })
        );
      } else {
        const cipherText = encrypteDES(
          imageSendBase64.current[parsedData.index]
        );
        socketIo.emit(
          "sendImageData",
          JSON.stringify({
            index: parsedData.index,
            isEnd: false,
            base64Data: cipherText,
            recieverSocketID: parsedData.senderSocketID,
            senderSocketID: socketIo.id,
          })
        );
      }
    });

    return () => {
      if (socket) {
        socket.emit("disconnect");
      }
    };
  }, []);

  function sendImageData(index, recieverSocketID = null) {
    const cipherText = encrypteDES(imageSendBase64.current[index]);
    socket.emit(
      "sendImageInit",
      JSON.stringify({
        index,
        isEnd: false,
        base64Data: cipherText,
        recieverSocketID,
        senderSocketID: socket.id,
      })
    );
  }

  function imgChangeHandler(event) {
    if (event.target.files) {
      Array.from(event.target.files).forEach((image) => {
        encodeFileToBase64(image).then((data) => {
          console.log(data);
          const base64Array = splitBase64ToByte(data, 200 * 1024);
          imageSendBase64.current = base64Array;
          console.log(imageSendBase64.current);
          sendImageData(0);
        });
      });
    }
  }

  // send text message to server
  function submitMsg(e) {
    e.preventDefault();
    socket.emit("send message", {
      name: userName,
      msg: msgData.msg,
    });
  }

  // send encrypted base64 file to server
  function sendImageFile(e) {
    e.preventDefault();
    console.log("이미지 전송");
    console.log(socket.id);
    console.log(imgData.cipherText);
    socket.emit("sendBase64", {
      name: userName,
      base64Data: imgData.cipherText,
    });
  }

  // encrypt using DES
  function encrypteDES(data) {
    return crypto.DES.encrypt(data, secretKey).toString();
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
        <button onClick={sendImageFile}>이미지 전송</button>
      </div>
      {imgData && <img src={imgData} alt="이미지" />}
    </div>
  );
}

export default App;
