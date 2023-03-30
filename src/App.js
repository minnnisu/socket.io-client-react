import { useEffect, useState } from "react";
import io from "socket.io-client"; //모듈 가져오기
import crypto from "crypto-js";
import "./App.css";

function App() {
  const [socket, setSocket] = useState();
  const [userName, setUserName] = useState("");
  const [msgData, setMsgData] = useState({ msg: "", msgList: [] });
  // const [userMsg, setUserMsg] = useState("");
  // const [msgList, setMsgList] = useState([]);
  const [imgData, setImgData] = useState({
    imgBase64: "",
    cipherText: "",
  });

  const secretKey =
    "xGHQkCIOr46599weIoqfxiyoBCt4pfBomFAnzuDLfTRTKCj0vZqX9SI4aSVnlKXg";

  useEffect(() => {
    const socketIo = io("http://localhost:3001", {
      cors: { origin: "*" },
    });

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
      // decrypt using DES
      const decrypted = crypto.DES.decrypt(data.base64Data, secretKey);
      console.log(decrypted.toString(crypto.enc.Utf8));
      setImgData((prev) => ({
        ...prev,
        imgBase64: decrypted.toString(crypto.enc.Utf8),
      }));
    });

    setSocket(socketIo);

    return () => {
      if (socket) {
        socket.emit("disconnect");
      }
    };
  }, []);

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

  function splitBase64ToByte(data, length) {
    let idx = 0;
    let left = data.length;
    const base64Array = [];
    if (data.length < length) {
      base64Array.push(data.slice(0, Math.floor(data.left)));
      base64Array.push(data.slice(Math.floor(data.left) + 1));
      return base64Array;
    }

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
    return base64Array;
  }

  function imgChangeHandler(event) {
    if (event.target.files) {
      Array.from(event.target.files).forEach((image) => {
        encodeFileToBase64(image).then((data) => {
          // console.log(data);
          const base64Array = splitBase64ToByte(data, 500 * 1024);
          console.log(base64Array);

          // encrypt using DES
          const cipherText = [];
          for (let i = 0; i < base64Array.length; i++) {
            const encrypted = crypto.DES.encrypt(
              base64Array[i],
              secretKey
            ).toString();
            cipherText.push(encrypted);
          }
          console.log(cipherText);

          // decrypt using DES
          let plainText = "";
          for (let i = 0; i < cipherText.length; i++) {
            const decrypted = crypto.DES.decrypt(cipherText[i], secretKey);
            plainText += decrypted.toString(crypto.enc.Utf8);
          }

          console.log(plainText);
          setImgData((prev) => ({
            ...prev,
            imgBase64: plainText.toString(crypto.enc.Utf8),
          }));

          // setImgData((prev) => ({ ...prev, cipherText: cipherText }));
        });
      });
    }
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
      {imgData.imgBase64 && <img src={imgData.imgBase64} alt="이미지" />}
    </div>
  );
}

export default App;
