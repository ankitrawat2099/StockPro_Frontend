import { useEffect, useRef } from "react";
import { toast } from "react-toastify";

const toastOptions = {
  position: "bottom-right",
  autoClose: 3200,
};

export default function FloatingNotice({ message, error }) {
  const lastMessageRef = useRef("");
  const lastErrorRef = useRef("");

  useEffect(() => {
    if (message && message !== lastMessageRef.current) {
      toast.success(message, toastOptions);
    }

    lastMessageRef.current = message || "";
  }, [message]);

  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      toast.error(error, { ...toastOptions, autoClose: 4200 });
    }

    lastErrorRef.current = error || "";
  }, [error]);

  return null;
}
