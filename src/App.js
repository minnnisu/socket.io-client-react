import { useEffect, useState } from "react";
import io from "socket.io-client"; //모듈 가져오기
import "./App.css";

// const readline = require("readline");

// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout,
// });

function App() {
  const [socket, setSocket] = useState();
  const [msgList, setMsgList] = useState([]);
  // const [msg, setMsg] = useState("")

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
    </div>
  );
}

export default App;
