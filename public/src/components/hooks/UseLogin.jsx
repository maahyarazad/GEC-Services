export const UseLogin = async (formData) => {
  console.log(formData);
  try {
    const response = await fetch(`${import.meta.env.VITE_SERVERURL}/access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: formData }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`); // Use statusText instead of message
    }

    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Login failed:", error);
    return null;
  }
};
