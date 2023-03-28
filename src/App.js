import { useEffect, useState } from "react";
import io from "socket.io-client"; //모듈 가져오기
import crypto from "crypto-js";
import "./App.css";

function App() {
  const [socket, setSocket] = useState();
  const [msgList, setMsgList] = useState([]);
  const [base64, setBase64] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const socketIo = io("http://localhost:3001", {
      cors: { origin: "*" },
    });

    // receive message from client
    socketIo.on("receive message", (msg) => {
      console.log(msg);
      setMsgList((prevMsg) => [...prevMsg, msg]);
    });

    setSocket(socketIo);
  }, []);

  // send message to client
  function submitMsg(e) {
    e.preventDefault();
    socket.emit("send message", {
      name: e.target.name.value,
      msg: e.target.msg.value,
    });
  }

  function imgChangeHandler(event) {
    if (event.target.files) {
      Array.from(event.target.files).forEach((image) => {
        encodeFileToBase64(image).then((data) => {
          console.log(data);
          // encrypt using DES
          const encrypted = crypto.DES.encrypt(
            data,
            "xGHQkCIOr46599weIoqfxiyoBCt4pfBomFAnzuDLfTRTKCj0vZqX9SI4aSVnlKXg"
          );
          console.log(JSON.stringify(encrypted.ciphertext));

          // decrypt using DES
          const decrypted = crypto.DES.decrypt(
            encrypted,
            "xGHQkCIOr46599weIoqfxiyoBCt4pfBomFAnzuDLfTRTKCj0vZqX9SI4aSVnlKXg"
          );
          console.log(decrypted.toString(crypto.enc.Utf8));
          setBase64(decrypted.toString(crypto.enc.Utf8));
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
        <form onSubmit={submitMsg}>
          <span>이름</span>
          <input type="text" name="name" /> <span>메시지</span>
          <input type="text" name="msg" />
          <button>전송</button>
        </form>
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
      <input type="file" onChange={imgChangeHandler} />
      <img src={base64} alt="Blue Circle"></img>
    </div>
  );
}

export default App;
