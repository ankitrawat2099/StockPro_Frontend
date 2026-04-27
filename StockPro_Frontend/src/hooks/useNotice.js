import { useState } from "react";

export function useNotice() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function setNotice(nextMessage = "", nextError = "") {
    setMessage(nextMessage);
    setError(nextError);
  }

  return { message, error, setNotice };
}
