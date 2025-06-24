import { useState, useEffect } from "react";
import { UseFunctionFetch } from "./UseFunctionFetch";

export const UseGlobalFetch = () => {
  const [data, setData] = useState({});

  useEffect(() => {
    const targets = ["registration"];

    const fetchData = async () => {
      const fetchedData = {};

      for (const target of targets) {
        try {
          const response = await UseFunctionFetch(target);
          fetchedData[target] = response;
        } catch (error) {
          console.error(error);
        }
      }

      setData(fetchedData);
    };

    fetchData();
  }, []);

  return data;
};
