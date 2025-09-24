export const UseFetchData = async (xpath, xkey) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SERVERURL}/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint: xpath, key: xkey }),
    });

    if (!response.status) {
      throw new Error(`Error: ${response.message}`);
    }

    const data = await response.json();
    
  } catch (error) {
    console.log(error);
  }
};
