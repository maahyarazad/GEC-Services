// React & Hooks
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
const SuccessTemplatePage = ({}) => {
    const { event } = useParams(); // "october-party"
    const [searchParams] = useSearchParams();
    const [isLoading, setLoading] = useState(true);
    const reference = searchParams.get("reference");
    const checkout = searchParams.get("checkout");
    const [paymentStatus, setPaymentStatus] = useState(null);
  
    const [selectedTime, setSelectedTime] = useState(null);
    const [error, setError] = useState(null);
    const currentYear = new Date().getFullYear();

    const fetchPaymentStatus = async (checkoutId) => {

        if (!checkoutId) return;

        try {
            
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/payment/status/${checkoutId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }

            }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to fetch payment status");
            }

            const response_data = await response.json();
            
            setPaymentStatus(response_data.data);


        } catch (err) {
            console.error("Error fetching payment status:", err);
            setError(err.message);
        } finally {

        }
    }


    const fetchEventStatus = async (eventId) => {
        if (!eventId) return;

        try {
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/registration-data/${eventId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }

            }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to fetch event status");
            }

            const response_data = await response.json();
            if(response_data && response_data.metadata_json){
              
              const metadata = JSON.parse(response_data.metadata_json);
              const selectedDate = new Date(metadata.selected_time);
              setSelectedTime(selectedDate.toLocaleTimeString([], {hour: "2-digit",minute: "2-digit"}))

            }
            


        } catch (err) {
            console.error("Error fetching event status:", err);
            setError(err.message);
        } finally {

        }
    }


    const fetchData = useCallback(async () => {
        try {

            setLoading(true);

            // const value = location.pathname;
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-config/optional-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "page": event
                })
            });

            if (!response.ok) {
                console.error('Failed to fetch optional-login')
            }
            const queryParams = new URLSearchParams(window.location.search);
            const values = await response.json();
            
            if (values) {
                values.rows.map(async (x) => {

                    if (x.paymentRequired === "true") {

                        const reference = queryParams.get("reference");
                        const checkout = queryParams.get("checkout");
                        await fetchPaymentStatus(checkout);
                        await fetchEventStatus(reference.replace("ordexc-PI-", ""));
                    }
                });

            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

    }, [fetchData]);

    

  if (isLoading) return <CircularProgress/>;
  if (error) return <div className="login" style={{ color: "red" }}>Error: {error}</div>;
  if (!paymentStatus) return <div className="login"><CircularProgress/></div>;

  // Build map & QR sources (replace with your actual backend-generated URLs if needed)
  const mapSrc = `${import.meta.env.VITE_SERVERURL}/maps/${paymentStatus.event}.png`;


   return (
    <div className="full">
      <table
        width="100%"
        cellPadding="0"
        cellSpacing="0"
        border="0"
        bgcolor="#f4f4f4"
      >
        <thead>
          <tr>
            <td align="center">
              <table
                width="600"
                cellPadding="0"
                cellSpacing="0"
                border="0"
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  overflow: "hidden",
                  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
                  margin: "40px auto",
                }}
              >
                <tbody>
                  <tr>
                    <td
                      bgcolor="#D9B144"
                      style={{
                        color: "#ffffff",
                        textAlign: "center",
                        padding: "20px",
                        fontSize: "22px",
                        fontWeight: "bold",
                        borderTopLeftRadius: "8px",
                        borderTopRightRadius: "8px",
                      }}
                    >
                      Registration Confirmed
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td align="center">
              <table
                width="600"
                cellPadding="0"
                cellSpacing="0"
                border="0"
                style={{ backgroundColor: "#ffffff", padding: "0 30px 30px" }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: "20px",
                        fontSize: "16px",
                        color: "#333333",
                        lineHeight: 1.6,
                      }}
                    >
                      <p>
                        Thank you for registering for the{" "}
                        <strong>{paymentStatus.title}</strong>. We appreciate
                        your interest and look forward to your participation.
                      </p>
                      <p>
                        <strong>Date:</strong> {paymentStatus.event_date}
                      </p>
                      {selectedTime && (
                        <p>
                          <strong>Reserved Time:</strong> {selectedTime}
                        </p>
                      )}
                      {paymentStatus.event_time && (
                        <p>
                          <strong>Time:</strong> {paymentStatus.event_time}
                        </p>
                      )}
                      {paymentStatus.event_location_name && (
                        <p>
                          <strong>Event Location:</strong>{" "}
                          {paymentStatus.event_location_name}
                        </p>
                      )}
                    </td>
                  </tr>

                  {paymentStatus.event_location_name && (
                    <tr>
                      <td
                        align="center"
                        style={{
                          padding: "20px",
                          fontSize: "16px",
                          color: "#333333",
                        }}
                      >
                        <p style={{ paddingBottom: "10px" }}>
                          <strong>
                            Event location - tap the map below for navigation:
                          </strong>
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            paymentStatus.event_location_name
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            justifyContent:"center"
                          }}
                        >
                          
                          <img
                            src={mapSrc}
                            alt="Event Location Map"
                            width="200"
                            height="200"
                            style={{ border: 0, display: "block" }}
                          />
                        </a>
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td
                      align="center"
                      style={{
                        padding: "20px",
                        fontSize: "16px",
                        color: "#333333",
                      }}
                    >
                      <p>
                        <strong>
                          Please keep this, so we can scan your QR code:
                        </strong>
                      </p>
                      <div style={{
                            display: "flex",
                            justifyContent:"center"
                          }}
                      > 

                      <img
                        src={paymentStatus.image}
                        alt="QR Code"
                        width="200"
                        height="200"
                        style={{ display: "block" }}
                      />
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td
                      style={{
                        padding: "0 20px 20px",
                        fontSize: "16px",
                        color: "#333333",
                        lineHeight: 1.6,
                      }}
                    >
                      <p>
                        If you have any questions, feel free to contact us at{" "}
                        <br />
                        <a
                          href="mailto:office5@german-emirates-club.com"
                          style={{
                            color: "#D9B144",
                            textDecoration: "none",
                          }}
                        >
                          office5@german-emirates-club.com
                        </a>
                        .
                      </p>
                      <p>
                        Warm regards,
                        <br />
                        The German Emirates Club Team
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td
                      style={{
                        fontSize: "13px",
                        color: "#777777",
                        textAlign: "center",
                        padding: "20px",
                        borderTop: "1px solid #dddddd",
                      }}
                    >
                      &copy; {currentYear} German Emirates Club. All rights
                      reserved.
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default SuccessTemplatePage;