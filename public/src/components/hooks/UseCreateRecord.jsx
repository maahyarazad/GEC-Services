export const UseCreateRecord = async (xData, xKey, xValue, xPath, xCommand, xEndpoint) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SERVERURL}/${xEndpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: xData,
        key: xKey,
        value: xValue,
        path: xPath,
        command: xCommand,
      }),
    });
    if (!response.status) {
      throw new Error(`Error: ${response.message}`);
    }

    const data = await response.json();
    
    return data;
  } catch (error) {
    console.log(error.message);
  }
};
