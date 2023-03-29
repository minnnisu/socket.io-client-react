import { useEffect, useState } from "react";
import io from "socket.io-client"; //모듈 가져오기
import crypto from "crypto-js";
import "./App.css";

function App() {
  const [socket, setSocket] = useState();
  const [msgList, setMsgList] = useState([]);
  const [jsonTypeCipherText, setJsonTypeCipherText] = useState("");
  const [base64, setBase64] = useState("");
  const [userName, setUserName] = useState("");
  const [userMsg, setUserMsg] = useState("");

  const secretKey =
    "xGHQkCIOr46599weIoqfxiyoBCt4pfBomFAnzuDLfTRTKCj0vZqX9SI4aSVnlKXg";

  useEffect(() => {
    const socketIo = io("http://localhost:3001", {
      cors: { origin: "*" },
    });

    // receive text message from server
    socketIo.on("receive message", (msg) => {
      console.log(msg);
      setMsgList((prevMsg) => [...prevMsg, msg]);
    });

    // receive encrypted base64 file from server
    socketIo.on("receciveBase64", (data) => {
      // decrypt using DES
      const decrypted = crypto.DES.decrypt(data.base64Data, secretKey);
      console.log(decrypted.toString(crypto.enc.Utf8));
      setBase64(decrypted.toString(crypto.enc.Utf8));
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
      msg: userMsg,
    });
  }

  // send encrypted base64 file to server
  function sendImageFile(e) {
    e.preventDefault();
    socket.emit("sendBase64", {
      name: userName,
      base64Data: jsonTypeCipherText,
    });
  }

  function imgChangeHandler(event) {
    if (event.target.files) {
      Array.from(event.target.files).forEach((image) => {
        encodeFileToBase64(image).then((data) => {
          console.log(data);
          // encrypt using DES
          const encrypted = crypto.DES.encrypt(data, secretKey).toString();
          console.log(encrypted);
          setJsonTypeCipherText(encrypted);
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
        <input type="text" onChange={(e) => setUserMsg(e.target.value)} />
        <button onClick={submitMsg}>전송</button>
      </div>
      <div className="msg_container">
        <div className="my_message">
          {msgList.map((msg, index) => (
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
      {base64 && <img src={base64} alt="이미지" />}
    </div>
  );
}

export default App;
