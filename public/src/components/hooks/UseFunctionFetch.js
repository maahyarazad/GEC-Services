export const UseFunctionFetch = async (endpoint, key) => {
  const url = `${import.meta.env.VITE_SERVERURL}/data`;

  try {
    // console.log(endpoint);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: endpoint ? endpoint : null,
        key: key ? key : null,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `UseFunctionFetch says ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    // console.log(data);
    return data;
  } catch (error) {
    console.log("Encountered an error:", error);
    return null;
  }
};
